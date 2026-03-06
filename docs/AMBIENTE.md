# Ambiente e banco de dados

Guia para configurar o ambiente de desenvolvimento e o MySQL.

## Variáveis de ambiente (backend)

Crie o arquivo `sysmanage-ti/backend/.env` (nunca commitar). Exemplo:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=sysmanage
DB_PASS=sua_senha_segura
DB_NAME=sysmanage_ti
JWT_SECRET=uma_chave_longa_e_aleatoria_aqui
PORT=3000
```

| Variável    | Descrição                          |
|-------------|------------------------------------|
| DB_HOST     | Host do MySQL                      |
| DB_PORT     | Porta (geralmente 3306)            |
| DB_USER     | Usuário do banco                   |
| DB_PASS     | Senha do usuário                   |
| DB_NAME     | Nome do banco                      |
| JWT_SECRET  | Chave para assinar/validar o JWT    |
| PORT        | Porta do servidor Node (padrão 3000) |

**Dica:** use um `.env.example` só com chaves sem valores e documente no README; o `.env` real fica no `.gitignore`.

## MySQL — criação do banco

```sql
CREATE DATABASE sysmanage_ti CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sysmanage'@'localhost' IDENTIFIED BY 'sua_senha';
GRANT ALL PRIVILEGES ON sysmanage_ti.* TO 'sysmanage'@'localhost';
FLUSH PRIVILEGES;
```

Ajuste usuário/senha conforme o `.env`.

## Scripts SQL (backend)

Pasta: `sysmanage-ti/backend/sql/`.

Execute na ordem que fizer sentido para o seu banco:

1. **Tabela `users`**  
   Deve existir com pelo menos: `id`, `name`, `email`, `password`.  
   Exemplo mínimo:
   ```sql
   CREATE TABLE IF NOT EXISTS users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(100) NOT NULL,
     email VARCHAR(255) NOT NULL UNIQUE,
     password VARCHAR(255) NOT NULL
   );
   ```

2. **`002_users_first_login.sql`**  
   Adiciona `must_change_password` para obrigar troca de senha no primeiro login:
   ```sql
   ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1;
   ```

3. **`001_colaboradores.sql`**  
   Cria a tabela `colaboradores` (nome, função, telefone, cpf, data_nascimento, setor, status).

4. **Tabela `assets`**  
   Mínimo: `id`, `name`, `type`, `status`. Opcionais (ALTER na mesma pasta ou em comentários nos arquivos):
   - `setor`
   - `patrimonio`, `numero_serie`

O backend se adapta à existência dessas colunas (usa `SHOW COLUMNS` onde necessário).

## Agent (Go) — variáveis opcionais

Ao rodar o agent nas máquinas:

| Variável               | Descrição                          | Exemplo                    |
|------------------------|------------------------------------|----------------------------|
| AGENT_SERVER_URL       | URL do endpoint de métricas        | `http://servidor:3000/api/agent/metrics` |
| AGENT_INTERVAL_SECONDS | Intervalo entre envios (segundos)  | `5`                        |
| AGENT_DISK_PATH        | Caminho do disco para métrica      | `C:\` (Windows) ou `/`     |

## Checklist rápido

- [ ] Node.js 18+ instalado  
- [ ] MySQL rodando, banco e usuário criados  
- [ ] Scripts SQL executados (users, colaboradores, assets, opcionais)  
- [ ] `sysmanage-ti/backend/.env` criado com DB_* e JWT_SECRET  
- [ ] `npm install` e `npm run dev` no backend  
- [ ] Acesso a `http://localhost:3000` e login funcionando  
