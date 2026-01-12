export async function onRequest({ request }) {
  const TESTNET_KEY =
    "4e39838a22dfa8e3d21da5d77453b004851cad3a5295d6bb99c747aea978c870bcfa755737d9da425508def5891ab36dcae5196d84b9b7036bbd0492b23f0390";

  const MAINNET_KEY =
    "902d459f987b896774873f31f819b94eb6944a730483b1abb99ce15644148857e197fcd1ffe12f643da15b2ebb6716a3d9c575764071efc17b1cf860892ae4c4";

  const origin = request.headers.get("origin") || "";
  const referer = request.headers.get("referer") || "";

  // Pi sandbox commonly uses sandbox.minepi.com
  const isSandbox =
    origin.includes("sandbox.minepi.com") ||
    referer.includes("sandbox.minepi.com");

  const body = (isSandbox ? TESTNET_KEY : MAINNET_KEY) + "\n";

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
