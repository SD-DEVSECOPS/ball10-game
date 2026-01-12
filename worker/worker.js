// worker/worker.js
// Cloudflare Worker backend for Pi auth/payment flows.
//
// REQUIRED Cloudflare Secrets:
// - PI_SERVER_KEY               (mainnet Pi API key) [optional if you only use testnet]
// - PI_SERVER_KEY_TESTNET       (testnet Pi API key) [required for testnet]
// - APP_WALLET_PUBLIC_TESTNET   (G... address)       [required for /api/claim]
// - APP_WALLET_SEED_TESTNET     (S... secret seed)   [required for /api/claim]
//
// REQUIRED KV Binding:
// - CLAIMS

import * as StellarSdk from "stellar-sdk";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // -------------------------
    // CORS
    // -------------------------
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-PI-ENV",
    };

    if (request.method === "OPTIONS") {
      return new Response("", { status: 204, headers: corsHeaders });
    }

    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const text = (msg, status = 400) =>
      new Response(msg, {
        status,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });

    // -------------------------
    // Basic routes
    // -------------------------
    if (url.pathname === "/") {
      return text(
        "pi-payment-backend is running. Try /health, /api/approve-payment, /api/complete-payment, /api/claim",
        200
      );
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "pi-payment-backend" }, 200);
    }

    // -------------------------
    // Choose environment (testnet/mainnet)
    // -------------------------
    const piEnv = (request.headers.get("X-PI-ENV") || "").toLowerCase();
    const isTestnet = piEnv === "testnet";

    const PI_SERVER_KEY = isTestnet ? env.PI_SERVER_KEY_TESTNET : env.PI_SERVER_KEY;

    if (!PI_SERVER_KEY) {
      return text(
        isTestnet
          ? "Missing PI_SERVER_KEY_TESTNET secret."
          : "Missing PI_SERVER_KEY secret.",
        500
      );
    }

    const PI_API_URL = "https://api.minepi.com/v2";

    // =========================
    // U2A: approve payment
    // =========================
    if (url.pathname === "/api/approve-payment" && request.method === "POST") {
      try {
        const { paymentId } = await request.json();
        if (!paymentId) return text("paymentId is required", 400);

        const resp = await fetch(`${PI_API_URL}/payments/${paymentId}/approve`, {
          method: "POST",
          headers: {
            Authorization: `Key ${PI_SERVER_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const body = await resp.text();
        if (!resp.ok) return text(body || "Approve failed", resp.status);

        return new Response(body, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return text(`Approve error: ${e?.message || e}`, 500);
      }
    }

    // =========================
    // U2A: complete payment
    // =========================
    if (url.pathname === "/api/complete-payment" && request.method === "POST") {
      try {
        const { paymentId, txid } = await request.json();
        if (!paymentId) return text("paymentId is required", 400);

        const resp = await fetch(`${PI_API_URL}/payments/${paymentId}/complete`, {
          method: "POST",
          headers: {
            Authorization: `Key ${PI_SERVER_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ txid: txid || null }),
        });

        const body = await resp.text();
        if (!resp.ok) return text(body || "Complete failed", resp.status);

        return new Response(body, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return text(`Complete error: ${e?.message || e}`, 500);
      }
    }

    // =========================
    // A2U TESTNET CLAIM: 1π
    //
    // Correct flow:
    //  1) /me (Bearer accessToken) => uid
    //  2) POST /payments (Key serverKey) => payment identifier + recipient address
    //  3) Send on-chain payment from APP wallet to recipient address on Pi Testnet
    //     Memo MUST be payment identifier
    //  4) POST /payments/:id/complete with txid
    //  5) Save in KV so user can’t claim twice
    // =========================
    if (url.pathname === "/api/claim" && request.method === "POST") {
      try {
        if (!isTestnet) {
          return json(
            { error: "Claim is testnet-only. Send X-PI-ENV: testnet" },
            400
          );
        }

        const { accessToken } = await request.json();
        if (!accessToken) return json({ error: "accessToken required" }, 400);

        if (!env.CLAIMS) return json({ error: "KV CLAIMS not bound" }, 500);

        const APP_WALLET_PUBLIC = env.APP_WALLET_PUBLIC_TESTNET;
        const APP_WALLET_SEED = env.APP_WALLET_SEED_TESTNET;

        if (!APP_WALLET_PUBLIC || !APP_WALLET_SEED) {
          return json(
            {
              error: "Missing app wallet secrets for testnet A2U",
              needed: ["APP_WALLET_PUBLIC_TESTNET", "APP_WALLET_SEED_TESTNET"],
            },
            500
          );
        }

        // 1) Verify user
        const meRes = await fetch(`${PI_API_URL}/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
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

        if (!uid) {
          return json({ error: "Missing uid from /me response", details: me }, 400);
        }

        // 2) Prevent double claim
        const already = await env.CLAIMS.get(uid);
        if (already) return json({ error: "Already claimed" }, 409);

        // 3) Create payment (A2U)
        const createRes = await fetch(`${PI_API_URL}/payments`, {
          method: "POST",
          headers: {
            Authorization: `Key ${PI_SERVER_KEY}`, // testnet key because X-PI-ENV=testnet
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: 1,
            memo: "Ball10 Testnet Reward",
            metadata: { type: "a2u_testnet_claim", username },
            uid,
          }),
        });

        const createText = await createRes.text();
        let payment = {};
        try {
          payment = JSON.parse(createText);
        } catch {
          payment = { raw: createText };
        }

        if (!createRes.ok) {
          // If this says "user not found", your PI_SERVER_KEY_TESTNET is for the wrong Pi App.
          return json({ error: "Create payment failed", details: payment, uid }, 500);
        }

        const paymentId = payment?.identifier || payment?.paymentId || payment?.id;
        const recipientAddress =
          payment?.recipient ||
          payment?.to_address ||
          payment?.recipient_address ||
          payment?.recipientAddress;

        if (!paymentId || !recipientAddress) {
          return json(
            { error: "Missing identifier/recipient in create response", details: payment },
            500
          );
        }

        // 4) Send on-chain transaction on Pi Testnet
        const horizon = new StellarSdk.Horizon.Server("https://api.testnet.minepi.com");

        const sourceAccount = await horizon.loadAccount(APP_WALLET_PUBLIC);
        const fee = await horizon.fetchBaseFee();
        const timebounds = await horizon.fetchTimebounds(180);

        const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee,
          networkPassphrase: "Pi Testnet",
          timebounds,
        })
          .addOperation(
            StellarSdk.Operation.payment({
              destination: recipientAddress,
              asset: StellarSdk.Asset.native(),
              amount: "1",
            })
          )
          // IMPORTANT: memo must include the Pi payment identifier
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ txid }),
        });

        const completeText = await completeRes.text();
        if (!completeRes.ok) {
          return json(
            { error: "Complete failed", details: completeText, paymentId, txid },
            500
          );
        }

        // 6) Save claim in KV
        await env.CLAIMS.put(
          uid,
          JSON.stringify({ claimedAt: Date.now(), username: username || "" })
        );

        return json({ ok: true, paymentId, txid, uid, username }, 200);
      } catch (e) {
        return json({ error: e?.message || String(e) }, 500);
      }
    }

    return text("Not Found", 404);
  },
};
