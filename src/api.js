(function () {
  const BASE = window.BALL10_API_BASE;

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

  async function me(token) {
    return request("/api/me", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  async function save(token, score, balance) {
    return request("/api/save", {
      method: "POST",
      body: JSON.stringify({ token, score, balance }),
    });
  }

  async function saveKnowledge(token, score) {
    return request("/api/save_knowledge", {
      method: "POST",
      body: JSON.stringify({ token, score }),
    });
  }

  async function leaderboard() {
    return request("/api/leaderboard", { method: "GET" });
  }

  async function knowledgeLeaderboard() {
    return request("/api/knowledge_leaderboard", { method: "GET" });
  }

  async function words() {
    return request("/api/words", { method: "GET" });
  }

  window.Ball10API = {
    register,
    login,
    me,
    save,
    saveKnowledge,
    leaderboard,
    knowledgeLeaderboard,
    words
  };
})();
