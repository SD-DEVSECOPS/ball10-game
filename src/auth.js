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

  async function promptLogin() {
    const username = prompt("Username:", "");
    if (!username) return null;

    const password = prompt("Password:", "");
    if (!password) return null;

    const data = await window.Ball10API.login(username, password);
    setSession(data.token, data.user);
    showAlert(`Welcome ${data.user.username} ✅`);
    return data.user;
  }

  async function promptRegister() {
    const username = prompt("Choose a username:", "");
    if (!username) return null;

    const password = prompt("Choose a password:", "");
    if (!password) return null;

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
