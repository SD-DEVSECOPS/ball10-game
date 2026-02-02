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

  function setCookie(name, value, days) {
    const enc = encodeURIComponent(String(value || ""));
    let cookie = `${name}=${enc}; Path=/; SameSite=Lax`;
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
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax` + (location.protocol === "https:" ? "; Secure" : "");
  }

  function getToken() {
    return localStorage.getItem(LS_TOKEN) || getCookie(COOKIE_TOKEN) || "";
  }

  function getUser() {
    try {
      const s = localStorage.getItem(LS_USER) || getCookie(COOKIE_USER);
      if (s) return JSON.parse(s);
    } catch {}
    return null;
  }

  function setSession(token, user, rememberDays) {
    const t = String(token || "");
    const u = user || null;
    localStorage.setItem(LS_TOKEN, t);
    localStorage.setItem(LS_USER, JSON.stringify(u));
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

  function ensureModalStyles() {
    if (document.getElementById("ball10AuthModalStyle")) return;
    const style = document.createElement("style");
    style.id = "ball10AuthModalStyle";
    style.textContent = `
      .ball10-modal-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.65); display:flex; align-items:center; justify-content:center; z-index: 10050; }
      .ball10-modal{ width:min(420px, 92vw); background:#1f1f1f; color:#fff; border:1px solid rgba(255,255,255,.12); border-radius:10px; padding:16px 16px 12px; box-shadow:0 10px 30px rgba(0,0,0,.5); font-family: Arial, sans-serif; }
      .ball10-modal h3{ margin:0 0 10px; font-size:18px; }
      .ball10-field{ margin:10px 0; }
      .ball10-field label{ display:block; font-size:12px; color:#bbb; margin-bottom:6px; }
      .ball10-field input{ width:100%; box-sizing:border-box; padding:10px 10px; border-radius:8px; border:1px solid rgba(255,255,255,.15); background:#141414; color:#fff; outline:none; font-size: 16px; }
      .ball10-row{ display:flex; gap:10px; align-items:center; justify-content:space-between; margin-top:10px; }
      .ball10-error-inline{ color: #FF4757; font-size: 13px; margin-top: 8px; font-weight: bold; background: rgba(255,71,87,0.1); padding: 8px; border-radius: 6px; display: none; }
      .ball10-actions{ display:flex; gap:10px; justify-content:flex-end; margin-top:12px; }
      .ball10-btn{ padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,.15); background:#2b2b2b; color:#fff; cursor:pointer; font-weight:bold; }
      .ball10-btn.primary{ background:#14C993; border-color:#14C993; color:#06150f; }
      .ball10-small{ font-size:12px; color:#bbb; }
      .ball10-checkbox{ display:flex; gap:8px; align-items:center; user-select:none; cursor:pointer; }
    `;
    document.head.appendChild(style);
  }

  function openAuthModal(initialMode) {
    ensureModalStyles();
    return new Promise((resolve, reject) => {
      let mode = initialMode;
      const backdrop = document.createElement("div");
      backdrop.className = "ball10-modal-backdrop";
      const box = document.createElement("div");
      box.className = "ball10-modal";

      const title = document.createElement("h3");
      const uInput = document.createElement("input");
      uInput.placeholder = "username";
      const pInput = document.createElement("input");
      pInput.type = "password";
      pInput.placeholder = "password";
      
      const p2Field = document.createElement("div");
      p2Field.className = "ball10-field";
      const p2Input = document.createElement("input");
      p2Input.type = "password";
      p2Input.placeholder = "new password";
      p2Field.appendChild(document.createElement("label")).textContent = "New Password";
      p2Field.appendChild(p2Input);

      const errArea = document.createElement("div");
      errArea.className = "ball10-error-inline";

      const switchBtn = document.createElement("div");
      switchBtn.className = "ball10-small";
      switchBtn.style.cursor = "pointer";
      switchBtn.style.textDecoration = "underline";
      switchBtn.style.color = "#14C993";

      const okBtn = document.createElement("button");
      okBtn.className = "ball10-btn primary";
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "ball10-btn";
      cancelBtn.textContent = "Cancel";

      const remember = document.createElement("input");
      remember.type = "checkbox";
      remember.checked = true;

      const uField = document.createElement("div"); uField.className = "ball10-field";
      uField.appendChild(document.createElement("label")).textContent = "Username";
      uField.appendChild(uInput);
      const pField = document.createElement("div"); pField.className = "ball10-field";
      const pLabel = document.createElement("label");
      pField.appendChild(pLabel);
      pField.appendChild(pInput);
      const row = document.createElement("div"); row.className = "ball10-row";
      const remWrap = document.createElement("label"); remWrap.className = "ball10-checkbox";
      remWrap.appendChild(remember); remWrap.appendChild(document.createElement("span")).textContent = " Remember me";
      row.appendChild(remWrap); row.appendChild(switchBtn);
      const actions = document.createElement("div"); actions.className = "ball10-actions";
      actions.appendChild(cancelBtn); actions.appendChild(okBtn);
      box.append(title, uField, pField, p2Field, row, errArea, actions);
      backdrop.appendChild(box);
      document.body.appendChild(backdrop);

      function updateUI() {
        title.textContent = mode === "register" ? "Create Account" : (mode === "change" ? "Change Password" : "Login");
        okBtn.textContent = mode === "register" ? "Register" : (mode === "change" ? "Update" : "Login");
        switchBtn.textContent = mode === "register" ? "Already have account? Login" : "No account? Register";
        uField.style.display = mode === "change" ? "none" : "block";
        p2Field.style.display = mode === "change" ? "block" : "none";
        remWrap.style.display = mode === "change" ? "none" : "flex";
        switchBtn.style.display = mode === "change" ? "none" : "block";
        pLabel.textContent = mode === "change" ? "Old Password" : "Password";
      }
      updateUI();

      async function submit() {
        errArea.style.display = "none";
        const username = uInput.value.trim();
        const password = pInput.value;
        const newPassword = p2Input.value;
        if (mode !== "change" && (!username || !password)) return (errArea.textContent = "Required fields!", errArea.style.display = "block");
        if (mode === "change" && (!password || !newPassword)) return (errArea.textContent = "Required fields!", errArea.style.display = "block");
        
        okBtn.disabled = true; okBtn.textContent = "...";
        try {
          if (mode === "login") {
            const data = await window.Ball10API.login(username, password);
            setSession(data.token, data.user, remember.checked ? 30 : null);
            showAlert(`Welcome ${data.user.username}`);
            backdrop.remove(); resolve(data.user);
          } else if (mode === "register") {
            await window.Ball10API.register(username, password);
            showAlert("Registered! Please login.");
            mode = "login"; updateUI(); pInput.value = "";
          } else if (mode === "change") {
            await window.Ball10API.changePassword(getToken(), password, newPassword);
            showAlert("Password updated!");
            backdrop.remove(); resolve();
          }
        } catch (e) { errArea.textContent = e.message; errArea.style.display = "block"; }
        finally { okBtn.disabled = false; okBtn.textContent = mode === "register" ? "Register" : (mode === "change" ? "Update" : "Login"); }
      }

      switchBtn.onclick = () => { mode = (mode === "login" ? "register" : "login"); updateUI(); };
      okBtn.onclick = submit;
      cancelBtn.onclick = () => { backdrop.remove(); reject(); };
      backdrop.onclick = (e) => { if (e.target === backdrop) { backdrop.remove(); reject(); } };
      box.onclick = (e) => e.stopPropagation();
      [uInput, pInput, p2Input].forEach(i => i.onkeydown = (e) => e.key === "Enter" && submit());
      setTimeout(() => (mode === "change" ? pInput : uInput).focus(), 0);
    });
  }

  window.Ball10Auth = {
    showAlert, getToken, getUser, setSession, logout,
    restoreFromDb: async () => {
      const t = getToken();
      if (!t) return null;
      try {
        const d = await window.Ball10API.me(t);
        if (d?.user) { setSession(t, d.user, !!getCookie(COOKIE_TOKEN) ? 30 : null); return d.user; }
      } catch {}
      return null;
    },
    promptLogin: () => openAuthModal("login"),
    promptRegister: () => openAuthModal("register"),
    promptChangePassword: () => openAuthModal("change"),
  };
})();
