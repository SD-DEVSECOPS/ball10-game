(function () {
  const LS_TOKEN = "ball10_token";
  const LS_USER = "ball10_user";
  const COOKIE_TOKEN = "ball10_token";
  const COOKIE_USER = "ball10_user";

  function showAlert(msg, isError = false) {
    const el = document.getElementById("appAlert");
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle("error", !!isError);
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, isError ? 4500 : 2500);
  }

  // ---------------- Cookies (fallback if localStorage is unreliable) ----------------
  function setCookie(name, value, days /* null => session cookie */) {
    const enc = encodeURIComponent(String(value || ""));
    let cookie = `${name}=${enc}; Path=/; SameSite=Lax`;
    // If you're always on https (recommended), this is fine:
    if (location.protocol === "https:") cookie += "; Secure";
    if (typeof days === "number" && days > 0) {
      cookie += `; Max-Age=${Math.floor(days * 86400)}`;
    }
    document.cookie = cookie;
  }

  function getCookie(name) {
    const m = document.cookie.match(new RegExp("(^|;\\s*)" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
    return m ? decodeURIComponent(m[2]) : "";
  }

  function deleteCookie(name) {
    // Expire immediately
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax` + (location.protocol === "https:" ? "; Secure" : "");
  }

  function getToken() {
    const ls = localStorage.getItem(LS_TOKEN) || "";
    if (ls) return ls;
    // fallback
    return getCookie(COOKIE_TOKEN) || "";
  }

  function getUser() {
    // localStorage first
    try {
      const s = localStorage.getItem(LS_USER);
      if (s) return JSON.parse(s);
    } catch {}
    // cookie fallback
    try {
      const c = getCookie(COOKIE_USER);
      if (c) return JSON.parse(c);
    } catch {}
    return null;
  }

  function setSession(token, user, rememberDays) {
    const t = String(token || "");
    const u = user || null;

    localStorage.setItem(LS_TOKEN, t);
    localStorage.setItem(LS_USER, JSON.stringify(u));

    // cookie fallback (important for refresh/session persistence issues)
    setCookie(COOKIE_TOKEN, t, rememberDays);
    setCookie(COOKIE_USER, JSON.stringify(u), rememberDays);
  }

  function clearSession() {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
    deleteCookie(COOKIE_TOKEN);
    deleteCookie(COOKIE_USER);
  }

  function logout() {
    clearSession();
    showAlert("Logged out.");
  }

  // ---------------- Simple modal UI ----------------
  function ensureModalStyles() {
    if (document.getElementById("ball10AuthModalStyle")) return;
    const style = document.createElement("style");
    style.id = "ball10AuthModalStyle";
    style.textContent = `
      .ball10-modal-backdrop{
        position:fixed; inset:0; background:rgba(0,0,0,.65);
        display:flex; align-items:center; justify-content:center;
        z-index: 10050;
      }
      .ball10-modal{
        width:min(420px, 92vw);
        background:#1f1f1f; color:#fff;
        border:1px solid rgba(255,255,255,.12);
        border-radius:10px;
        padding:16px 16px 12px;
        box-shadow:0 10px 30px rgba(0,0,0,.5);
        font-family: Arial, sans-serif;
      }
      .ball10-modal h3{ margin:0 0 10px; font-size:18px; }
      .ball10-field{ margin:10px 0; }
      .ball10-field label{ display:block; font-size:12px; color:#bbb; margin-bottom:6px; }
      .ball10-field input{
        width:100%; box-sizing:border-box;
        padding:10px 10px;
        border-radius:8px;
        border:1px solid rgba(255,255,255,.15);
        background:#141414; color:#fff;
        outline:none;
      }
      .ball10-row{ display:flex; gap:10px; align-items:center; justify-content:space-between; margin-top:10px; }
      .ball10-actions{ display:flex; gap:10px; justify-content:flex-end; margin-top:12px; }
      .ball10-btn{
        padding:10px 12px; border-radius:8px;
        border:1px solid rgba(255,255,255,.15);
        background:#2b2b2b; color:#fff;
        cursor:pointer; font-weight:bold;
      }
      .ball10-btn.primary{ background:#14C993; border-color:#14C993; color:#06150f; }
      .ball10-btn.danger{ background:#FF4757; border-color:#FF4757; }
      .ball10-small{ font-size:12px; color:#bbb; }
      .ball10-checkbox{ display:flex; gap:8px; align-items:center; user-select:none; cursor:pointer; }
      .ball10-checkbox input{ width:auto; }
    `;
    document.head.appendChild(style);
  }

  function openAuthModal(mode /* "login"|"register" */) {
    ensureModalStyles();

    return new Promise((resolve, reject) => {
      const backdrop = document.createElement("div");
      backdrop.className = "ball10-modal-backdrop";

      const box = document.createElement("div");
      box.className = "ball10-modal";

      const title = document.createElement("h3");
      title.textContent = mode === "register" ? "Create Account" : "Login";

      const uField = document.createElement("div");
      uField.className = "ball10-field";
      const uLabel = document.createElement("label");
      uLabel.textContent = "Username";
      const uInput = document.createElement("input");
      uInput.type = "text";
      uInput.autocomplete = mode === "register" ? "username" : "username";
      uInput.placeholder = "username";
      uField.appendChild(uLabel);
      uField.appendChild(uInput);

      const pField = document.createElement("div");
      pField.className = "ball10-field";
      const pLabel = document.createElement("label");
      pLabel.textContent = "Password";
      const pInput = document.createElement("input");
      pInput.type = "password";
      pInput.autocomplete = mode === "register" ? "new-password" : "current-password";
      pInput.placeholder = "password";
      pField.appendChild(pLabel);
      pField.appendChild(pInput);

      const row = document.createElement("div");
      row.className = "ball10-row";

      const rememberWrap = document.createElement("label");
      rememberWrap.className = "ball10-checkbox";
      const remember = document.createElement("input");
      remember.type = "checkbox";
      remember.checked = true; // default on
      const rememberTxt = document.createElement("span");
      rememberTxt.className = "ball10-small";
      rememberTxt.textContent = "Remember me";
      rememberWrap.appendChild(remember);
      rememberWrap.appendChild(rememberTxt);

      const hint = document.createElement("div");
      hint.className = "ball10-small";
      hint.textContent = mode === "register"
        ? "Password must match your server rules."
        : "Session will be restored after refresh.";

      row.appendChild(rememberWrap);
      row.appendChild(hint);

      const actions = document.createElement("div");
      actions.className = "ball10-actions";

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "ball10-btn";
      cancelBtn.textContent = "Cancel";

      const okBtn = document.createElement("button");
      okBtn.className = "ball10-btn primary";
      okBtn.textContent = mode === "register" ? "Register" : "Login";

      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);

      box.appendChild(title);
      box.appendChild(uField);
      box.appendChild(pField);
      box.appendChild(row);
      box.appendChild(actions);
      backdrop.appendChild(box);
      document.body.appendChild(backdrop);

      function cleanup() {
        backdrop.remove();
      }

      function submit() {
        const username = String(uInput.value || "").trim();
        const password = String(pInput.value || "");
        const rememberMe = !!remember.checked;

        if (!username || !password) {
          showAlert("Username + password required.", true);
          return;
        }
        cleanup();
        resolve({ username, password, rememberMe });
      }

      cancelBtn.onclick = () => { cleanup(); reject(new Error("Cancelled")); };
      okBtn.onclick = submit;

      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) { cleanup(); reject(new Error("Cancelled")); }
      });

      // Enter key
      pInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit();
      });

      // focus
      setTimeout(() => uInput.focus(), 0);
    });
  }

  // ---------------- API flows ----------------
  async function restoreFromDb() {
    // If localStorage was cleared, restore from cookie automatically
    const token = getToken();
    if (!token) return null;

    const data = await window.Ball10API.me(token);
    if (data?.user) {
      // Keep same remember duration as cookie currently has (best effort)
      const hasCookie = !!getCookie(COOKIE_TOKEN);
      setSession(token, data.user, hasCookie ? 30 : null);
      return data.user;
    }
    return null;
  }

  async function promptLogin() {
    const { username, password, rememberMe } = await openAuthModal("login");
    const data = await window.Ball10API.login(username, password);

    // Remember: 30 days if checked, else session cookie
    setSession(data.token, data.user, rememberMe ? 30 : null);

    showAlert(`Welcome ${data.user.username} ✅`);
    return data.user;
  }

  async function promptRegister() {
    const { username, password, rememberMe } = await openAuthModal("register");
    await window.Ball10API.register(username, password);

    // After register, user still needs to login (your design)
    // But we can keep remember choice for later by storing nothing (no token yet).
    showAlert("Registered ✅ Now login.");
    return { rememberMe };
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
