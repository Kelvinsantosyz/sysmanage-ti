(function () {
  var token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  var params = new URLSearchParams(window.location.search);
  var isFirstLogin = params.get("first") === "1" || localStorage.getItem("mustChangePassword") === "1";

  var wrapCurrent = document.getElementById("wrapCurrentPassword");
  var wrapVoltar = document.getElementById("wrapVoltar");
  var subtitle = document.getElementById("subtitle");

  if (isFirstLogin) {
    wrapCurrent.classList.add("d-none");
    wrapVoltar.classList.add("d-none");
    if (subtitle) subtitle.textContent = "Por segurança, altere sua senha no primeiro acesso.";
  } else {
    wrapCurrent.classList.remove("d-none");
    wrapVoltar.classList.remove("d-none");
  }

  document.getElementById("btnSalvar").addEventListener("click", function () {
    var msgEl = document.getElementById("msg");
    var current = document.getElementById("currentPassword").value;
    var newPass = document.getElementById("newPassword").value;
    var confirmPass = document.getElementById("confirmPassword").value;

    msgEl.textContent = "";

    if (newPass.length < 6) {
      msgEl.textContent = "A nova senha deve ter pelo menos 6 caracteres.";
      return;
    }
    if (newPass !== confirmPass) {
      msgEl.textContent = "A confirmação da senha não confere.";
      return;
    }
    if (!isFirstLogin && !current) {
      msgEl.textContent = "Informe a senha atual.";
      return;
    }

    var body = { newPassword: newPass };
    if (!isFirstLogin) body.currentPassword = current;

    fetch("/api/auth/change-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; }); })
      .then(function (result) {
        if (result.status === 401) {
          localStorage.clear();
          window.location.href = "login.html";
          return;
        }
        if (result.ok) {
          localStorage.removeItem("mustChangePassword");
          alert(result.data.message || "Senha alterada com sucesso!");
          window.location.href = "dashboard.html";
        } else {
          msgEl.textContent = result.data.error || "Erro ao alterar senha.";
        }
      })
      .catch(function () {
        msgEl.textContent = "Erro ao conectar com o servidor.";
      });
  });
})();
