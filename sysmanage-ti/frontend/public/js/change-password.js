(async function () {

  // ── 1. Verificar sessão ──────────────────────────────────────────────────
  let sessionUser = null;
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.status === 401) {
      window.location.href = "login.html";
      return;
    }
    sessionUser = await res.json();
  } catch (e) {
    window.location.href = "login.html";
    return;
  }

  // ── 2. Decidir se é primeiro login ───────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const isFirstLogin =
    params.get("first") === "1" ||
    localStorage.getItem("mustChangePassword") === "1" ||
    sessionUser.must_change_password === 1;

  const wrapCurrent = document.getElementById("wrapCurrentPassword");
  const wrapVoltar  = document.getElementById("wrapVoltar");
  const subtitle    = document.getElementById("subtitle");

  if (isFirstLogin) {
    wrapCurrent.classList.add("hidden");
    wrapVoltar.classList.add("hidden");
    if (subtitle) subtitle.textContent = "Por segurança, altere sua senha no primeiro acesso.";
  } else {
    wrapCurrent.classList.remove("hidden");
    wrapVoltar.classList.remove("hidden");
  }

  // ── 3. Helpers de mensagem ───────────────────────────────────────────────
  function showMsg(text, type) {
    const el = document.getElementById("msg");
    el.textContent = text;
    el.className = type; // "error" ou "success"
  }

  function clearMsg() {
    const el = document.getElementById("msg");
    el.textContent = "";
    el.className = "";
  }

  // ── 4. Envio do formulário ───────────────────────────────────────────────
  document.getElementById("btnSalvar").addEventListener("click", async function () {
    const btn         = this;
    const current     = document.getElementById("currentPassword").value.trim();
    const newPass     = document.getElementById("newPassword").value;
    const confirmPass = document.getElementById("confirmPassword").value;

    clearMsg();

    if (newPass.length < 6) {
      return showMsg("A nova senha deve ter pelo menos 6 caracteres.", "error");
    }
    if (newPass !== confirmPass) {
      return showMsg("A confirmação da senha não confere.", "error");
    }
    if (!isFirstLogin && !current) {
      return showMsg("Informe a senha atual.", "error");
    }

    const body = { newPassword: newPass };
    if (!isFirstLogin) body.currentPassword = current;

    btn.disabled = true;
    btn.textContent = "Salvando...";

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
        showMsg(data.message || "Senha alterada com sucesso!", "success");
        setTimeout(function () {
          window.location.href = "dashboard.html";
        }, 1500);
      } else {
        showMsg(data.error || "Erro ao alterar a senha.", "error");
        btn.disabled = false;
        btn.textContent = "Salvar Nova Senha";
      }
    } catch (err) {
      showMsg("Erro ao conectar com o servidor.", "error");
      btn.disabled = false;
      btn.textContent = "Salvar Nova Senha";
    }
  });

})();