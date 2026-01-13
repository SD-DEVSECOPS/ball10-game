(function () {
  const BASE = window.BALL10_API_BASE;

  if (!BASE) {
    console.error("BALL10_API_BASE missing in index.html");
  }

  async function request(path, opts = {}) {
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
    });

    let data = {};
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) {
      const msg = data?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  async function register(username, password) {
    return request("/api/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async function login(username, password) {
    return request("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async function save(token, score, balance) {
    return request("/api/save", {
      method: "POST",
      body: JSON.stringify({ token, score, balance }),
    });
  }

  async function leaderboard() {
    return request("/api/leaderboard", { method: "GET" });
  }

  window.Ball10API = { register, login, save, leaderboard };
})();
