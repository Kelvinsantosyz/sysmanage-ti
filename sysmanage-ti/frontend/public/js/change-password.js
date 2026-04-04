(function () {

  const params = new URLSearchParams(window.location.search);

  const isFirstLogin =
    params.get("first") === "1" ||
    localStorage.getItem("mustChangePassword") === "1";

  const wrapCurrent = document.getElementById("wrapCurrentPassword");
  const wrapVoltar = document.getElementById("wrapVoltar");
  const subtitle = document.getElementById("subtitle");

  if (isFirstLogin) {

    if (wrapCurrent) wrapCurrent.classList.add("d-none");
    if (wrapVoltar) wrapVoltar.classList.add("d-none");

    if (subtitle) {
      subtitle.textContent =
        "Por segurança, altere sua senha no primeiro acesso.";
    }

  } else {

    if (wrapCurrent) wrapCurrent.classList.remove("d-none");
    if (wrapVoltar) wrapVoltar.classList.remove("d-none");

  }

  const btnSalvar = document.getElementById("btnSalvar");

  btnSalvar.addEventListener("click", async function () {

    const msgEl = document.getElementById("msg");

    const current = document.getElementById("currentPassword").value;
    const newPass = document.getElementById("newPassword").value;
    const confirmPass = document.getElementById("confirmPassword").value;

    msgEl.textContent = "";

    if (newPass.length < 6) {
      msgEl.textContent =
        "A nova senha deve ter pelo menos 6 caracteres.";
      return;
    }

    if (newPass !== confirmPass) {
      msgEl.textContent =
        "A confirmação da senha não confere.";
      return;
    }

    if (!isFirstLogin && !current) {
      msgEl.textContent =
        "Informe a senha atual.";
      return;
    }

    const body = {
      newPassword: newPass
    };

    if (!isFirstLogin) {
      body.currentPassword = current;
    }

    try {

      const response = await fetch("/api/auth/change-password", {

        method: "PUT",

        headers: {
          "Content-Type": "application/json"
        },

        credentials: "include",

        body: JSON.stringify(body)

      });

      const data = await response.json();

      if (response.status === 401) {

        localStorage.clear();

        window.location.href = "login.html";

        return;

      }

      if (response.ok) {

        localStorage.removeItem("mustChangePassword");

        alert(data.message || "Senha alterada com sucesso!");

        window.location.href = "dashboard.html";

      } else {

        msgEl.textContent =
          data.error || "Erro ao alterar senha.";

      }

    } catch (err) {

      msgEl.textContent =
        "Erro ao conectar com o servidor.";

    }

  });

})();