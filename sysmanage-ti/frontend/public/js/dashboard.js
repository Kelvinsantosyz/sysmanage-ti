/* ========================   TEMA (antes do DOM para evitar flash)   ======================== */
(function() { if (localStorage.getItem('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); })();

/* ========================   AUTENTICAÇÃO & SESSÃO   ======================== */
const user = JSON.parse(localStorage.getItem("user"));
if (!user) {
    window.location.href = "login.html";
} else {
    const userNameEl = document.getElementById("userName");
    if (userNameEl) userNameEl.innerText = user.name;
    const avatarEl = document.getElementById("userAvatarInitial");
    if (avatarEl) avatarEl.innerText = user.name?.charAt(0).toUpperCase() || '?';
}

const isAdmin = user?.role === 'admin';
const isTecnico = user?.role === 'tecnico';
const canWrite = isAdmin || isTecnico;

/* ========================   NOTIFICAÇÕES (Toast + Confirm)   ======================== */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) { alert(message); return; }

    const colors = {
        success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', icon: '✅' },
        error:   { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '❌' },
        warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '⚠️' },
        info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: 'ℹ️' },
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
        display:flex; align-items:flex-start; gap:10px;
        background:${c.bg}; border:1px solid ${c.border}; color:${c.text};
        border-radius:12px; padding:14px 18px; max-width:320px; width:max-content;
        box-shadow:0 8px 24px rgba(0,0,0,0.12); pointer-events:all;
        font-family:'Inter',sans-serif; font-size:0.85rem; font-weight:500;
        animation:slideInToast 0.25s ease; line-height:1.4;
        transition:opacity 0.3s ease, transform 0.3s ease;
    `;
    toast.innerHTML = `<span style="font-size:1.1rem;flex-shrink:0;">${c.icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    // Injeta keyframe se não existir
    if (!document.getElementById('toastKeyframe')) {
        const style = document.createElement('style');
        style.id = 'toastKeyframe';
        style.textContent = `@keyframes slideInToast { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }`;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(30px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function showConfirm({ title, message, icon = '⚠️', confirmText = 'Confirmar', confirmColor = '#ef4444' } = {}, onConfirm) {
    const overlay = document.getElementById('customConfirmOverlay');
    if (!overlay) { if (confirm(message)) onConfirm(); return; }

    document.getElementById('customConfirmIcon').textContent  = icon;
    document.getElementById('customConfirmTitle').textContent = title || 'Confirmar ação';
    document.getElementById('customConfirmMsg').textContent   = message || '';
    document.getElementById('customConfirmOk').textContent    = confirmText;
    document.getElementById('customConfirmOk').style.background = confirmColor;

    overlay.style.display = 'flex';

    const close = () => { overlay.style.display = 'none'; };
    const okBtn = document.getElementById('customConfirmOk');
    const cancelBtn = document.getElementById('customConfirmCancel');

    const handleOk = () => { close(); onConfirm(); okBtn.removeEventListener('click', handleOk); cancelBtn.removeEventListener('click', handleCancel); };
    const handleCancel = () => { close(); okBtn.removeEventListener('click', handleOk); cancelBtn.removeEventListener('click', handleCancel); };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) handleCancel(); }, { once: true });
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
const views = ["resumo", "colaboradores", "maquinas", "inventario", "softwares", "relatorios", "setores", "usuarios"];

function showPanel(view) {
    document.querySelectorAll(".dashboard-panel").forEach(p => p.classList.add("d-none"));
    document.querySelector(`[data-panel="${view}"]`)?.classList.remove("d-none");
    
    document.querySelectorAll(".sidebar .nav-link").forEach(a => a.classList.remove("active"));
    document.querySelector(`[data-view="${view}"]`)?.classList.add("active");
    
    if (window.history?.replaceState) window.history.replaceState(null, "", `#${view}`);
    
    const panelTitles = {
        resumo: 'Visão Geral',
        colaboradores: 'Colaboradores',
        maquinas: 'Máquinas Físicas',
        inventario: 'Estoque / Inventário',
        softwares: 'Licenças & Softwares',
        setores: 'Gerenciar Setores',
        relatorios: 'Relatórios',
        usuarios: 'Gestão de Usuários'
    };
    const topbarTitle = document.getElementById('topbarTitle');
    if (topbarTitle && panelTitles[view]) topbarTitle.innerText = panelTitles[view];

    const loaders = {
        resumo: loadDashboard,
        colaboradores: loadColaboradores,
        maquinas: loadMaquinas,
        inventario: loadInventario,
        softwares: loadSoftwares,
        setores: loadSetoresAdmin,
        relatorios: loadRelatorios,
        usuarios: loadUsuarios
    };
    
    if (loaders[view]) loaders[view]();
}

function initNavigation() {
    document.querySelectorAll(".sidebar .nav-link").forEach(a => {
        // Só intercepta links com data-view (navegação interna do painel)
        if (!a.getAttribute("data-view")) return;
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
    const data = await apiGet('/api/dashboard/summary');
    if (!data) return;

    // Row 1
    const el = (id) => document.getElementById(id);
    if (el('totalMachines'))  el('totalMachines').innerText  = data.totalMachines  ?? 0;
    if (el('totalSoftwares')) el('totalSoftwares').innerText = data.totalSoftwares ?? 0;
    if (el('totalAtivos'))    el('totalAtivos').innerText    = data.ativos         ?? 0;
    if (el('totalInativos'))  el('totalInativos').innerText  = data.totalEstoque   ?? 0;

    // Row 2
    if (el('totalColabsAtivos')) el('totalColabsAtivos').innerText = data.colabsAtivos ?? 0;
    if (el('totalColabs'))       el('totalColabs').innerText       = data.totalColabs  ?? 0;
    if (el('totalSectors'))      el('totalSectors').innerText      = data.totalSectors ?? 0;
    if (el('totalUsers'))        el('totalUsers').innerText        = data.totalUsers   ?? 0;

    // Licenças vencendo em breve
    const tblExpiring = el('tblLicExpiring');
    if (tblExpiring) {
        tblExpiring.innerHTML = data.licExpiring?.length
            ? data.licExpiring.map(l => {
                const d = new Date(l.data_expiracao);
                const dias = Math.ceil((d - new Date()) / 86400000);
                return `<tr>
                    <td class="ps-4" style="font-weight:600;color:var(--text);">${l.nome}</td>
                    <td><span style="font-size:0.78rem;color:#b45309;font-weight:600;">${d.toLocaleDateString('pt-BR')} (${dias}d)</span></td>
                </tr>`;
            }).join('')
            : '<tr><td colspan="2" class="ps-4 text-muted" style="padding:14px;">Nenhuma licença vencendo em breve ✓</td></tr>';
    }

    // Licenças expiradas
    const tblExpired = el('tblLicExpired');
    if (tblExpired) {
        tblExpired.innerHTML = data.licExpired?.length
            ? data.licExpired.map(l => {
                const d = new Date(l.data_expiracao);
                return `<tr>
                    <td class="ps-4" style="font-weight:600;color:var(--text);">${l.nome}</td>
                    <td><span style="font-size:0.78rem;color:#dc2626;font-weight:600;">${d.toLocaleDateString('pt-BR')}</span></td>
                </tr>`;
            }).join('')
            : '<tr><td colspan="2" class="ps-4 text-muted" style="padding:14px;">Nenhuma licença expirada ✓</td></tr>';
    }

    // Gráfico de setores
    const ctx = el('chartSetores')?.getContext('2d');
    if (ctx && data.porSetor) {
        if (window._dashChart) window._dashChart.destroy();
        window._dashChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.porSetor.map(s => s.setor || 'Sem setor'),
                datasets: [{ data: data.porSetor.map(s => s.maquinas), backgroundColor: ['#6366f1','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#06b6d4','#f97316'] }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { color: '#64748b', font: { size: 11 }, boxWidth: 10, padding: 12 } } },
                cutout: '60%'
            }
        });
    }

    // Tabela por setor
    const tbody = el('resumoSetorTable');
    if (tbody) {
        tbody.innerHTML = data.porSetor?.map(s =>
            `<tr><td class="ps-4" style="font-weight:500;color:var(--text);">${s.setor || 'Sem setor'}</td><td class="text-end pe-4" style="font-weight:700;color:var(--primary);">${s.maquinas}</td></tr>`
        ).join('') || '<tr><td colspan="2" class="ps-4 text-muted" style="padding:14px;">Nenhum dado</td></tr>';
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
                    ${canWrite ? `<div class="btn-group shadow-sm">
                        <button class="btn btn-sm btn-outline-secondary" onclick="abrirModalSetor(${s.id}, '${s.nome}')">Editar</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="excluirSetor(${s.id})">Excluir</button>
                    </div>` : '<span class="text-muted small fst-italic">Somente leitura</span>'}
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
    if (!nome) { showToast("Digite um nome para o setor.", 'warning'); return; }
    
    try {
        if (id) await apiPut(`/api/setores/${id}`, { nome });
        else await apiPost("/api/setores", { nome });
        
        hideModal("modalSetor"); 
        await loadSetoresAdmin(); 
        await loadDropdowns();
        showToast("Setor salvo com sucesso!", 'success');
    } catch (e) { showToast("Erro ao salvar setor.", 'error'); }
}

async function excluirSetor(id) {
    showConfirm({ title: 'Excluir Setor', message: 'Tem certeza que deseja excluir este setor?', icon: '🗑️', confirmText: 'Excluir' }, async () => {
        try {
            await apiDelete(`/api/setores/${id}`);
            await loadSetoresAdmin(); 
            await loadDropdowns();
            showToast("Setor excluído.", 'success');
        } catch(e) { showToast("Erro ao excluir setor.", 'error'); }
    });
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
                    ${canWrite ? `<div class="btn-group shadow-sm">
                        <button class="btn btn-sm btn-outline-primary" onclick="abrirModalColab(${c.id})">Editar</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="excluirColab(${c.id})">Excluir</button>
                    </div>` : '<span class="text-muted small fst-italic">Somente leitura</span>'}
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
    if (!nome) { showToast("Preencha o Nome do colaborador.", 'warning'); return; }

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
        showToast("Colaborador salvo com sucesso!", 'success');
    } catch(err) { showToast("Erro ao salvar colaborador.", 'error'); }
}

async function excluirColab(id) {
    showConfirm({ title: 'Excluir Colaborador', message: 'Tem certeza que deseja excluir este colaborador?', icon: '👤', confirmText: 'Excluir' }, async () => {
        try {
            await apiDelete(`/api/colaboradores/${id}`);
            await loadColaboradores(); 
            await loadDropdowns();
            showToast("Colaborador excluído.", 'success');
        } catch(e) { showToast("Erro ao excluir colaborador.", 'error'); }
    });
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
    if (!nome) { showToast("Preencha o Nome do Equipamento.", 'warning'); return; }

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

        showToast("Ativo salvo com sucesso!", 'success');
    } catch (err) { showToast("Erro ao salvar ativo.", 'error'); }
}

async function excluirAsset(context, id) {
    showConfirm({ title: 'Excluir Ativo', message: 'Excluir permanentemente este ativo? Esta ação não pode ser desfeita.', icon: '💻', confirmText: 'Excluir' }, async () => {
        try {
            await apiDelete(`/api/assets/${id}`);
            if (context === "maquinas") loadMaquinas(); 
            else if (context === "softwares") loadSoftwares(); 
            else loadInventario();
            loadDashboard();
            showToast("Ativo excluído.", 'success');
        } catch(e) { showToast("Erro ao excluir ativo.", 'error'); }
    });
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
                ${canWrite ? `<div class="btn-group shadow-sm">
                    <button class="btn btn-sm btn-outline-primary" onclick="abrirModalAsset('${context}', ${a.id})">Editar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirAsset('${context}', ${a.id})">Excluir</button>
                </div>` : '<span class="text-muted small fst-italic">Somente leitura</span>'}
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
                        ${canWrite ? `<div class="btn-group shadow-sm">
                            <button class="btn btn-sm btn-outline-primary" onclick="abrirModalAsset('softwares', ${a.id})">Editar</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="excluirAsset('softwares', ${a.id})">Excluir</button>
                        </div>` : '<span class="text-muted small fst-italic">Somente leitura</span>'}
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
    if (rows.length === 0) { showToast("Nenhum dado para exportar.", 'warning'); return; }

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

/* ========================   GESTÃO DE USUÁRIOS (ADMIN)   ======================== */
async function loadUsuarios() {
    const rows = await apiGet("/api/users") || [];
    const tbody = document.getElementById("usuariosTable");
    if (!tbody) return;

    const roleBadge = (role) => {
        const map = {
            admin:   'bg-danger text-danger border-danger',
            tecnico: 'bg-primary text-primary border-primary',
            leitura: 'bg-secondary text-secondary border-secondary'
        };
        const cls = map[role] || map.leitura;
        return `<span class="badge ${cls} bg-opacity-10 border" style="font-weight:500;">${role}</span>`;
    };

    tbody.innerHTML = rows.map(u => {
        const isSelf = String(u.id) === String(user.id);
        return `
        <tr>
            <td class="ps-4">
                <div class="fw-bold text-dark">👤 ${u.name}</div>
                <div class="text-muted small">${u.email}</div>
            </td>
            <td>${roleBadge(u.role)}</td>
            <td>
                ${isSelf ? '<span class="text-muted small fst-italic">Sua conta</span>' : `
                <select class="form-select form-select-sm" style="width:130px;" onchange="alterarRoleUsuario(${u.id}, this.value)">
                    <option value="leitura" ${u.role==='leitura'?'selected':''}>Leitura</option>
                    <option value="tecnico" ${u.role==='tecnico'?'selected':''}>Técnico</option>
                    <option value="admin"   ${u.role==='admin'  ?'selected':''}>Admin</option>
                </select>`}
            </td>
            <td class="text-end pe-4">
                ${isSelf ? '<span class="text-muted small fst-italic">-</span>' : `
                <div class="btn-group shadow-sm">
                    <button class="btn btn-sm btn-outline-secondary" onclick="abrirResetSenha(${u.id}, '${u.name}')">🔑 Resetar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirUsuario(${u.id}, '${u.name}')">Excluir</button>
                </div>`}
            </td>
        </tr>`;
    }).join("");
}

async function alterarRoleUsuario(id, novoRole) {
    try {
        await apiPut(`/api/users/${id}/role`, { role: novoRole });
        await loadUsuarios();
        showToast("Papel do usuário atualizado.", 'success');
    } catch(e) {
        showToast("Erro ao alterar papel do usuário.", 'error');
        await loadUsuarios();
    }
}

function abrirResetSenha(id, nome) {
    document.getElementById('resetUserId').value = id;
    document.getElementById('resetUserLabel').textContent = `Redefinir senha de: ${nome}`;
    document.getElementById('resetUserPassword').value = '';
    document.getElementById('msgResetSenha').textContent = '';
    new bootstrap.Modal(document.getElementById('modalResetSenha')).show();
}

async function confirmarResetSenha() {
    const id  = document.getElementById('resetUserId').value;
    const pwd = document.getElementById('resetUserPassword').value;
    const msg = document.getElementById('msgResetSenha');
    msg.textContent = '';
    if (pwd.length < 6) { msg.textContent = 'A senha deve ter pelo menos 6 caracteres.'; return; }
    try {
        const data = await apiPut(`/api/users/${id}/reset-password`, { newPassword: pwd });
        bootstrap.Modal.getInstance(document.getElementById('modalResetSenha'))?.hide();
        showToast(data.message || 'Senha redefinida com sucesso!', 'success');
    } catch(e) {
        msg.textContent = e.message || 'Erro ao redefinir senha.';
    }
}

async function excluirUsuario(id, nome) {
    showConfirm({ title: 'Excluir Usuário', message: `Excluir o usuário "${nome}"? Esta ação não pode ser desfeita.`, icon: '⚠️', confirmText: 'Excluir' }, async () => {
        try {
            await apiDelete(`/api/users/${id}`);
            await loadUsuarios();
            showToast(`Usuário "${nome}" excluído.`, 'success');
        } catch(e) {
            showToast("Erro ao excluir usuário.", 'error');
        }
    });
}

function abrirModalNovoUsuario() {
    document.getElementById('newUserName').value     = '';
    document.getElementById('newUserEmail').value    = '';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('newUserRole').value     = 'leitura';
    document.getElementById('msgNovoUsuario').innerText = '';
    new bootstrap.Modal(document.getElementById('modalNovoUsuario')).show();
}

async function salvarNovoUsuario() {
    const msg  = document.getElementById('msgNovoUsuario');
    const name     = document.getElementById('newUserName').value.trim();
    const email    = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role     = document.getElementById('newUserRole').value;

    msg.innerText = '';
    if (!name || !email || !password) { msg.innerText = 'Preencha todos os campos obrigatórios.'; return; }
    if (password.length < 6) { msg.innerText = 'A senha deve ter pelo menos 6 caracteres.'; return; }

    try {
        await apiPost('/api/users', { name, email, password, role });
        bootstrap.Modal.getInstance(document.getElementById('modalNovoUsuario'))?.hide();
        await loadUsuarios();
    } catch(e) {
        msg.innerText = e.message || 'Erro ao criar usuário.';
    }
}

/* ========================   INICIALIZAÇÃO E EVENTOS GLOBAIS   ======================== */
document.addEventListener("DOMContentLoaded", async () => {
    // Exibe aba de Usuários apenas para admins
    if (isAdmin) {
        document.getElementById('linkUsuarios')?.classList.remove('d-none');
    }

    await loadDropdowns();
    initNavigation();
    
    document.getElementById("filtroSetorColab")?.addEventListener("change", loadColaboradores);
    document.getElementById("filtroStatusColab")?.addEventListener("change", loadColaboradores);
    document.getElementById("filtroSetorMaq")?.addEventListener("change", loadMaquinas);

    // Esconde botões de ação para usuários somente-leitura
    if (!canWrite) {
        ['btnNovoColab','btnNovaMaquina','btnNovoInventario','btnNovoSoftware','btnNovoSetor'].forEach(id => {
            document.getElementById(id)?.remove();
        });
    }

    // ============ THEME TOGGLE ============
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        // Aplica ícone correto conforme tema atual
        if (document.documentElement.getAttribute('data-theme') === 'dark') {
            themeToggleBtn.textContent = '☀️';
        } else {
            themeToggleBtn.textContent = '🌙';
        }

        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeToggleBtn.textContent = '🌙';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeToggleBtn.textContent = '☀️';
            }
        });
    }
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
window.loadUsuarios = loadUsuarios;
window.alterarRoleUsuario = alterarRoleUsuario;
window.excluirUsuario = excluirUsuario;
window.abrirModalNovoUsuario = abrirModalNovoUsuario;
window.salvarNovoUsuario = salvarNovoUsuario;
window.abrirResetSenha = abrirResetSenha;
window.confirmarResetSenha = confirmarResetSenha;