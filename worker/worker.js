import * as StellarSdk from "stellar-sdk";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-PI-ENV"
    };

    if (request.method === "OPTIONS") {
      return new Response("", { status: 204, headers: corsHeaders });
    }

    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj, null, 2), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    const text = (msg, status = 400) =>
      new Response(msg, { status, headers: { ...corsHeaders, "Content-Type": "text/plain" } });

    // Pick correct key per caller (testnet vs mainnet)
    const piEnv = (request.headers.get("X-PI-ENV") || "").toLowerCase();
    const isTestnet = piEnv === "testnet";
    const PI_SERVER_KEY = isTestnet ? env.PI_SERVER_KEY_TESTNET : env.PI_SERVER_KEY;

    const PI_API_URL = "https://api.minepi.com/v2";

    // Root
    if (url.pathname === "/") {
      return text("OK. Try /health, /debug/me, /api/claim", 200);
    }

    // Health
    if (url.pathname === "/health") {
      return json({ ok: true, source: "GIT_ACTIVE_DEPLOY", ts: Date.now(), isTestnet });
    }

    // Helper: read JSON safely
    async function readBody(req) {
      try {
        return await req.json();
      } catch {
        return {};
      }
    }

    // =========================
    // DEBUG: call Pi /me and return it (proves token + shows uid)
    // =========================
    if (url.pathname === "/debug/me" && request.method === "POST") {
      if (!PI_SERVER_KEY) {
        return json(
          { error: isTestnet ? "Missing PI_SERVER_KEY_TESTNET" : "Missing PI_SERVER_KEY" },
          500
        );
      }

      const body = await readBody(request);
      const accessToken = body?.accessToken;
      if (!accessToken) return json({ error: "accessToken required" }, 400);

      const meRes = await fetch(`${PI_API_URL}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const meText = await meRes.text();
      let me = {};
      try { me = JSON.parse(meText); } catch { me = { raw: meText }; }

      return json(
        {
          ok: meRes.ok,
          status: meRes.status,
          isTestnet,
          me
        },
        meRes.ok ? 200 : 401
      );
    }

    // =========================
    // U2A donation: approve
    // =========================
    if (url.pathname === "/api/approve-payment" && request.method === "POST") {
      try {
        if (!PI_SERVER_KEY) {
          return text(isTestnet ? "Missing PI_SERVER_KEY_TESTNET" : "Missing PI_SERVER_KEY", 500);
        }

        const body = await readBody(request);
        const paymentId = body?.paymentId;
        if (!paymentId) return text("paymentId is required", 400);

        const resp = await fetch(`${PI_API_URL}/payments/${paymentId}/approve`, {
          method: "POST",
          headers: { Authorization: `Key ${PI_SERVER_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({})
        });

        const respText = await resp.text();
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
        if (!PI_SERVER_KEY) {
          return text(isTestnet ? "Missing PI_SERVER_KEY_TESTNET" : "Missing PI_SERVER_KEY", 500);
        }

        const body = await readBody(request);
        const paymentId = body?.paymentId;
        const txid = body?.txid || null;
        if (!paymentId) return text("paymentId is required", 400);

        const resp = await fetch(`${PI_API_URL}/payments/${paymentId}/complete`, {
          method: "POST",
          headers: { Authorization: `Key ${PI_SERVER_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ txid })
        });

        const respText = await resp.text();
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
    // Claim (A2U Testnet)
    // =========================
    if (url.pathname === "/api/claim" && request.method === "POST") {
      try {
        if (!isTestnet) {
          return json({ error: "Claim is testnet-only. Send X-PI-ENV: testnet" }, 400);
        }
        if (!PI_SERVER_KEY) {
          return json({ error: "Missing PI_SERVER_KEY_TESTNET" }, 500);
        }
        if (!env.CLAIMS) {
          return json({ error: "KV CLAIMS not bound" }, 500);
        }

        const body = await readBody(request);
        const accessToken = body?.accessToken;
        if (!accessToken) return json({ error: "accessToken required" }, 400);

        // 1) /me
        const meRes = await fetch(`${PI_API_URL}/me`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        const meText = await meRes.text();
        let me = {};
        try { me = JSON.parse(meText); } catch { me = { raw: meText }; }

        if (!meRes.ok) return json({ error: "Invalid accessToken", details: me }, 401);

        const uid = me?.uid || me?.user?.uid;
        const username = me?.username || me?.user?.username || null;
        if (!uid) return json({ error: "Missing uid from /me", details: me }, 400);

        // 2) lock
        const already = await env.CLAIMS.get(uid);
        if (already) return json({ error: "Already claimed" }, 409);

        // 3) create payment with uid
        const createRes = await fetch(`${PI_API_URL}/payments`, {
          method: "POST",
          headers: { Authorization: `Key ${PI_SERVER_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 1,
            memo: "Ball10 Testnet Reward",
            metadata: { type: "a2u_testnet_claim", username, uid },
            uid: uid
          })
        });

        const createText = await createRes.text();
        let payment = {};
        try { payment = JSON.parse(createText); } catch { payment = { raw: createText }; }

        if (!createRes.ok) {
          return json({ error: "Create payment failed", details: payment }, 500);
        }

        const paymentId = payment?.identifier || payment?.paymentId || payment?.id;
        const recipient = payment?.recipient || payment?.to_address || payment?.recipient_address || null;

        if (!paymentId || !recipient) {
          return json({ error: "Create payment missing identifier/recipient", details: payment }, 500);
        }

        // 4) chain tx
        const APP_WALLET_PUBLIC = env.APP_WALLET_PUBLIC_TESTNET;
        const APP_WALLET_SEED = env.APP_WALLET_SEED_TESTNET;
        if (!APP_WALLET_PUBLIC || !APP_WALLET_SEED) {
          return json(
            { error: "Missing app wallet secrets", needed: ["APP_WALLET_PUBLIC_TESTNET", "APP_WALLET_SEED_TESTNET"] },
            500
          );
        }

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

        if (!txid) return json({ error: "Transaction submitted but txid missing", details: submitRes }, 500);

        // 5) complete
        const completeRes = await fetch(`${PI_API_URL}/payments/${paymentId}/complete`, {
          method: "POST",
          headers: { Authorization: `Key ${PI_SERVER_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ txid })
        });

        const completeText = await completeRes.text();
        if (!completeRes.ok) {
          return json({ error: "Complete failed", details: completeText, paymentId, txid }, 500);
        }

        await env.CLAIMS.put(uid, JSON.stringify({ claimedAt: Date.now(), username: username || "" }));
        return json({ ok: true, paymentId, txid, uid, username, recipient }, 200);
      } catch (e) {
        return json({ error: e?.message || String(e) }, 500);
      }
    }

    return text("Not Found", 404);
  }
};
