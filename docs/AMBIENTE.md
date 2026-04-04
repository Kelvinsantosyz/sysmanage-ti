
```markdown
---

# Ambiente e banco de dados

Este guia descreve como configurar o ecossistema necessário para executar o **SysManage TI**.

## Variáveis de ambiente (backend)

Crie um arquivo chamado `.env` na raiz da pasta `sysmanage-ti/backend/`. **Este arquivo contém informações sensíveis e não deve ser versionado**.

### Exemplo de `.env`
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=sysmanage
DB_PASS=sua_senha_segura
DB_NAME=sysmanage_ti
JWT_SECRET=uma_chave_longa_e_aleatoria_aqui
PORT=3000
```

| Variável | Descrição |
| :--- | :--- |
| **DB_HOST** | Endereço do servidor MySQL. |
| **DB_PORT** | Porta de conexão (padrão 3306). |
| **DB_USER** | Usuário com permissões no banco de dados. |
| **DB_PASS** | Senha do usuário do banco. |
| **DB_NAME** | Nome da base de dados criada para o projeto. |
| **JWT_SECRET** | Chave para assinatura dos tokens e cookies de sessão. |
| **PORT** | Porta onde o servidor Node.js será executado. |

---

## MySQL — Preparação do Banco

Siga os passos abaixo para criar o banco de dados e o usuário no seu servidor MySQL:

```sql
-- 1. Criar o banco de dados
CREATE DATABASE sysmanage_ti CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Criar o usuário (ajuste a senha conforme o seu .env)
CREATE USER 'sysmanage'@'localhost' IDENTIFIED BY 'sua_senha_segura';

-- 3. Dar permissões ao usuário
GRANT ALL PRIVILEGES ON sysmanage_ti.* TO 'sysmanage'@'localhost';
FLUSH PRIVILEGES;

-- 4. Selecionar o banco
USE sysmanage_ti;
```

---

## Scripts SQL (Criação das Tabelas)

Execute a criação das tabelas **exatamente nesta ordem**, pois a tabela `assets` depende da tabela `colaboradores` (Chave Estrangeira).

### 1. Tabela de Usuários (Acesso ao Sistema)
Armazena os usuários do painel administrativo, suas senhas (hash) e níveis de permissão (`role`).

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    must_change_password TINYINT(1) DEFAULT 0,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Tabela de Colaboradores (Funcionários/RH)
Cadastro dos funcionários da empresa que serão responsáveis pelas máquinas ou licenças.

```sql
CREATE TABLE colaboradores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    funcao VARCHAR(100),
    cpf VARCHAR(20) UNIQUE,
    telefone VARCHAR(20),
    data_nascimento DATE,
    setor VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Ativo'
);
```

### 3. Tabela de Ativos (Hardwares e Softwares)
Inventário consolidado de máquinas físicas e licenciamento de software.

```sql
CREATE TABLE assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    status VARCHAR(20),
    setor VARCHAR(100),
    patrimonio VARCHAR(100),
    numero_serie VARCHAR(100),
    fabricante VARCHAR(100),
    versao VARCHAR(50),
    chave_licenca VARCHAR(255),
    data_expiracao DATE,
    colaborador_id INT,
    FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL
);
```

---

## Checklist de Instalação

* [ ] **Node.js**: Versão 18 ou superior instalada.
* [ ] **MySQL**: Instância ativa e acessível.
* [ ] **Dependências**: Executado `npm install` na pasta do backend.
* [ ] **Banco de Dados**: Comandos de criação de banco, usuário e tabelas executados.
* [ ] **Variáveis**: Arquivo `.env` configurado corretamente.
* [ ] **Execução**: Servidor iniciado via `npm run dev` ou `node server.js`.

---
```