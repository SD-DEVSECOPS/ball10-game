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

  async function promptLoginOrRegister() {
    const mode = prompt("Type: login OR register", "login");
    if (!mode) return null;

    const username = prompt("Username:", "");
    if (!username) return null;

    const password = prompt("Password:", "");
    if (!password) return null;

    if (mode.toLowerCase().startsWith("r")) {
      await window.Ball10API.register(username, password);
      showAlert("Registered ✅ Now login.");
      return null;
    }

    const data = await window.Ball10API.login(username, password);
    setSession(data.token, data.user);
    showAlert(`Welcome ${data.user.username} ✅`);
    return data;
  }

  window.Ball10Auth = {
    showAlert,
    getToken,
    getUser,
    setSession,
    logout,
    promptLoginOrRegister,
  };
})();
