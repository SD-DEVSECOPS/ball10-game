(function () {
  const LS_TOKEN = "ball10_token";
  const LS_USER = "ball10_user";

  function showAlert(msg, isError = false) {
    const el = document.getElementById("appAlert");
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle("error", !!isError);
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, isError ? 4500 : 2500);
  }

  function getToken() {
    return localStorage.getItem(LS_TOKEN) || "";
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(LS_USER) || "null"); }
    catch { return null; }
  }

  function setSession(token, user) {
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_USER, JSON.stringify(user || null));
  }

  function logout() {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
    showAlert("Logged out.");
  }

  async function restoreFromDb() {
    const token = getToken();
    if (!token) return null;

    const data = await window.Ball10API.me(token);
    if (data?.user) {
      setSession(token, data.user);
      return data.user;
    }
    return null;
  }

  // ---------- UI MODAL (password masked) ----------
  function promptCredentials({ title, usernameLabel, passwordLabel, submitText }) {
    return new Promise((resolve, reject) => {
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0,0,0,0.6)";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.zIndex = "10002";

      const box = document.createElement("div");
      box.style.width = "320px";
      box.style.maxWidth = "90vw";
      box.style.background = "#111";
      box.style.border = "1px solid rgba(255,255,255,0.15)";
      box.style.borderRadius = "10px";
      box.style.padding = "16px";
      box.style.color = "#fff";
      box.style.fontFamily = "Arial, sans-serif";

      const h = document.createElement("div");
      h.textContent = title;
      h.style.fontSize = "18px";
      h.style.fontWeight = "700";
      h.style.marginBottom = "12px";

      const uLabel = document.createElement("div");
      uLabel.textContent = usernameLabel;
      uLabel.style.fontSize = "13px";
      uLabel.style.opacity = "0.85";

      const u = document.createElement("input");
      u.type = "text";
      u.autocomplete = "username";
      u.style.width = "100%";
      u.style.margin = "6px 0 10px";
      u.style.padding = "10px";
      u.style.borderRadius = "8px";
      u.style.border = "1px solid rgba(255,255,255,0.2)";
      u.style.background = "#1b1b1b";
      u.style.color = "#fff";
      u.style.outline = "none";

      const pLabel = document.createElement("div");
      pLabel.textContent = passwordLabel;
      pLabel.style.fontSize = "13px";
      pLabel.style.opacity = "0.85";

      const p = document.createElement("input");
      p.type = "password"; // ✅ masked
      p.autocomplete = "current-password";
      p.style.width = "100%";
      p.style.margin = "6px 0 10px";
      p.style.padding = "10px";
      p.style.borderRadius = "8px";
      p.style.border = "1px solid rgba(255,255,255,0.2)";
      p.style.background = "#1b1b1b";
      p.style.color = "#fff";
      p.style.outline = "none";

      const err = document.createElement("div");
      err.style.color = "#ff6b6b";
      err.style.fontSize = "12px";
      err.style.minHeight = "16px";
      err.style.marginTop = "2px";

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "10px";
      row.style.marginTop = "12px";
      row.style.justifyContent = "flex-end";

      const cancel = document.createElement("button");
      cancel.textContent = "Cancel";
      cancel.style.padding = "10px 12px";
      cancel.style.borderRadius = "8px";
      cancel.style.border = "1px solid rgba(255,255,255,0.2)";
      cancel.style.background = "#222";
      cancel.style.color = "#fff";
      cancel.style.cursor = "pointer";

      const ok = document.createElement("button");
      ok.textContent = submitText;
      ok.style.padding = "10px 12px";
      ok.style.borderRadius = "8px";
      ok.style.border = "0";
      ok.style.background = "#14C993";
      ok.style.color = "#fff";
      ok.style.fontWeight = "700";
      ok.style.cursor = "pointer";

      function cleanup() {
        document.removeEventListener("keydown", onKey);
        overlay.remove();
      }

      function onCancel() {
        cleanup();
        reject(new Error("Cancelled"));
      }

      async function onSubmit() {
        const username = (u.value || "").trim();
        const password = (p.value || "");

        if (!username) { err.textContent = "Username required"; return; }
        if (!password) { err.textContent = "Password required"; return; }

        ok.disabled = true;
        cancel.disabled = true;
        err.textContent = "";

        cleanup();
        resolve({ username, password });
      }

      function onKey(e) {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter") onSubmit();
      }

      cancel.onclick = onCancel;
      ok.onclick = onSubmit;

      row.appendChild(cancel);
      row.appendChild(ok);

      box.appendChild(h);
      box.appendChild(uLabel);
      box.appendChild(u);
      box.appendChild(pLabel);
      box.appendChild(p);
      box.appendChild(err);
      box.appendChild(row);

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      document.addEventListener("keydown", onKey);
      setTimeout(() => u.focus(), 0);
    });
  }

  async function promptLogin() {
    const { username, password } = await promptCredentials({
      title: "Login",
      usernameLabel: "Username",
      passwordLabel: "Password",
      submitText: "Login",
    });

    const data = await window.Ball10API.login(username, password);
    setSession(data.token, data.user);
    showAlert(`Welcome ${data.user.username} ✅`);
    return data.user;
  }

  async function promptRegister() {
    const { username, password } = await promptCredentials({
      title: "Register",
      usernameLabel: "Choose a username",
      passwordLabel: "Choose a password",
      submitText: "Create",
    });

    await window.Ball10API.register(username, password);
    showAlert("Registered ✅ Now login.");
    return null;
  }

  window.Ball10Auth = {
    showAlert,
    getToken,
    getUser,
    setSession,
    logout,
    restoreFromDb,
    promptLogin,
    promptRegister,
  };
})();
