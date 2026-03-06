# SysManage TI

Sistema de gestão de chamados e inventário de TI — cadastro de usuários, colaboradores, ativos (máquinas, softwares), controle por setor e dashboard.

## Tecnologias

| Camada        | Stack                    |
|---------------|--------------------------|
| Backend       | Node.js, Express, MySQL  |
| Frontend      | HTML, CSS, JavaScript (Bootstrap) |
| Agent (métricas) | Go (gopsutil)        |

## Pré-requisitos

- **Node.js** 18+ (LTS recomendado)
- **MySQL** 8.x ou 5.7
- **Go** 1.19+ (apenas para compilar o agent)

## Início rápido

### 1. Banco de dados

Crie o banco e o usuário no MySQL:

```sql
CREATE DATABASE sysmanage_ti CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sysmanage'@'localhost' IDENTIFIED BY 'sua_senha';
GRANT ALL ON sysmanage_ti.* TO 'sysmanage'@'localhost';
FLUSH PRIVILEGES;
```

Execute os scripts em `sysmanage-ti/backend/sql/` na ordem (tabelas e colunas opcionais). Veja [docs/AMBIENTE.md](docs/AMBIENTE.md).

### 2. Backend

```bash
cd sysmanage-ti/backend
cp .env.example .env   # ou crie .env com as variáveis abaixo
npm install
npm run dev
```

Servidor em `http://localhost:3000`.

### 3. Frontend

O frontend é servido pelo backend (pasta `sysmanage-ti/frontend/public`). Após subir o backend, acesse:

- `http://localhost:3000` — login
- `http://localhost:3000/register.html` — cadastro
- Após login: dashboard, colaboradores, máquinas, inventário, softwares.

### 4. Agent (opcional)

Para coletar métricas das máquinas (CPU, RAM, etc.) e enviar ao backend:

```bash
cd sysmanage-ti/agent
go build -o agent agent.go
# Windows PowerShell:
$env:AGENT_SERVER_URL="http://localhost:3000/api/agent/metrics"
.\agent.exe
```

## Estrutura do projeto

```
Projeto/
├── sysmanage-ti/
│   ├── backend/          # API Node.js (Express + MySQL)
│   │   ├── server.js     # Entrada da API
│   │   └── sql/          # Scripts de criação/alteracao do banco
│   ├── frontend/         # Interface web
│   │   └── public/       # HTML, CSS, JS (servidos pelo backend)
│   └── agent/            # Coletor de métricas em Go
├── docs/                 # Documentação para desenvolvedores
└── README.md
```

## Documentação para desenvolvedores

| Documento | Conteúdo |
|-----------|----------|
| [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Visão geral da arquitetura e fluxos |
| [docs/API.md](docs/API.md) | Endpoints da API REST |
| [docs/AMBIENTE.md](docs/AMBIENTE.md) | Variáveis de ambiente e banco de dados |
| [docs/DESENVOLVIMENTO.md](docs/DESENVOLVIMENTO.md) | Padrões e dicas para desenvolvimento |

## Variáveis de ambiente (backend)

Crie `sysmanage-ti/backend/.env` (não versionado):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=sysmanage
DB_PASS=sua_senha
DB_NAME=sysmanage_ti
JWT_SECRET=uma_chave_secreta_forte
PORT=3000
```

## Licença

Conforme arquivo [LICENSE](LICENSE) na raiz do repositório.
