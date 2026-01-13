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
      return json({ ok: true, source: "GIT_ACTIVE_DEPLOY", ts: Date.now() });
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
        const body = await request.json().catch(() => ({}));
        const paymentId = body?.paymentId;

        if (!paymentId) return text("paymentId is required", 400);

        const resp = await fetch(`${PI_API_URL}/payments/${paymentId}/approve`, {
          method: "POST",
          headers: {
            Authorization: `Key ${PI_SERVER_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        });

        const respText = await resp.text().catch(() => "");
        if (!resp.ok) return text(respText || "Approve failed", resp.status);

        return new Response(respText, {
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
        const body = await request.json().catch(() => ({}));
        const paymentId = body?.paymentId;
        const txid = body?.txid || null;

        if (!paymentId) return text("paymentId is required", 400);

        const resp = await fetch(`${PI_API_URL}/payments/${paymentId}/complete`, {
          method: "POST",
          headers: {
            Authorization: `Key ${PI_SERVER_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ txid })
        });

        const respText = await resp.text().catch(() => "");
        if (!resp.ok) return text(respText || "Complete failed", resp.status);

        return new Response(respText, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (e) {
        return text(`Complete error: ${e?.message || e}`, 500);
      }
    }

    // =========================
    // A2U testnet claim: 1π
    // ✅ Correct flow:
    //  - verify user via /me (Bearer accessToken)
    //  - create A2U payment via Pi API using uid (NOT recipient_address)
    //  - Pi returns recipient address
    //  - send chain tx to recipient
    //  - complete payment with txid
    //  - lock claim in KV CLAIMS by uid
    // =========================
    if (url.pathname === "/api/claim" && request.method === "POST") {
      try {
        if (!isTestnet) {
          return json({ error: "Claim is testnet-only. Send X-PI-ENV: testnet" }, 400);
        }

        const body = await request.json().catch(() => ({}));
        const accessToken = body?.accessToken;

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

        const meText = await meRes.text().catch(() => "");
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

        if (!uid) {
          return json({ error: "Missing uid from /me", details: me }, 400);
        }

        // 2) Prevent double claim
        const already = await env.CLAIMS.get(uid);
        if (already) return json({ error: "Already claimed" }, 409);

        // 3) Create A2U payment using uid (THIS FIXES your 'user not found')
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
            uid: uid
          })
        });

        const createText = await createRes.text().catch(() => "");
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
          null;

        if (!paymentId || !recipient) {
          return json(
            { error: "Create payment missing identifier/recipient", details: payment },
            500
          );
        }

        // 4) Send testnet chain tx to recipient returned by Pi
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

        // 5) Complete payment with txid
        const completeRes = await fetch(`${PI_API_URL}/payments/${paymentId}/complete`, {
          method: "POST",
          headers: {
            Authorization: `Key ${PI_SERVER_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ txid })
        });

        const completeText = await completeRes.text().catch(() => "");
        if (!completeRes.ok) {
          return json(
            { error: "Complete failed", details: completeText, paymentId, txid },
            500
          );
        }

        // 6) KV lock claim
        await env.CLAIMS.put(
          uid,
          JSON.stringify({ claimedAt: Date.now(), username: username || "" })
        );

        return json({ ok: true, paymentId, txid, uid, username, recipient }, 200);
      } catch (e) {
        return json({ error: e?.message || String(e) }, 500);
      }
    }

    return text("Not Found", 404);
  }
};
