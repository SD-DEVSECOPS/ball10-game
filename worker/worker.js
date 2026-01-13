import * as StellarSdk from "stellar-sdk";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-PI-ENV"
    };

    if (request.method === "OPTIONS") {
      return new Response("", { status: 204, headers: corsHeaders });
    }

    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    const text = (msg, status = 400) =>
      new Response(msg, {
        status,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });

    // Root
    if (url.pathname === "/") {
      return text(
        "pi-payment-backend is running. Try /health, /api/approve-payment, /api/complete-payment, /api/claim",
        200
      );
    }

    // Health
    if (url.pathname === "/health") {
      return json({
        ok: true,
        source: "GIT_ACTIVE_DEPLOY",
        ts: Date.now()
      });
    }

    // Pick correct key per caller (testnet vs mainnet)
    const piEnv = (request.headers.get("X-PI-ENV") || "").toLowerCase();
    const isTestnet = piEnv === "testnet";
    const PI_SERVER_KEY = isTestnet ? env.PI_SERVER_KEY_TESTNET : env.PI_SERVER_KEY;

    if (!PI_SERVER_KEY) {
      return text(
        isTestnet ? "Missing PI_SERVER_KEY_TESTNET secret." : "Missing PI_SERVER_KEY secret.",
        500
      );
    }

    const PI_API_URL = "https://api.minepi.com/v2";

    // =========================
    // U2A donation: approve
    // =========================
    if (url.pathname === "/api/approve-payment" && request.method === "POST") {
      try {
        const { paymentId } = await request.json();
        if (!paymentId) return text("paymentId is required", 400);

        const resp = await fetch(`${PI_API_URL}/payments/${paymentId}/approve`, {
          method: "POST",
          headers: {
            Authorization: `Key ${PI_SERVER_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        });

        const body = await resp.text();
        if (!resp.ok) return text(body || "Approve failed", resp.status);

        return new Response(body, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (e) {
        return text(`Approve error: ${e?.message || e}`, 500);
      }
    }

    // =========================
    // U2A donation: complete
    // =========================
    if (url.pathname === "/api/complete-payment" && request.method === "POST") {
      try {
        const { paymentId, txid } = await request.json();
        if (!paymentId) return text("paymentId is required", 400);

        const resp = await fetch(`${PI_API_URL}/payments/${paymentId}/complete`, {
          method: "POST",
          headers: {
            Authorization: `Key ${PI_SERVER_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ txid: txid || null })
        });

        const body = await resp.text();
        if (!resp.ok) return text(body || "Complete failed", resp.status);

        return new Response(body, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (e) {
        return text(`Complete error: ${e?.message || e}`, 500);
      }
    }

    // =========================
    // A2U testnet claim: 1π
    // Allows walletAddress from client if /me doesn't return it
    // =========================
    if (url.pathname === "/api/claim" && request.method === "POST") {
      try {
        if (!isTestnet) {
          return json({ error: "Claim is testnet-only. Send X-PI-ENV: testnet" }, 400);
        }

        // Accept optional walletAddress from client
        const body = await request.json();
        const accessToken = body?.accessToken;
        const walletFromClient = body?.walletAddress || body?.wallet_address || null;

        if (!accessToken) return json({ error: "accessToken required" }, 400);
        if (!env.CLAIMS) return json({ error: "KV CLAIMS not bound" }, 500);

        const APP_WALLET_PUBLIC = env.APP_WALLET_PUBLIC_TESTNET;
        const APP_WALLET_SEED = env.APP_WALLET_SEED_TESTNET;

        if (!APP_WALLET_PUBLIC || !APP_WALLET_SEED) {
          return json(
            {
              error: "Missing app wallet secrets for testnet A2U",
              needed: ["APP_WALLET_PUBLIC_TESTNET", "APP_WALLET_SEED_TESTNET"]
            },
            500
          );
        }

        // 1) Verify user
        const meRes = await fetch(`${PI_API_URL}/me`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        const meText = await meRes.text();
        let me = {};
        try {
          me = JSON.parse(meText);
        } catch {
          me = { raw: meText };
        }

        if (!meRes.ok) {
          return json({ error: "Invalid accessToken", details: me }, 401);
        }

        const uid = me?.uid || me?.user?.uid;
        const username = me?.username || me?.user?.username || null;

        // 2) Wallet from /me
        const walletFromMe =
          me?.wallet_address ||
          me?.payment_address ||
          me?.wallet?.address ||
          me?.user?.wallet_address ||
          me?.user?.wallet?.address ||
          null;

        const walletAddressFinal = walletFromMe || walletFromClient || null;

        if (!uid) {
          return json({ error: "Missing uid from /me", details: me }, 400);
        }

        if (!walletAddressFinal || typeof walletAddressFinal !== "string" || !walletAddressFinal.startsWith("G")) {
          return json(
            {
              error:
                "Wallet address not available from Pi /me. Activate/open your TESTNET wallet or provide walletAddress in request body.",
              needed: "walletAddress (starts with G...)",
              hint:
                "Open Pi Wallet (testnet) once, then retry Claim. Or pass walletAddress: 'G....' in request.",
              details: me
            },
            400
          );
        }

        // 3) Prevent double-claim
        const already = await env.CLAIMS.get(uid);
        if (already) return json({ error: "Already claimed" }, 409);

        // 4) Create A2U payment (recipient_address)
        const createRes = await fetch(`${PI_API_URL}/payments`, {
          method: "POST",
          headers: {
            Authorization: `Key ${PI_SERVER_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            amount: 1,
            memo: "Ball10 Testnet Reward",
            metadata: { type: "a2u_testnet_claim", username, uid },
            recipient_address: walletAddressFinal
          })
        });

        const createText = await createRes.text();
        let payment = {};
        try {
          payment = JSON.parse(createText);
        } catch {
          payment = { raw: createText };
        }

        if (!createRes.ok) {
          return json({ error: "Create payment failed", details: payment }, 500);
        }

        const paymentId = payment?.identifier || payment?.paymentId || payment?.id;

        const recipient =
          payment?.recipient ||
          payment?.to_address ||
          payment?.recipient_address ||
          payment?.recipientAddress ||
          walletAddressFinal;

        if (!paymentId) {
          return json({ error: "Missing payment identifier from create", details: payment }, 500);
        }

        // 5) Send testnet chain tx
        const horizon = new StellarSdk.Horizon.Server("https://api.testnet.minepi.com");

        const sourceAccount = await horizon.loadAccount(APP_WALLET_PUBLIC);
        const fee = await horizon.fetchBaseFee();
        const timebounds = await horizon.fetchTimebounds(180);

        const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee,
          networkPassphrase: "Pi Testnet",
          timebounds
        })
          .addOperation(
            StellarSdk.Operation.payment({
              destination: recipient,
              asset: StellarSdk.Asset.native(),
              amount: "1"
            })
          )
          .addMemo(StellarSdk.Memo.text(paymentId))
          .build();

        tx.sign(StellarSdk.Keypair.fromSecret(APP_WALLET_SEED));

        const submitRes = await horizon.submitTransaction(tx);
        const txid = submitRes?.id;

        if (!txid) {
          return json({ error: "Transaction submitted but txid missing", details: submitRes }, 500);
        }

        // 6) Complete with txid
        const completeRes = await fetch(`${PI_API_URL}/payments/${paymentId}/complete`, {
          method: "POST",
          headers: {
            Authorization: `Key ${PI_SERVER_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ txid })
        });

        const completeText = await completeRes.text();
        if (!completeRes.ok) {
          return json({ error: "Complete failed", details: completeText, paymentId, txid }, 500);
        }

        // 7) KV lock
        await env.CLAIMS.put(uid, JSON.stringify({ claimedAt: Date.now(), username: username || "" }));

        return json({ ok: true, paymentId, txid, uid, username, walletAddress: walletAddressFinal }, 200);
      } catch (e) {
        return json({ error: e?.message || String(e) }, 500);
      }
    }

    return text("Not Found", 404);
  }
};
