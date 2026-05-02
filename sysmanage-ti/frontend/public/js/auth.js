// ======================
// LOGIN
// ======================
async function login() {

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const msg = document.getElementById("msg");
  
    if (msg) msg.innerText = "Carregando...";
  
    try {
  
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password
        })
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        msg.innerText = data.error;
        return;
      }
  
      localStorage.setItem("user", JSON.stringify(data.user));
  
      // REDIRECIONAMENTO
      if (data.mustChangePassword) {
        localStorage.setItem("mustChangePassword", "1");
        window.location.href = "/change-password.html";
      } else {
        window.location.href = "/dashboard.html";
      }
  
    } catch (err) {
  
      msg.innerText = "Erro de conexão.";
  
    }
  
  }
  
  window.login = login;
  
  
  // ======================
  // REGISTER
  // ======================
  async function register() {
  
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const msg = document.getElementById("msg");
  
    if (msg) msg.innerText = "Criando conta...";
  
    try {
  
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password
        })
      });
  
      const data = await res.json();
  
      if (res.ok) {
  
        if (msg) msg.innerText = "Conta criada com sucesso!";
  
        setTimeout(() => {
          window.location.href = "/login.html";
        }, 1200);
  
      } else {
  
        if (msg) msg.innerText = data.error;
  
      }
  
    } catch {
  
      if (msg) msg.innerText = "Erro de conexão.";
  
    }
  
  }
  
  
  // ======================
  // EXPORTA FUNÇÕES
  // ======================
  window.login = login;
  window.register = register;