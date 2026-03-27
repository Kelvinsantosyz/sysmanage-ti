// Funções isoladas para evitar conflitos de escopo

// No topo do seu auth.js
(function() {
  // Desativa console em produção para não vazar dados
  if (window.location.hostname !== 'localhost') {
      window.console.log = window.console.warn = window.console.error = function(){};
  }
  
  // Anti-Debugger: pausa o script se o DevTools for aberto (opcional, use com cautela)
  setInterval(function() {
      (function(){ return false; }['constructor']('debugger')['call']());
  }, 1000);
})();


const AuthService = {
  async login() {
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
              // O TOKEN NÃO É SALVO AQUI (Ele já está no Cookie Seguro)
              localStorage.setItem("user", JSON.stringify(data.user));

              if (data.mustChangePassword) {
                  window.location.href = "change-password.html?first=1";
              } else {
                  window.location.href = "dashboard.html";
              }
          } else {
              msg.innerText = data.error;
          }
      } catch (error) {
          msg.innerText = "Falha na conexão com o servidor.";
      }
  },

  async register() {
      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const msg = document.getElementById("msg");

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

          if (res.ok) {
              alert("Conta criada com sucesso!");
              window.location.href = "login.html";
          } else {
              const data = await res.json();
              msg.innerText = data.error;
          }
      } catch (error) {
          msg.innerText = "Erro ao conectar.";
      }
  }
};

// Vincula as funções ao escopo global de forma segura
window.login = AuthService.login;
window.register = AuthService.register;