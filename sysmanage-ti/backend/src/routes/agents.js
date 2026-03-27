require('dotenv').config();
const si = require('systeminformation');
const os = require('os');
const axios = require('axios');

// Centraliza as configurações vindo do ambiente
const CONFIG = {
    baseUrl: process.env.SERVER_URL,
    token: process.env.AGENT_TOKEN,
    interval: parseInt(process.env.INTERVAL_MS) || 60000
};

// Instância do Axios pré-configurada
const api = axios.create({
    baseURL: CONFIG.baseUrl,
    timeout: 10000,
    headers: { 'x-agent-token': CONFIG.token }
});

async function run() {
    try {
        console.log("Iniciando coleta de inventário...");

        const [cpu, ram, osInfo, apps] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.osInfo(),
            si.apps()
        ]);

        const hostname = os.hostname();
        const ip = Object.values(os.networkInterfaces())
            .flat()
            .find(i => i.family === "IPv4" && !i.internal)?.address;

        // Registro da máquina
        const register = await api.post("/api/agent/register", {
            hostname,
            os: osInfo.distro,
            cpu: cpu.brand,
            ram: `${Math.round(ram.total / 1024 / 1024 / 1024)} GB`,
            ip
        });

        const asset_id = register.data.asset_id;

        
        const software = apps.list.map(a => ({
            name: a.name,
            version: a.version,
            publisher: a.publisher
        }));

        // Envio do inventário de software
        await api.post("/api/agent/software", { asset_id, software });

        console.log(`[${new Date().toISOString()}] Inventário enviado com sucesso para Asset ID: ${asset_id}`);

    } catch (error) {
        // Log de erro genérico 
        console.error("Erro ao processar inventário. Verifique a conexão com o servidor.");
        
    }
}


setInterval(run, CONFIG.interval);
run();