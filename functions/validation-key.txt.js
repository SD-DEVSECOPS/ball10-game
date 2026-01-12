export async function onRequest() {
  return new Response(
    "902d459f987b896774873f31f819b94eb6944a730483b1abb99ce15644148857e197fcd1ffe12f643da15b2ebb6716a3d9c575764071efc17b1cf860892ae4c4\n",
    {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    }
  );
}
