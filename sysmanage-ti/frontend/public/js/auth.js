// LOGIN
async function login() {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("msg");

  msg.innerText = "";

  if (!email || !password) {
    msg.innerText = "Preencha todos os campos.";
    return;
  }

  try {

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.mustChangePassword) {
        localStorage.setItem("mustChangePassword", "1");
        window.location.href = "change-password.html?first=1";
      } else {
        localStorage.removeItem("mustChangePassword");
        window.location.href = "dashboard.html";
      }
    } else {
      msg.innerText = data.error;
    }

  } catch (error) {
    msg.innerText = "Erro ao conectar com servidor.";
  }
}


// REGISTER
async function register() {

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("msg");

  msg.innerText = "";

  if (!name || !email || !password) {
    msg.innerText = "Preencha todos os campos.";
    return;
  }

  try {

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (res.ok) {
      alert("Conta criada com sucesso!");
      window.location.href = "login.html";
    } else {
      msg.innerText = data.error;
    }

  } catch (error) {
    msg.innerText = "Erro ao conectar com servidor.";
  }
}