# SysManage TI

Sistema robusto de gestão de inventário de ativos de TI e colaboradores. Permite o controle centralizado de máquinas físicas, softwares e licenças, com dashboards visuais dinâmicos e controle de acesso baseado em funções.

## 🚀 Novidades desta Versão

* **Controle de Acesso (RBAC):** níveis de permissão implementados (Admin, Técnico e Leitura).
* **Gestão de Software:** campos específicos para conformidade, como fabricante, versão, chave de licença e data de expiração.
* **Dashboard Visual:** gráficos interativos integrados com Chart.js.
* **Relatórios:** exportação completa do inventário em formato CSV (compatível com Excel).
* **Segurança Reforçada:**

  * Autenticação via JWT utilizando Cookies HTTP-Only (`sameSite: strict`).
  * Filtro global Anti-XSS com `sanitize-html`.
  * Proteção contra força bruta com Rate Limiting e cabeçalhos seguros via Helmet.

## 🛠️ Tecnologias

| Camada       | Stack                                             |
| ------------ | ------------------------------------------------- |
| **Backend**  | Node.js, Express, MySQL, JWT e Cookies            |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) e Bootstrap 5.3 |
| **Gráficos** | Chart.js                                          |

## 📋 Pré-requisitos

* **Node.js** 18 ou superior.
* **MySQL** 8.x ou superior.

## ⚙️ Início Rápido

### 1. Configuração do Banco de Dados

Crie o banco de dados e as tabelas executando os scripts contidos em `docs/AMBIENTE.md`.

Exemplo de configuração inicial:

```sql
CREATE DATABASE sysmanage_ti CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'sysmanage'@'localhost' IDENTIFIED BY 'sua_senha_segura';

GRANT ALL PRIVILEGES ON sysmanage_ti.* TO 'sysmanage'@'localhost';

FLUSH PRIVILEGES;
```

### 2. Configuração do Backend

1. Navegue até a pasta do backend:

```bash
cd sysmanage-ti/backend
```

2. Crie o arquivo `.env` com base no guia de ambiente.

3. Instale as dependências e inicie o servidor:

```bash
npm install
npm run dev
```

O servidor estará disponível em:

```bash
http://localhost:3000
```

## 🌐 Acesso ao Sistema

O frontend é servido automaticamente pelo backend.

* **Página Inicial / Login:**
  `http://localhost:3000`

* **Registro de Usuário:**
  `http://localhost:3000/register.html`

## 📂 Estrutura do Projeto

```bash
Projeto/
├── sysmanage-ti/
│   ├── backend/                 # API Node.js (Express + MySQL)
│   │   ├── server.js            # Entrada principal da API
│   │   └── .env                 # Variáveis sensíveis (não versionado)
│   │
│   ├── frontend/                # Interface do usuário
│   │   └── public/
│   │       ├── js/              # Scripts da aplicação
│   │       │   └── dashboard.js
│   │       ├── css/             # Arquivos de estilização
│   │       └── assets/          # Recursos estáticos
│
├── docs/                        # Documentação técnica
└── README.md
```

## 📖 Documentação Adicional

| Documento                 | Conteúdo                                       |
| ------------------------- | ---------------------------------------------- |
| `docs/ARQUITETURA.md`     | Fluxo de autenticação e arquitetura do sistema |
| `docs/API.md`             | Endpoints REST e níveis de permissão           |
| `docs/AMBIENTE.md`        | Estrutura SQL e variáveis de ambiente          |
| `docs/DESENVOLVIMENTO.md` | Boas práticas e padrões do projeto             |

## 🎥 Demonstração do Projeto

* **Apresentação em PowerPoint:**
  [YouTube - Apresentação do Projeto](https://www.youtube.com/watch?v=_BDGUJN5ghY&utm_source=chatgpt.com)

* **Demonstração do Sistema:**
  [YouTube - Demonstração do Software](https://www.youtube.com/watch?v=qw5XLDT1ch8&utm_source=chatgpt.com)

* **Documentação Completa (.docx):**
  [SysManage TI - Documento Técnico](https://github.com/Kelvinsantosyz/sysmanage-ti/blob/main/docs/SYSMANAGE-TI.docx?utm_source=chatgpt.com)

* **Repositório Oficial:**
  [GitHub - SysManage TI](https://github.com/Kelvinsantosyz/sysmanage-ti?utm_source=chatgpt.com)

## 🔐 Variáveis de Ambiente

Crie o arquivo:

```bash
sysmanage-ti/backend/.env
```

Com as seguintes variáveis:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=sysmanage
DB_PASS=sua_senha_segura
DB_NAME=sysmanage_ti

JWT_SECRET=uma_chave_longa_e_aleatoria

PORT=3000
```

---

# ✨ Recursos do Sistema

* Gestão de ativos de TI
* Controle de colaboradores
* Gestão de softwares e licenças
* Controle de permissões (RBAC)
* Dashboard interativo
* Exportação CSV
* Segurança reforçada
* Interface responsiva
* API REST integrada

---

**SysManage TI** — Eficiência e controle na gestão de ativos tecnológicos.
