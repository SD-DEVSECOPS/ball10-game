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
    // Root + Health
    // -------------------------
    if (url.pathname === "/") {
      return text("pi-payment-backend is running. Try /health, /api/approve-payment, /api/complete-payment", 200);
    }

    if (url.pathname === "/health") {
      return json({ ok: true, source: "MAIN_GIT_DEPLOY", ts: Date.now() }, 200);
    }

    // -------------------------
    // Pick Pi server key (mainnet default)
    // If you later want testnet from same worker, you can add PI_SERVER_KEY_TESTNET
    // -------------------------
    const piEnv = (request.headers.get("X-PI-ENV") || "").toLowerCase();
    const isTestnet = piEnv === "testnet";

    const PI_SERVER_KEY = isTestnet
      ? (env.PI_SERVER_KEY_TESTNET || env.PI_SERVER_KEY)
      : env.PI_SERVER_KEY;

    if (!PI_SERVER_KEY) {
      return text(
        isTestnet ? "Missing PI_SERVER_KEY_TESTNET/PI_SERVER_KEY secret." : "Missing PI_SERVER_KEY secret.",
        500
      );
    }

    const PI_API_URL = "https://api.minepi.com/v2";

    // -------------------------
    // Approve payment (donations)
    // -------------------------
    if (url.pathname === "/api/approve-payment" && request.method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        const paymentId = body.paymentId;

        if (!paymentId) return text("paymentId is required", 400);

        const resp = await fetch(`${PI_API_URL}/payments/${paymentId}/approve`, {
          method: "POST",
          headers: {
            Authorization: `Key ${PI_SERVER_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const respText = await resp.text();
        if (!resp.ok) return text(respText || "Approve failed", resp.status);

        return new Response(respText, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return text(`Approve error: ${e?.message || e}`, 500);
      }
    }

    // -------------------------
    // Complete payment (donations)
    // -------------------------
    if (url.pathname === "/api/complete-payment" && request.method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        const paymentId = body.paymentId;
        const txid = body.txid || null;

        if (!paymentId) return text("paymentId is required", 400);

        const resp = await fetch(`${PI_API_URL}/payments/${paymentId}/complete`, {
          method: "POST",
          headers: {
            Authorization: `Key ${PI_SERVER_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ txid }),
        });

        const respText = await resp.text();
        if (!resp.ok) return text(respText || "Complete failed", resp.status);

        return new Response(respText, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return text(`Complete error: ${e?.message || e}`, 500);
      }
    }

    return text("Not Found", 404);
  },
};
