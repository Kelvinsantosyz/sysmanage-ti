# SysManage TI

Sistema robusto de gestão de inventário de ativos de TI e colaboradores. Permite o controle centralizado de máquinas físicas e licenciamentos de software, com painéis visuais dinâmicos e controle de acesso baseado em funções.

## 🚀 Novidades desta Versão

  - **Controle de Acesso (RBAC):** Níveis de permissão para Admin, Técnico e Leitura.
  - **Gestão de Software:** Campos específicos para conformidade (Fabricante, Versão, Chave de Licença e Expiração).
  - **Dashboard Visual:** Gráficos interativos integrados com Chart.js.
  - **Relatórios:** Exportação de todo o inventário para formato CSV (compatível com Excel).
  - **Segurança:** Autenticação via JWT armazenado em Cookies HTTP-Only.

## 🛠️ Tecnologias

| Camada         | Stack                                     |
|----------------|-------------------------------------------|
| **Backend** | Node.js, Express, MySQL, JWT, Cookies     |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla), Bootstrap 5.3 |
| **Gráficos** | Chart.js                                  |

## 📋 Pré-requisitos

  - **Node.js** 18 ou superior.
  - **MySQL** 8.x ou superior.

## ⚙️ Início Rápido

### 1\. Configuração do Banco de Dados

Crie o banco de dados e as tabelas executando os scripts contidos em [docs/AMBIENTE.md](https://www.google.com/search?q=docs/AMBIENTE.md). Exemplo de criação inicial:

```sql
CREATE DATABASE sysmanage_ti CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sysmanage'@'localhost' IDENTIFIED BY 'sua_senha_segura';
GRANT ALL ON sysmanage_ti.* TO 'sysmanage'@'localhost';
FLUSH PRIVILEGES;
```

### 2\. Configuração do Backend

1.  Navegue até a pasta: `cd sysmanage-ti/backend`
2.  Crie o arquivo `.env` baseando-se no guia de ambiente.
3.  Instale as dependências e inicie o servidor:

<!-- end list -->

```bash
npm install
npm run dev
```

O servidor estará disponível em `http://localhost:3000`.

### 3\. Acesso ao Sistema

O frontend é servido automaticamente pelo backend. Acesse:

  - **Página Inicial/Login:** `http://localhost:3000`
  - **Registro de Usuário:** `http://localhost:3000/register.html`

## 📂 Estrutura do Projeto

```
Projeto/
├── sysmanage-ti/
│   ├── backend/          # API Node.js (Express + MySQL)
│   │   ├── server.js     # Entrada da API e Rotas
│   │   └── .env          # Configurações sensíveis (não versionado)
│   ├── frontend/         # Interface do Usuário
│   │   └── public/       # HTML, CSS, JS e Assets
│   │       ├── js/       # dashboard.js (Lógica principal)
│   │       └── css/      # Estilização
├── docs/                 # Documentação Técnica Atualizada
└── README.md
```

## 📖 Documentação Adicional

| Documento | Conteúdo |
|-----------|----------|
| [docs/ARQUITETURA.md](https://www.google.com/search?q=docs/ARQUITETURA.md) | Fluxo de autenticação e diagrama do sistema. |
| [docs/API.md](https://www.google.com/search?q=docs/API.md) | Documentação dos endpoints REST e níveis de permissão. |
| [docs/AMBIENTE.md](https://www.google.com/search?q=docs/AMBIENTE.md) | Estrutura completa do SQL e variáveis `.env`. |
| [docs/DESENVOLVIMENTO.md](https://www.google.com/search?q=docs/DESENVOLVIMENTO.md) | Guia de boas práticas e padrões do projeto. |

## 🔐 Variáveis de Ambiente

Crie o arquivo `sysmanage-ti/backend/.env` com as seguintes chaves:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=sysmanage
DB_PASS=sua_senha_segura
DB_NAME=sysmanage_ti
JWT_SECRET=uma_chave_longa_e_aleatoria
PORT=3000
```

-----

**SysManage TI** - Eficiência na gestão de ativos tecnológicos.
