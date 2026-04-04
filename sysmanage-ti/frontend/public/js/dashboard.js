/* ========================   AUTENTICAÇÃO & SESSÃO   ======================== */
const user = JSON.parse(localStorage.getItem("user"));
if (!user) {
    window.location.href = "login.html";
} else {
    const userNameEl = document.getElementById("userName");
    if (userNameEl) userNameEl.innerText = `Olá, ${user.name}`;
}

/* ========================   VARIÁVEIS GLOBAIS   ======================== */
let globColabs = [];
let myChart = null;
let assetContext = "maquinas";

/* ========================   HELPERS (BLINDAGEM CONTRA ERROS)   ======================== */
const setVal = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
};

const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : "";
};

const showModal = (modalId) => {
    const el = document.getElementById(modalId);
    if (!el) return;
    let modal = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
    modal.show();
};

const hideModal = (modalId) => {
    const el = document.getElementById(modalId);
    if (!el) return;
    const modal = bootstrap.Modal.getInstance(el);
    if (modal) modal.hide();
};

/* ========================   API HELPERS (ANTI-QUEBRA)   ======================== */
async function apiGet(url) {
    try {
        const cacheBuster = `_t=${new Date().getTime()}`;
        const finalUrl = url.includes("?") ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
        
        const response = await fetch(finalUrl, {
            credentials: "include",
            cache: "no-store", 
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.status === 401) return logout();
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (error) {
        console.error(`Erro ao buscar dados de ${url}:`, error);
        return url.includes('summary') ? {} : [];
    }
}

async function apiRequest(url, method, body = null) {
    try {
        const options = {
            method,
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(url, options);
        if (response.status === 401) return logout();
        
        const text = await response.text();
        if (!response.ok) {
            throw new Error(text || `Erro HTTP: ${response.status}`);
        }
        
        try {
            return text ? JSON.parse(text) : {};
        } catch(e) {
            return {}; 
        }
    } catch (err) {
        console.error(`Erro na operação ${method} ${url}:`, err);
        throw err;
    }
}

const apiPost = (url, body) => apiRequest(url, "POST", body);
const apiPut = (url, body) => apiRequest(url, "PUT", body);
const apiDelete = (url) => apiRequest(url, "DELETE");

/* ========================   NAVEGAÇÃO   ======================== */
const views = ["resumo", "colaboradores", "maquinas", "inventario", "softwares", "relatorios", "setores"];

function showPanel(view) {
    document.querySelectorAll(".dashboard-panel").forEach(p => p.classList.add("d-none"));
    document.querySelector(`[data-panel="${view}"]`)?.classList.remove("d-none");
    
    document.querySelectorAll(".sidebar .nav-link").forEach(a => a.classList.remove("active"));
    document.querySelector(`[data-view="${view}"]`)?.classList.add("active");
    
    if (window.history?.replaceState) window.history.replaceState(null, "", `#${view}`);
    
    const loaders = {
        resumo: loadDashboard,
        colaboradores: loadColaboradores,
        maquinas: loadMaquinas,
        inventario: loadInventario,
        softwares: loadSoftwares,
        setores: loadSetoresAdmin,
        relatorios: loadRelatorios
    };
    
    if (loaders[view]) loaders[view]();
}

function initNavigation() {
    document.querySelectorAll(".sidebar .nav-link").forEach(a => {
        a.addEventListener("click", (e) => {
            e.preventDefault();
            showPanel(a.getAttribute("data-view"));
        });
    });
    
    const hash = (window.location.hash || "#resumo").replace("#", "");
    showPanel(views.includes(hash) ? hash : "resumo");
}

/* ========================   CARREGAMENTO DE SELECTS   ======================== */
async function loadDropdowns() {
    const arrSetores = await apiGet("/api/setores") || [];
    const optionsSetores = '<option value="">Sem localização...</option>' + 
        arrSetores.map(s => `<option value="${s.nome}">${s.nome}</option>`).join(""); 
    const filterSetores = '<option value="">Todos os setores</option>' + 
        arrSetores.map(s => `<option value="${s.nome}">${s.nome}</option>`).join("");
    
    const elements = {
        filtroSetorColab: filterSetores,
        filtroSetorMaq: filterSetores,
        colabSetor: optionsSetores,
        assetSetor: optionsSetores
    };

    for (const [id, html] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }

    globColabs = await apiGet("/api/colaboradores") || [];
    const colabOptions = '<option value="">Nenhum (Não alocado)</option>' + 
        globColabs.filter(c => c.status === 'Ativo').map(c => `<option value="${c.id}">${c.nome}</option>`).join(""); 
    
    const assetColabEl = document.getElementById("assetColaborador");
    if (assetColabEl) assetColabEl.innerHTML = colabOptions;
}

/* ========================   DASHBOARD   ======================== */
async function loadDashboard() {
    const data = await apiGet("/api/dashboard/summary");
    
    if(document.getElementById("totalMachines")) document.getElementById("totalMachines").innerText = data?.totalMachines ?? 0;
    if(document.getElementById("totalSoftwares")) document.getElementById("totalSoftwares").innerText = data?.totalSoftwares ?? 0;
    if(document.getElementById("totalAtivos")) document.getElementById("totalAtivos").innerText = data?.ativos ?? 0;
    if(document.getElementById("totalInativos")) document.getElementById("totalInativos").innerText = data?.inativos ?? 0;

    const tbody = document.getElementById("resumoSetorTable");
    let setoresLabels = []; 
    let setoresData = [];
    
    if (tbody) {
        tbody.innerHTML = (data?.porSetor || []).map(row => {
            setoresLabels.push(row.setor || "Sem Setor");
            setoresData.push(row.maquinas || 0);
            return `<tr><td class="ps-4 text-dark fw-semibold">${row.setor || "-"}</td><td class="text-end pe-4"><span class="badge bg-light text-dark border px-3 rounded-pill">${row.maquinas || 0}</span></td></tr>`;
        }).join("");
    }

    const ctx = document.getElementById('chartSetores');
    if (ctx && window.Chart) {
        if (myChart) myChart.destroy(); 
        myChart = new Chart(ctx, { 
            type: 'doughnut', 
            data: { 
                labels: setoresLabels, 
                datasets: [{ data: setoresData, backgroundColor: ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0', '#6c757d'] }] 
            }, 
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } } 
        });
    }
}

/* ========================   SETORES CRUD   ======================== */
async function loadSetoresAdmin() {
    const rows = await apiGet("/api/setores") || [];
    const tbody = document.getElementById("setoresAdminTable");
    if (tbody) {
        tbody.innerHTML = rows.map(s => `
            <tr>
                <td class="ps-4 text-muted fw-bold small">#${s.id}</td>
                <td><span class="fw-semibold text-dark">🏢 ${s.nome}</span></td>
                <td class="text-end pe-4">
                    <div class="btn-group shadow-sm">
                        <button class="btn btn-sm btn-outline-secondary" onclick="abrirModalSetor(${s.id}, '${s.nome}')">Editar</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="excluirSetor(${s.id})">Excluir</button>
                    </div>
                </td>
            </tr>
        `).join("");
    }
}

function abrirModalSetor(id, nome) {
    const titulo = document.getElementById("modalSetorTitulo");
    if (titulo) titulo.innerText = id ? "Editar Setor" : "Novo Setor";
    setVal("setorId", id || ""); 
    setVal("setorNome", nome || "");
    showModal("modalSetor");
}

async function salvarSetor() {
    const id = getVal("setorId"); 
    const nome = getVal("setorNome").trim();
    if (!nome) return alert("Por favor, digite um nome para o setor.");
    
    try {
        if (id) await apiPut(`/api/setores/${id}`, { nome });
        else await apiPost("/api/setores", { nome });
        
        hideModal("modalSetor"); 
        await loadSetoresAdmin(); 
        await loadDropdowns(); 
    } catch (e) { alert("Erro ao salvar setor. Verifique o console."); }
}

async function excluirSetor(id) {
    if (confirm("Tem certeza que deseja excluir este setor?")) { 
        try {
            await apiDelete(`/api/setores/${id}`);
            await loadSetoresAdmin(); 
            await loadDropdowns();
        } catch(e) { alert("Erro ao excluir setor."); }
    }
}

/* ========================   COLABORADORES CRUD   ======================== */
async function loadColaboradores() {
    const s = getVal("filtroSetorColab"); 
    const st = getVal("filtroStatusColab");
    const rows = await apiGet(`/api/colaboradores?setor=${s}&status=${st}`) || [];
    
    const tbody = document.getElementById("colaboradoresTable");
    if (tbody) {
        tbody.innerHTML = rows.map(c => {
            const statusClass = c.status === 'Ativo' ? 'bg-success text-success border-success' : 'bg-secondary text-secondary border-secondary';
            const badgeHTML = `<span class="badge ${statusClass} bg-opacity-10 border" style="font-weight: 500;">${c.status}</span>`;

            return `
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-dark" style="font-size: 0.95rem;">👤 ${c.nome}</div>
                    <div class="text-muted small">${c.funcao || 'Sem função definida'}</div>
                </td>
                <td>
                    <div class="text-dark">${c.telefone || '-'}</div>
                    <div class="text-muted small">CPF: ${c.cpf || '-'}</div>
                </td>
                <td class="text-secondary">${c.setor || '-'}</td>
                <td>${badgeHTML}</td>
                <td class="text-end pe-4">
                    <div class="btn-group shadow-sm">
                        <button class="btn btn-sm btn-outline-primary" onclick="abrirModalColab(${c.id})">Editar</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="excluirColab(${c.id})">Excluir</button>
                    </div>
                </td>
            </tr>`;
        }).join("");
    }
}

async function abrirModalColab(id) {
    await loadDropdowns(); 
    const titulo = document.getElementById("modalColabTitulo");
    if(titulo) titulo.innerText = id ? "Editar Colaborador" : "Novo Colaborador";
    
    if (id) {
        const c = await apiGet(`/api/colaboradores/${id}`);
        if(!c) return; 
        setVal("colabId", c.id);
        setVal("colabNome", c.nome || "");
        setVal("colabFuncao", c.funcao || "");
        setVal("colabTelefone", c.telefone || "");
        setVal("colabCpf", c.cpf || "");
        setVal("colabDataNasc", c.data_nascimento ? c.data_nascimento.slice(0, 10) : "");
        setVal("colabSetor", c.setor || "");
        setVal("colabStatus", c.status || "Ativo");
    } else { 
        ["colabId", "colabNome", "colabFuncao", "colabTelefone", "colabCpf", "colabDataNasc", "colabSetor"].forEach(f => setVal(f, ""));
        setVal("colabStatus", "Ativo");
    }
    showModal("modalColab");
}

async function salvarColab() {
    const nome = getVal("colabNome").trim();
    if (!nome) return alert("Preencha o Nome do colaborador.");

    const id = getVal("colabId");
    const body = { 
        nome, 
        funcao: getVal("colabFuncao") || null, 
        cpf: getVal("colabCpf") || null, 
        telefone: getVal("colabTelefone") || null, 
        data_nascimento: getVal("colabDataNasc") || null, 
        setor: getVal("colabSetor") || null, 
        status: getVal("colabStatus") 
    };
    
    try {
        if(id) await apiPut(`/api/colaboradores/${id}`, body);
        else await apiPost("/api/colaboradores", body);
        
        hideModal("modalColab"); 
        await loadColaboradores(); 
        await loadDropdowns(); 
    } catch(err) { alert("Erro ao salvar colaborador."); }
}

async function excluirColab(id) {
    if (confirm("Excluir este colaborador?")) { 
        try {
            await apiDelete(`/api/colaboradores/${id}`);
            await loadColaboradores(); 
            await loadDropdowns();
        } catch(e) { alert("Erro ao excluir colaborador."); }
    }
}

/* ========================   ASSETS (HARDWARE E SOFTWARE)   ======================== */
function toggleAssetFields() {
    const tipo = getVal("assetTipo");
    const hdw = document.getElementById("hardwareFields");
    const sfw = document.getElementById("softwareFields");

    if (tipo === "Software") {
        hdw?.classList.add("d-none");
        sfw?.classList.remove("d-none");
    } else {
        hdw?.classList.remove("d-none");
        sfw?.classList.add("d-none");
    }
}

async function abrirModalAsset(context, id) {
    assetContext = context;
    await loadDropdowns(); 
    
    const titulo = document.getElementById("modalAssetTitulo");
    if(titulo) titulo.innerText = id ? "Editar Ativo" : (context === 'softwares' ? "Novo Software" : "Novo Ativo");
    
    if (id) {
        const a = await apiGet(`/api/assets/${id}`);
        if(!a) return;
        
        setVal("assetId", a.id);
        setVal("assetNome", a.nome || "");
        setVal("assetTipo", a.type || "");
        setVal("assetPatrimonio", a.patrimonio || "");
        setVal("assetNumeroSerie", a.numero_serie || "");
        setVal("assetFabricante", a.fabricante || "");
        setVal("assetVersao", a.versao || "");
        setVal("assetChave", a.chave_licenca || "");
        setVal("assetExpiracao", a.data_expiracao ? a.data_expiracao.slice(0, 10) : "");
        setVal("assetStatus", a.status || "Ativo");
        setVal("assetSetor", a.setor || "");
        
        setVal("assetColaborador", a.colaborador_id || "");
    } else {
        ["assetId", "assetNome", "assetPatrimonio", "assetNumeroSerie", "assetFabricante", "assetVersao", "assetChave", "assetExpiracao", "assetSetor", "assetColaborador"].forEach(f => setVal(f, ""));
        setVal("assetStatus", context === "inventario" ? "Estoque" : "Ativo");
        setVal("assetTipo", context === "softwares" ? "Software" : "Desktop");
    }
    
    toggleAssetFields(); 
    showModal("modalAsset");
}

async function salvarAsset() {
    const nome = getVal("assetNome").trim();
    if (!nome) return alert("Preencha o Nome do Equipamento.");

    const id = getVal("assetId");
    const selectColab = document.getElementById("assetColaborador");
    const colabIdRaw = selectColab.value; 
    const colabIdParsed = colabIdRaw ? Number(colabIdRaw) : null;

    const body = {
        nome: nome, 
        type: getVal("assetTipo") || null,
        patrimonio: getVal("assetPatrimonio") || null,
        numero_serie: getVal("assetNumeroSerie") || null,
        fabricante: getVal("assetFabricante") || null,
        versao: getVal("assetVersao") || null,
        chave_licenca: getVal("assetChave") || null,
        data_expiracao: getVal("assetExpiracao") || null, 
        status: getVal("assetStatus") || "Ativo",
        setor: getVal("assetSetor") || null,
        colaborador_id: colabIdParsed 
    };
    
    try {
        if (id) await apiPut(`/api/assets/${id}`, body);
        else await apiPost("/api/assets", body);
        
        hideModal("modalAsset"); 
        
        setTimeout(async () => {
            if (assetContext === "maquinas") await loadMaquinas();
            else if (assetContext === "softwares") await loadSoftwares();
            else await loadInventario();
            loadDashboard(); 
        }, 300);

    } catch (err) { alert("Erro ao atribuir o ativo."); }
}

async function excluirAsset(context, id) {
    if (confirm("Excluir permanentemente este ativo?")) {
        try {
            await apiDelete(`/api/assets/${id}`);
            if (context === "maquinas") loadMaquinas(); 
            else if (context === "softwares") loadSoftwares(); 
            else loadInventario();
            loadDashboard();
        } catch(e) { alert("Erro ao excluir ativo."); }
    }
}

/* ========================   RENDERIZADORES DE TABELA   ======================== */
async function loadMaquinas() {
    const setorFiltro = getVal("filtroSetorMaq");
    const rows = await apiGet("/api/assets") || [];
    const tbody = document.getElementById("maquinasTable");
    let maquinas = rows.filter(a => a.type !== 'Software' && a.status === 'Ativo');
    
    if(setorFiltro) maquinas = maquinas.filter(m => m.setor === setorFiltro);
    renderAssetTable(tbody, maquinas, 'maquinas');
}

async function loadInventario() {
    const rows = await apiGet("/api/assets") || [];
    const tbody = document.getElementById("inventarioTable");
    const inventario = rows.filter(a => a.type !== 'Software' && a.status !== 'Ativo');
    renderAssetTable(tbody, inventario, 'inventario');
}

function renderAssetTable(tbody, data, context) {
    if(!tbody) return;
    tbody.innerHTML = data.map(a => {
        let nomeResp = null;
        const idBanco = a.colaborador_id;
        
        if (idBanco && globColabs.length > 0) {
            const dono = globColabs.find(c => String(c.id) === String(idBanco));
            if (dono) nomeResp = dono.nome; 
        }

        const isEstoque = a.status === 'Estoque';
        const badgeClass = a.status === 'Ativo' ? 'bg-success text-success border-success' 
                         : (isEstoque ? 'bg-warning text-warning border-warning' : 'bg-secondary text-secondary border-secondary');
        const badgeHTML = `<span class="badge ${badgeClass} bg-opacity-10 border" style="font-weight: 500;">${a.status || '-'}</span>`;

        let icone = '💻';
        if(a.type === 'Servidor') icone = '🗄️';
        if(a.type === 'Notebook') icone = '💼';
        if(a.type === 'Outro') icone = '🖱️';

        return `
        <tr>
            <td class="ps-4">
                <div class="fw-bold text-dark" style="font-size: 0.95rem;">${icone} ${a.nome || '-'}</div>
                <div class="text-muted small">${a.type || '-'}</div>
            </td>
            <td>${nomeResp ? `<span class="fw-semibold text-primary">👤 ${nomeResp}</span>` : '<span class="text-muted fst-italic">Não alocado</span>'}</td>
            <td>
                <div class="text-dark">Pat: ${a.patrimonio || '-'}</div>
                <div class="text-muted small">SN: ${a.numero_serie || '-'}</div>
            </td>
            <td class="text-secondary">${a.setor || '-'}</td>
            <td>${badgeHTML}</td>
            <td class="text-end pe-4">
                <div class="btn-group shadow-sm">
                    <button class="btn btn-sm btn-outline-primary" onclick="abrirModalAsset('${context}', ${a.id})">Editar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirAsset('${context}', ${a.id})">Excluir</button>
                </div>
            </td>
        </tr>`
    }).join("");
}

async function loadSoftwares() {
    const rows = await apiGet("/api/assets?type=Software") || [];
    const tbody = document.getElementById("softwaresTable");
    const softwares = rows.filter(a => a.type === 'Software');
    
    if (tbody) {
        tbody.innerHTML = softwares.map(a => {
            let dataBR = "<span class='text-muted small'>Vitalício / S. Data</span>";
            let isExpired = false;

            if (a.data_expiracao) { 
                const d = new Date(a.data_expiracao); 
                const hoje = new Date();
                hoje.setHours(0,0,0,0);
                dataBR = d.toLocaleDateString('pt-BR'); 

                if (d < hoje) {
                    dataBR = `<span class="text-danger fw-bold">⚠ Vencido (${dataBR})</span>`;
                    isExpired = true;
                } else {
                    dataBR = `<span class="text-dark">${dataBR}</span>`;
                }
            }

            const statusClass = a.status === 'Ativo' && !isExpired ? 'bg-success text-success border-success' : (isExpired ? 'bg-danger text-danger border-danger' : 'bg-secondary text-secondary border-secondary');
            const badgeHTML = `<span class="badge ${statusClass} bg-opacity-10 border" style="font-weight: 500;">${isExpired ? 'Expirado' : (a.status || '-')}</span>`;

            return `
                <tr>
                    <td class="ps-4">
                        <div class="fw-bold text-dark" style="font-size: 0.95rem;">💿 ${a.nome || '-'}</div>
                        <div class="text-muted small">${a.fabricante || 'Desconhecido'} ${a.versao ? `• v. ${a.versao}` : ''}</div>
                    </td>
                    <td><code class="bg-light text-dark px-2 py-1 rounded border shadow-sm">${a.chave_licenca || 'N/A'}</code></td>
                    <td>${dataBR}</td>
                    <td>${badgeHTML}</td>
                    <td class="text-end pe-4">
                        <div class="btn-group shadow-sm">
                            <button class="btn btn-sm btn-outline-primary" onclick="abrirModalAsset('softwares', ${a.id})">Editar</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="excluirAsset('softwares', ${a.id})">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        }).join("");
    }
}

async function loadRelatorios() {
    const rows = await apiGet("/api/assets") || [];
    const tbody = document.getElementById("tabelaPreviewRelatorio");
    if (tbody) {
        tbody.innerHTML = rows.map(a => {
            const identificador = a.type === 'Software' ? (a.chave_licenca || 'Sem Chave') : (a.patrimonio || 'Sem Patrimônio');
            let icone = '💻';
            if(a.type === 'Servidor') icone = '🗄️';
            if(a.type === 'Notebook') icone = '💼';
            if(a.type === 'Software') icone = '💿';
            if(a.type === 'Outro') icone = '🖱️';
            
            let dotColor = 'bg-secondary';
            if(a.status === 'Ativo') dotColor = 'bg-success';
            if(a.status === 'Estoque') dotColor = 'bg-warning';

            return `
            <tr>
                <td class="ps-4 text-muted fw-bold">#${a.id}</td>
                <td>
                    <div class="fw-semibold text-dark">${icone} ${a.nome}</div>
                    <div class="text-muted" style="font-size: 0.8rem;">${identificador}</div>
                </td>
                <td><span class="badge bg-light text-secondary border px-2">${a.type}</span></td>
                <td class="text-secondary">${a.setor || '-'}</td>
                <td>
                    <span class="d-inline-flex align-items-center px-2 py-1 rounded-pill bg-light border" style="font-size: 0.8rem;">
                        <span class="rounded-circle ${dotColor} me-2" style="width: 8px; height: 8px;"></span>
                        ${a.status}
                    </span>
                </td>
            </tr>`;
        }).join("");
    }
}

/* ========================   EXPORTAÇÃO   ======================== */
async function baixarRelatorioCSV() {
    const rows = await apiGet("/api/assets") || [];
    if (rows.length === 0) return alert("Nenhum dado para exportar.");

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "ID;Nome;Tipo;Fabricante;Versao;Chave de Licenca;Expiracao;Patrimonio;Numero de Serie;Setor;Status\n";
    
    rows.forEach(r => {
        const dataExp = r.data_expiracao ? r.data_expiracao.split('T')[0] : '';
        const rowArray = [r.id, r.nome, r.type, r.fabricante||'', r.versao||'', r.chave_licenca||'', dataExp, r.patrimonio||'', r.numero_serie||'', r.setor||'', r.status];
        const row = rowArray.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";");
        csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_ativos_sysmanage.csv");
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
}

async function logout() {
    try { await fetch("/api/logout", { method: "POST", credentials: "include" }); } catch(e) {}
    localStorage.clear(); 
    window.location.href = "login.html";
}

/* ========================   INICIALIZAÇÃO E EVENTOS GLOBAIS   ======================== */
document.addEventListener("DOMContentLoaded", async () => {
    await loadDropdowns();
    initNavigation();
    
    document.getElementById("filtroSetorColab")?.addEventListener("change", loadColaboradores);
    document.getElementById("filtroStatusColab")?.addEventListener("change", loadColaboradores);
    document.getElementById("filtroSetorMaq")?.addEventListener("change", loadMaquinas);
});

window.toggleAssetFields = toggleAssetFields; 
window.abrirModalAsset = abrirModalAsset; 
window.salvarAsset = salvarAsset; 
window.excluirAsset = excluirAsset;

window.abrirModalColab = abrirModalColab;
window.salvarColab = salvarColab;
window.excluirColab = excluirColab;

window.abrirModalSetor = abrirModalSetor;
window.salvarSetor = salvarSetor;
window.excluirSetor = excluirSetor;

window.baixarRelatorioCSV = baixarRelatorioCSV;
window.logout = logout;