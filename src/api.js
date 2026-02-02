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
            body: JSON.stringify({
                username,
                password,
                password_plain: password
            }),
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

    async function changePassword(token, oldPassword, newPassword) {
        return request("/api/change_password", {
            method: "POST",
            body: JSON.stringify({ token, old_password: oldPassword, new_password: newPassword }),
        });
    }

    async function leaderboard() {
        return request("/api/leaderboard", { method: "GET" });
    }

    async function knowledgeLeaderboard() {
        return request("/api/knowledge_leaderboard", { method: "GET" });
    }

    // ✅ category + limit are optional (backward compatible)
    async function words(category, limit) {
        const qs = new URLSearchParams();
        if (category) qs.set("category", String(category));
        if (typeof limit !== "undefined" && limit !== null) qs.set("limit", String(limit));
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return request(`/api/words${suffix}`, { method: "GET" });
    }

    window.Ball10API = {
        register,
        login,
        me,
        save,
        saveKnowledge,
        changePassword,
        leaderboard,
        knowledgeLeaderboard,
        words
    };
})();
