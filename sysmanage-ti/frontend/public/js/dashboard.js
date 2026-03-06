/* ========================   AUTENTICAÇÃO   ======================== */
var token = localStorage.getItem("token");
if (!token) { window.location.href = "login.html"; }
if (localStorage.getItem("mustChangePassword") === "1") {
  window.location.href = "change-password.html?first=1";
}
var user = JSON.parse(localStorage.getItem("user"));
if (user && document.getElementById("userName")) document.getElementById("userName").innerText = "Bem-vindo, " + user.name;

/* ========================   NAVEGAÇÃO   ======================== */
var views = ["resumo", "colaboradores", "maquinas", "inventario", "softwares", "relatorios"];
function showPanel(view) {
  document.querySelectorAll(".dashboard-panel").forEach(function (p) {
    p.classList.add("d-none");
    if (p.dataset.panel === view) p.classList.remove("d-none");
  });
  document.querySelectorAll(".sidebar .nav-link").forEach(function (a) {
    a.classList.remove("active");
    if (a.dataset.view === view) a.classList.add("active");
  });
  if (window.history && window.history.replaceState) window.history.replaceState(null, "", "#" + view);
  if (view === "colaboradores") loadColaboradores();
  if (view === "maquinas") loadMaquinas();
  if (view === "inventario") loadInventario();
  if (view === "softwares") loadSoftwares();
}
function initNavigation() {
  document.querySelectorAll(".sidebar .nav-link").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); var v = a.getAttribute("data-view"); if (v) showPanel(v); });
  });
  var hash = (window.location.hash || "#resumo").replace("#", "");
  showPanel(views.indexOf(hash) >= 0 ? hash : "resumo");
}

/* ========================   API HELPERS   ======================== */
function apiGet(url) {
  return fetch(url, { headers: { "Authorization": "Bearer " + token } }).then(function (r) {
    if (r.status === 401) { localStorage.clear(); window.location.href = "login.html"; throw new Error("Unauthorized"); }
    return r.json();
  });
}
function apiPost(url, body) {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify(body) }).then(function (r) {
    if (r.status === 401) { localStorage.clear(); window.location.href = "login.html"; throw new Error("Unauthorized"); }
    return r.json();
  });
}
function apiPut(url, body) {
  return fetch(url, { method: "PUT", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify(body) }).then(function (r) {
    if (r.status === 401) { localStorage.clear(); window.location.href = "login.html"; throw new Error("Unauthorized"); }
    return r.json();
  });
}
function apiDelete(url) {
  return fetch(url, { method: "DELETE", headers: { "Authorization": "Bearer " + token } }).then(function (r) {
    if (r.status === 401) { localStorage.clear(); window.location.href = "login.html"; throw new Error("Unauthorized"); }
    return r.json();
  });
}

/* ========================   SETORES (dropdowns)   ======================== */
var setoresList = [];
function loadSetores() {
  apiGet("/api/setores").then(function (arr) { setoresList = arr || []; }).catch(function () { setoresList = []; });
}
function fillSetorDropdown(selId) {
  var sel = document.getElementById(selId);
  if (!sel) return;
  var v = sel.value;
  sel.innerHTML = "<option value=\"\">Todos os setores</option>";
  setoresList.forEach(function (s) { sel.innerHTML += "<option value=\"" + s + "\">" + s + "</option>"; });
  sel.value = v || "";
}

/* ========================   DASHBOARD RESUMO   ======================== */
function renderResumo(data) {
  document.getElementById("totalMachines").innerText = data.totalMachines ?? 0;
  document.getElementById("totalSoftwares").innerText = data.totalSoftwares ?? 0;
  document.getElementById("totalAtivos").innerText = data.ativos ?? 0;
  document.getElementById("totalInativos").innerText = data.inativos ?? 0;
  var tbody = document.getElementById("resumoSetorTable");
  tbody.innerHTML = "";
  (data.porSetor || []).forEach(function (row) {
    tbody.innerHTML += "<tr><td>" + (row.setor || "-") + "</td><td>" + (row.colaboradores || 0) + "</td><td>" + (row.maquinas || 0) + "</td><td>" + (row.ativos || 0) + "</td><td>" + (row.inativos || 0) + "</td></tr>";
  });
  tbody = document.getElementById("ativosTable");
  tbody.innerHTML = "";
  (data.latestAssets || []).forEach(function (a) {
    var badge = a.status === "Ativo" ? "<span class=\"badge bg-success\">Ativo</span>" : "<span class=\"badge bg-secondary\">Inativo</span>";
    tbody.innerHTML += "<tr><td>" + (a.nome || "-") + "</td><td>" + (a.tipo || "-") + "</td><td>" + badge + "</td></tr>";
  });
}
function loadDashboard() {
  apiGet("/api/dashboard/summary").then(function (data) {
    renderResumo(data);
    loadSetores();
  }).catch(function () {
    renderResumo({ totalMachines: 0, totalSoftwares: 0, ativos: 0, inativos: 0, porSetor: [], latestAssets: [] });
    loadSetores();
  });
}

/* ========================   COLABORADORES CRUD   ======================== */
var modalColabEl = null;
function abrirModalColab(id) {
  document.getElementById("colabMsg").innerText = "";
  document.getElementById("modalColabTitulo").innerText = id ? "Editar colaborador" : "Novo colaborador";
  document.getElementById("colabId").value = id || "";
  if (id) {
    apiGet("/api/colaboradores/" + id).then(function (c) {
      document.getElementById("colabNome").value = c.nome || "";
      document.getElementById("colabFuncao").value = c.funcao || "";
      document.getElementById("colabTelefone").value = c.telefone || "";
      document.getElementById("colabCpf").value = c.cpf || "";
      document.getElementById("colabDataNasc").value = (c.data_nascimento || "").slice(0, 10);
      document.getElementById("colabSetor").value = c.setor || "";
      document.getElementById("colabStatus").value = c.status === "Inativo" ? "Inativo" : "Ativo";
      if (!modalColabEl) modalColabEl = new bootstrap.Modal(document.getElementById("modalColab"));
      modalColabEl.show();
    });
  } else {
    document.getElementById("colabNome").value = "";
    document.getElementById("colabFuncao").value = "";
    document.getElementById("colabTelefone").value = "";
    document.getElementById("colabCpf").value = "";
    document.getElementById("colabDataNasc").value = "";
    document.getElementById("colabSetor").value = "";
    document.getElementById("colabStatus").value = "Ativo";
    if (!modalColabEl) modalColabEl = new bootstrap.Modal(document.getElementById("modalColab"));
    modalColabEl.show();
  }
}
function salvarColab() {
  var id = document.getElementById("colabId").value;
  var nome = document.getElementById("colabNome").value.trim();
  var funcao = document.getElementById("colabFuncao").value.trim();
  var cpf = document.getElementById("colabCpf").value.trim().replace(/\D/g, "");
  var msgEl = document.getElementById("colabMsg");
  msgEl.innerText = "";
  if (!nome || !funcao || !cpf) { msgEl.innerText = "Nome, função e CPF são obrigatórios."; return; }
  if (cpf.length !== 11) { msgEl.innerText = "CPF deve ter 11 dígitos."; return; }
  var body = {
    nome: nome,
    funcao: funcao,
    telefone: document.getElementById("colabTelefone").value.trim() || null,
    cpf: cpf,
    data_nascimento: document.getElementById("colabDataNasc").value || null,
    setor: document.getElementById("colabSetor").value.trim() || "",
    status: document.getElementById("colabStatus").value
  };
  var p = id ? apiPut("/api/colaboradores/" + id, body) : apiPost("/api/colaboradores", body);
  p.then(function () {
    modalColabEl.hide();
    loadColaboradores();
    loadDashboard();
  }).catch(function (e) {
    msgEl.innerText = (e && e.message) || "Erro ao salvar.";
  });
}
function excluirColab(id, nome) {
  if (!confirm("Excluir colaborador \"" + nome + "\"?")) return;
  apiDelete("/api/colaboradores/" + id).then(function () { loadColaboradores(); loadDashboard(); }).catch(function () {});
}
function loadColaboradores() {
  var setor = document.getElementById("filtroSetorColab") && document.getElementById("filtroSetorColab").value;
  var status = document.getElementById("filtroStatusColab") && document.getElementById("filtroStatusColab").value;
  var q = [];
  if (setor) q.push("setor=" + encodeURIComponent(setor));
  if (status) q.push("status=" + encodeURIComponent(status));
  apiGet("/api/colaboradores" + (q.length ? "?" + q.join("&") : "")).then(function (rows) {
    fillSetorDropdown("filtroSetorColab");
    var tbody = document.getElementById("colaboradoresTable");
    var empty = document.getElementById("colabEmpty");
    tbody.innerHTML = "";
    if (!rows || rows.length === 0) { empty.classList.remove("d-none"); return; }
    empty.classList.add("d-none");
    rows.forEach(function (c) {
      var st = c.status === "Inativo" ? "<span class=\"badge bg-secondary\">Inativo</span>" : "<span class=\"badge bg-success\">Ativo</span>";
      var dataNasc = c.data_nascimento ? (c.data_nascimento + "").slice(0, 10) : "-";
      tbody.innerHTML += "<tr><td>" + (c.nome || "-") + "</td><td>" + (c.funcao || "-") + "</td><td>" + (c.telefone || "-") + "</td><td>" + (c.cpf || "-") + "</td><td>" + dataNasc + "</td><td>" + (c.setor || "-") + "</td><td>" + st + "</td><td><button class=\"btn btn-sm btn-outline-primary me-1\" onclick=\"abrirModalColab(" + c.id + ")\">Editar</button><button class=\"btn btn-sm btn-outline-danger\" onclick=\"excluirColab(" + c.id + ",'" + (c.nome || "").replace(/'/g, "\\'") + "')\">Excluir</button></td></tr>";
    });
  }).catch(function () {
    document.getElementById("colabEmpty").classList.remove("d-none");
    document.getElementById("colaboradoresTable").innerHTML = "";
  });
}

/* ========================   ASSETS (Máquinas / Inventário / Softwares) CRUD   ======================== */
var assetContext = "maquinas";
var modalAssetEl = null;
function abrirModalAsset(context, id) {
  assetContext = context || "maquinas";
  document.getElementById("assetMsg").innerText = "";
  document.getElementById("modalAssetTitulo").innerText = id ? "Editar ativo" : (context === "softwares" ? "Novo software" : context === "maquinas" ? "Nova máquina" : "Novo ativo");
  document.getElementById("assetId").value = id || "";
  var wrapTipo = document.getElementById("wrapAssetTipo");
  var wrapSetor = document.getElementById("wrapAssetSetor");
  if (context === "softwares") {
    wrapTipo.style.display = "none";
    document.getElementById("assetTipo").value = "Software";
  } else {
    wrapTipo.style.display = "block";
    wrapSetor.style.display = "block";
  }
  if (id) {
    apiGet("/api/assets/" + id).then(function (a) {
      document.getElementById("assetNome").value = a.nome || "";
      document.getElementById("assetTipo").value = a.tipo || "Desktop";
      document.getElementById("assetPatrimonio").value = a.patrimonio || "";
      document.getElementById("assetNumeroSerie").value = a.numero_serie || "";
      document.getElementById("assetSetor").value = a.setor || "";
      document.getElementById("assetStatus").value = a.status === "Inativo" ? "Inativo" : "Ativo";
      if (!modalAssetEl) modalAssetEl = new bootstrap.Modal(document.getElementById("modalAsset"));
      modalAssetEl.show();
    });
  } else {
    document.getElementById("assetNome").value = "";
    document.getElementById("assetTipo").value = context === "softwares" ? "Software" : "Desktop";
    document.getElementById("assetPatrimonio").value = "";
    document.getElementById("assetNumeroSerie").value = "";
    document.getElementById("assetSetor").value = "";
    document.getElementById("assetStatus").value = "Ativo";
    if (!modalAssetEl) modalAssetEl = new bootstrap.Modal(document.getElementById("modalAsset"));
    modalAssetEl.show();
  }
}
function salvarAsset() {
  var id = document.getElementById("assetId").value;
  var nome = document.getElementById("assetNome").value.trim();
  var tipo = document.getElementById("assetTipo").value;
  var msgEl = document.getElementById("assetMsg");
  msgEl.innerText = "";
  if (!nome) { msgEl.innerText = "Nome é obrigatório."; return; }
  var body = {
    name: nome,
    type: tipo,
    patrimonio: document.getElementById("assetPatrimonio").value.trim() || null,
    numero_serie: document.getElementById("assetNumeroSerie").value.trim() || null,
    setor: document.getElementById("assetSetor").value.trim() || null,
    status: document.getElementById("assetStatus").value
  };
  var p = id ? apiPut("/api/assets/" + id, body) : apiPost("/api/assets", body);
  p.then(function () {
    modalAssetEl.hide();
    if (assetContext === "maquinas") loadMaquinas();
    if (assetContext === "inventario") loadInventario();
    if (assetContext === "softwares") loadSoftwares();
    loadDashboard();
  }).catch(function (e) { msgEl.innerText = (e && e.message) || "Erro ao salvar."; });
}
function excluirAsset(id, nome) {
  if (!confirm("Excluir \"" + (nome || "ativo") + "\"?")) return;
  apiDelete("/api/assets/" + id).then(function () {
    if (assetContext === "maquinas") loadMaquinas();
    if (assetContext === "inventario") loadInventario();
    if (assetContext === "softwares") loadSoftwares();
    loadDashboard();
  }).catch(function () {});
}
function loadMaquinas() {
  var setorEl = document.getElementById("filtroSetorMaq");
  var statusEl = document.getElementById("filtroStatusMaq");
  var setor = setorEl && setorEl.value;
  var status = statusEl && statusEl.value;
  var q = [];
  if (setor) q.push("setor=" + encodeURIComponent(setor));
  if (status) q.push("status=" + encodeURIComponent(status));
  apiGet("/api/assets" + (q.length ? "?" + q.join("&") : "")).then(function (rows) {
    fillSetorDropdown("filtroSetorMaq");
    var list = (rows || []).filter(function (r) {
      var t = (r.tipo || "").toLowerCase();
      return t !== "software";
    });
    var tbody = document.getElementById("maquinasTable");
    var empty = document.getElementById("maquinasEmpty");
    tbody.innerHTML = "";
    if (list.length === 0) { empty.classList.remove("d-none"); return; }
    empty.classList.add("d-none");
    list.forEach(function (a) {
      var st = a.status === "Inativo" ? "<span class=\"badge bg-secondary\">Inativo</span>" : "<span class=\"badge bg-success\">Ativo</span>";
      tbody.innerHTML += "<tr><td>" + (a.nome || "-") + "</td><td>" + (a.tipo || "-") + "</td><td>" + (a.patrimonio || "-") + "</td><td>" + (a.numero_serie || "-") + "</td><td>" + (a.setor || "-") + "</td><td>" + st + "</td><td><button class=\"btn btn-sm btn-outline-primary me-1\" onclick=\"assetContext='maquinas';abrirModalAsset('maquinas'," + a.id + ")\">Editar</button><button class=\"btn btn-sm btn-outline-danger\" onclick=\"assetContext='maquinas';excluirAsset(" + a.id + ",'" + (a.nome || "").replace(/'/g, "\\'") + "')\">Excluir</button></td></tr>";
    });
  }).catch(function () {
    document.getElementById("maquinasEmpty").classList.remove("d-none");
    document.getElementById("maquinasTable").innerHTML = "";
  });
}
function loadInventario() {
  var status = document.getElementById("filtroStatusInv") && document.getElementById("filtroStatusInv").value;
  var q = status ? "?status=" + encodeURIComponent(status) : "";
  apiGet("/api/assets" + q).then(function (rows) {
    var tbody = document.getElementById("inventarioTable");
    var empty = document.getElementById("inventarioEmpty");
    tbody.innerHTML = "";
    if (!rows || rows.length === 0) { empty.classList.remove("d-none"); return; }
    empty.classList.add("d-none");
    rows.forEach(function (a) {
      var st = a.status === "Inativo" ? "<span class=\"badge bg-secondary\">Inativo</span>" : "<span class=\"badge bg-success\">Ativo</span>";
      tbody.innerHTML += "<tr><td>" + (a.nome || "-") + "</td><td>" + (a.tipo || "-") + "</td><td>" + (a.patrimonio || "-") + "</td><td>" + (a.numero_serie || "-") + "</td><td>" + (a.setor || "-") + "</td><td>" + st + "</td><td><button class=\"btn btn-sm btn-outline-primary me-1\" onclick=\"assetContext='inventario';abrirModalAsset('inventario'," + a.id + ")\">Editar</button><button class=\"btn btn-sm btn-outline-danger\" onclick=\"assetContext='inventario';excluirAsset(" + a.id + ",'" + (a.nome || "").replace(/'/g, "\\'") + "')\">Excluir</button></td></tr>";
    });
  }).catch(function () {
    document.getElementById("inventarioEmpty").classList.remove("d-none");
    document.getElementById("inventarioTable").innerHTML = "";
  });
}
function loadSoftwares() {
  var status = document.getElementById("filtroStatusSoft") && document.getElementById("filtroStatusSoft").value;
  apiGet("/api/assets?tipo=Software" + (status ? "&status=" + encodeURIComponent(status) : "")).then(function (rows) {
    var tbody = document.getElementById("softwaresTable");
    var empty = document.getElementById("softwaresEmpty");
    tbody.innerHTML = "";
    if (!rows || rows.length === 0) { empty.classList.remove("d-none"); return; }
    empty.classList.add("d-none");
    rows.forEach(function (a) {
      var st = a.status === "Inativo" ? "<span class=\"badge bg-secondary\">Inativo</span>" : "<span class=\"badge bg-success\">Ativo</span>";
      tbody.innerHTML += "<tr><td>" + (a.nome || "-") + "</td><td>" + (a.patrimonio || "-") + "</td><td>" + (a.numero_serie || "-") + "</td><td>" + st + "</td><td><button class=\"btn btn-sm btn-outline-primary me-1\" onclick=\"assetContext='softwares';abrirModalAsset('softwares'," + a.id + ")\">Editar</button><button class=\"btn btn-sm btn-outline-danger\" onclick=\"assetContext='softwares';excluirAsset(" + a.id + ",'" + (a.nome || "").replace(/'/g, "\\'") + "')\">Excluir</button></td></tr>";
    });
  }).catch(function () {
    document.getElementById("softwaresEmpty").classList.remove("d-none");
    document.getElementById("softwaresTable").innerHTML = "";
  });
}

/* Filtros: recarregar ao mudar */
document.addEventListener("DOMContentLoaded", function () {
  initNavigation();
  loadDashboard();
  document.getElementById("filtroSetorColab") && document.getElementById("filtroSetorColab").addEventListener("change", loadColaboradores);
  document.getElementById("filtroStatusColab") && document.getElementById("filtroStatusColab").addEventListener("change", loadColaboradores);
  document.getElementById("filtroSetorMaq") && document.getElementById("filtroSetorMaq").addEventListener("change", loadMaquinas);
  document.getElementById("filtroStatusMaq") && document.getElementById("filtroStatusMaq").addEventListener("change", loadMaquinas);
  document.getElementById("filtroStatusInv") && document.getElementById("filtroStatusInv").addEventListener("change", loadInventario);
  document.getElementById("filtroStatusSoft") && document.getElementById("filtroStatusSoft").addEventListener("change", loadSoftwares);
});

function logout() { localStorage.clear(); window.location.href = "login.html"; }
