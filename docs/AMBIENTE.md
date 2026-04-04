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
```

---

## Scripts SQL (Ordem de Execução)

Execute os scripts localizados em `backend/sql/` na seguinte ordem para garantir a integridade das relações:

1.  **Tabela `users`**: Armazena os usuários do painel administrativo, suas senhas (hash) e níveis de permissão (`role`).
2.  **Tabela `setores`**: Gerencia as localizações físicas e lógicas que serão listadas nos cadastros.
3.  **Tabela `colaboradores`**: Cadastro dos funcionários da empresa.
4.  **Tabela `assets`**: Inventário consolidado de hardware e licenciamento de software.

---

## Checklist de Instalação

* [ ] **Node.js**: Versão 18 ou superior instalada.
* [ ] **MySQL**: Instância ativa e acessível.
* [ ] **Dependências**: Executado `npm install` na pasta do backend.
* [ ] **Variáveis**: Arquivo `.env` configurado corretamente.
* [ ] **Execução**: Servidor iniciado via `npm run dev` ou `node server.js`.

---