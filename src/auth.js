(function () {
    const LS_TOKEN = "ball10_token";
    const LS_USER = "ball10_user";
    const COOKIE_TOKEN = "ball10_token";
    const COOKIE_USER = "ball10_user";

    // ✅ Prevent multiple modals opening at the same time
    let __ball10_modal_open = false;
    let __ball10_modal_promise = null;

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
        } catch { }
        // cookie fallback
        try {
            const c = getCookie(COOKIE_USER);
            if (c) return JSON.parse(c);
        } catch { }
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
        font-size: 16px;
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
      .ball10-btn.primary{ background:#14C993; border-color:#14C993; color:#06150f; }
      .ball10-small{ font-size:12px; color:#bbb; }
      .ball10-error-inline{ color: #FF4757; font-size: 13px; margin-top: 8px; font-weight: bold; background: rgba(255,71,87,0.1); padding: 8px; border-radius: 6px; display: none; }
      .ball10-checkbox{ display:flex; gap:8px; align-items:center; user-select:none; cursor:pointer; }
      .ball10-checkbox input{ width:auto; }
    `;
        document.head.appendChild(style);
    }

    function openAuthModal(initialMode /* "login"|"register"|"change" */) {
        // ✅ If a modal is already open, return the same promise (prevents duplicates)
        if (__ball10_modal_open && __ball10_modal_promise) return __ball10_modal_promise;

        ensureModalStyles();
        __ball10_modal_open = true;

        __ball10_modal_promise = new Promise((resolve, reject) => {
            let mode = initialMode;

            const backdrop = document.createElement("div");
            backdrop.className = "ball10-modal-backdrop";

            const box = document.createElement("div");
            box.className = "ball10-modal";

            const title = document.createElement("h3");

            // Username field
            const uField = document.createElement("div");
            uField.className = "ball10-field";
            const uLabel = document.createElement("label");
            uLabel.textContent = "Username";
            const uInput = document.createElement("input");
            uInput.type = "text";
            uInput.placeholder = "username";
            uField.appendChild(uLabel);
            uField.appendChild(uInput);

            // Password field (Primary)
            const pField = document.createElement("div");
            pField.className = "ball10-field";
            const pLabel = document.createElement("label");
            const pInput = document.createElement("input");
            pInput.type = "password";
            pField.appendChild(pLabel);
            pField.appendChild(pInput);

            // New Password field (Change mode only)
            const p2Field = document.createElement("div");
            p2Field.className = "ball10-field";
            const p2Label = document.createElement("label");
            p2Label.textContent = "New Password";
            const p2Input = document.createElement("input");
            p2Input.type = "password";
            p2Input.placeholder = "new password";
            p2Field.appendChild(p2Label);
            p2Field.appendChild(p2Input);

            const row = document.createElement("div");
            row.className = "ball10-row";

            const rememberWrap = document.createElement("label");
            rememberWrap.className = "ball10-checkbox";
            const remember = document.createElement("input");
            remember.type = "checkbox";
            remember.checked = true;
            const rememberTxt = document.createElement("span");
            rememberTxt.className = "ball10-small";
            rememberTxt.textContent = "Remember me";
            rememberWrap.appendChild(remember);
            rememberWrap.appendChild(rememberTxt);

            const switchBtn = document.createElement("div");
            switchBtn.className = "ball10-small";
            switchBtn.style.cursor = "pointer";
            switchBtn.style.textDecoration = "underline";
            switchBtn.style.color = "#14C993";

            const errArea = document.createElement("div");
            errArea.className = "ball10-error-inline";

            row.appendChild(rememberWrap);
            row.appendChild(switchBtn);

            const actions = document.createElement("div");
            actions.className = "ball10-actions";

            const cancelBtn = document.createElement("button");
            cancelBtn.className = "ball10-btn";
            cancelBtn.textContent = "Cancel";

            const okBtn = document.createElement("button");
            okBtn.className = "ball10-btn primary";

            actions.appendChild(cancelBtn);
            actions.appendChild(okBtn);

            box.appendChild(title);
            box.appendChild(uField);
            box.appendChild(pField);
            box.appendChild(p2Field);
            box.appendChild(row);
            box.appendChild(errArea);
            box.appendChild(actions);
            backdrop.appendChild(box);
            document.body.appendChild(backdrop);

            function updateUI() {
                title.textContent = mode === "register" ? "Create Account" : (mode === "change" ? "Change Password" : "Login");
                okBtn.textContent = mode === "register" ? "Register" : (mode === "change" ? "Update" : "Login");
                switchBtn.textContent = mode === "register" ? "Already have account? Login" : "No account? Register";

                uField.style.display = mode === "change" ? "none" : "block";
                p2Field.style.display = mode === "change" ? "block" : "none";
                rememberWrap.style.display = mode === "change" ? "none" : "flex";
                switchBtn.style.display = mode === "change" ? "none" : "block";

                pLabel.textContent = mode === "change" ? "Old Password" : "Password";
                pInput.placeholder = mode === "change" ? "old password" : "password";

                uInput.autocomplete = mode === "register" ? "username" : "username";
                pInput.autocomplete = mode === "register" ? "new-password" : "current-password";
            }

            updateUI();

            function cleanup() {
                backdrop.remove();
                // ✅ release modal lock
                __ball10_modal_open = false;
                __ball10_modal_promise = null;
            }

            async function submit() {
                errArea.style.display = "none";
                const username = String(uInput.value || "").trim();
                const password = String(pInput.value || "");
                const newPassword = String(p2Input.value || "");
                const rememberMe = !!remember.checked;

                if (mode !== "change" && (!username || !password)) {
                    errArea.textContent = "Username and password are required.";
                    errArea.style.display = "block";
                    return;
                }
                if (mode === "change" && (!password || !newPassword)) {
                    errArea.textContent = "Old and new passwords are required.";
                    errArea.style.display = "block";
                    return;
                }

                // Disable UI during attempt
                okBtn.disabled = true;
                okBtn.style.opacity = "0.5";
                okBtn.textContent = "...";

                try {
                    let result;
                    if (mode === "login") {
                        const data = await window.Ball10API.login(username, password);
                        setSession(data.token, data.user, rememberMe ? 30 : null);
                        showAlert(`Welcome ${data.user.username} ✅`);
                        result = data.user;
                    } else if (mode === "register") {
                        await window.Ball10API.register(username, password);
                        showAlert("Registered ✅ Now login.");
                        mode = "login";
                        updateUI();
                        okBtn.disabled = false;
                        okBtn.style.opacity = "1";
                        pInput.value = ""; // clear password for login after register
                        errArea.style.display = "none";
                        return; // Stay in modal to allow login
                    } else if (mode === "change") {
                        const token = getToken();
                        await window.Ball10API.changePassword(token, password, newPassword);
                        showAlert("Password changed successfully ✅");
                        result = true;
                    }
                    cleanup();
                    resolve(result);
                } catch (e) {
                    errArea.textContent = e.message || "Action failed";
                    errArea.style.display = "block";
                    okBtn.disabled = false;
                    okBtn.style.opacity = "1";
                    okBtn.textContent = mode === "register" ? "Register" : (mode === "change" ? "Update" : "Login");
                }
            }

            switchBtn.onclick = (e) => {
                e.stopPropagation();
                mode = (mode === "login" ? "register" : "login");
                updateUI();
            };

            cancelBtn.onclick = () => { cleanup(); reject(new Error("Cancelled")); };
            okBtn.onclick = submit;

            backdrop.onclick = (e) => {
                if (e.target === backdrop) { cleanup(); reject(new Error("Cancelled")); }
            };

            box.onclick = (e) => e.stopPropagation();

            const inputs = [uInput, pInput, p2Input];
            inputs.forEach(inp => {
                inp.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") submit();
                });
            });

            setTimeout(() => (mode === "change" ? pInput : uInput).focus(), 0);
        });

        return __ball10_modal_promise;
    }

    // ---------------- API flows ----------------
    async function restoreFromDb() {
        const token = getToken();
        if (!token) return null;
        try {
            const data = await window.Ball10API.me(token);
            if (data?.user) {
                const hasCookie = !!getCookie(COOKIE_TOKEN);
                setSession(token, data.user, hasCookie ? 30 : null);
                return data.user;
            }
        } catch (e) { }
        return null;
    }

    async function promptLogin() {
        return await openAuthModal("login");
    }

    async function promptRegister() {
        return await openAuthModal("register");
    }

    async function promptChangePassword() {
        return await openAuthModal("change");
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
        promptChangePassword,
    };
})();
