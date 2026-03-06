# API REST — SysManage TI

Base URL (desenvolvimento): `http://localhost:3000`

Respostas de erro usam JSON com campo `error` (string). Sucesso costuma retornar objeto com dados ou `message`.

---

## Autenticação

### POST `/api/register`

Cria um novo usuário (cadastro).

**Body (JSON):**

| Campo    | Tipo   | Obrigatório | Descrição        |
|----------|--------|-------------|-------------------|
| name     | string | sim         | Nome do usuário   |
| email    | string | sim         | E-mail (único)    |
| password | string | sim         | Mínimo 6 caracteres |

**Resposta 200:** `{ "message": "Conta criada com sucesso" }`  
**Erros:** 400 (validação), 500 (erro interno)

---

### POST `/api/login`

Autentica e retorna o token JWT.

**Body (JSON):**

| Campo    | Tipo   | Obrigatório |
|----------|--------|-------------|
| email    | string | sim         |
| password | string | sim         |

**Resposta 200:**

```json
{
  "token": "eyJhbGc...",
  "mustChangePassword": false,
  "user": {
    "id": 1,
    "name": "Nome",
    "email": "email@exemplo.com"
  }
}
```

Se o usuário precisar trocar a senha no primeiro login, `mustChangePassword` vem `true`.  
**Erros:** 401 (credenciais inválidas), 500

---

### PUT `/api/auth/change-password` 🔒

Altera a senha do usuário logado. Requer header `Authorization: Bearer <token>`.

**Body (JSON):**

| Campo          | Tipo   | Obrigatório | Descrição |
|----------------|--------|-------------|-----------|
| currentPassword | string | condicional | Obrigatório exceto no primeiro login (must_change_password) |
| newPassword   | string | sim         | Mínimo 6 caracteres |

**Resposta 200:** `{ "message": "Senha alterada com sucesso" }`  
**Erros:** 400 (validação), 401 (token ou senha atual inválida), 404, 500

---

## Colaboradores

### GET `/api/colaboradores`

Lista colaboradores. Query params opcionais: `setor`, `status` (Ativo/Inativo).

**Resposta 200:** array de objetos (id, nome, funcao, telefone, cpf, data_nascimento, setor, status, etc.)

---

### POST `/api/colaboradores`

Cria colaborador. Body: nome, funcao, telefone, cpf, data_nascimento, setor, status (Ativo/Inativo). CPF obrigatório e único.

---

### GET `/api/colaboradores/:id`

Retorna um colaborador por ID. **Resposta 404** se não existir.

---

### PUT `/api/colaboradores/:id`

Atualiza colaborador. Mesmos campos do POST.

---

### DELETE `/api/colaboradores/:id`

Remove colaborador. **Resposta 404** se não existir.

---

## Ativos (máquinas / inventário / softwares)

### GET `/api/assets`

Lista ativos. Query params opcionais: `setor`, `status` (Ativo/Inativo), `tipo` (ex.: Desktop, Software).

**Resposta 200:** array de objetos com `id`, `nome`, `tipo`, `status`, `setor`, `patrimonio`, `numero_serie` (quando as colunas existirem).

---

### POST `/api/assets`

Cria ativo. Body: `name`, `type`, `status` (Ativo/Inativo), `setor`, `patrimonio`, `numero_serie` (opcionais).

---

### GET `/api/assets/:id`

Retorna um ativo por ID.

---

### PUT `/api/assets/:id`

Atualiza ativo. Mesmos campos do POST.

---

### DELETE `/api/assets/:id`

Remove ativo.

---

## Dashboard e setores

### GET `/api/dashboard/summary`

Retorna resumo para o dashboard: totais (máquinas, softwares, ativos, inativos), resumo por setor (colaboradores, máquinas, ativos/inativos), últimos ativos. Não exige autenticação na implementação atual; pode ser protegido no futuro.

**Resposta 200:** objeto com `totalMachines`, `totalSoftwares`, `ativos`, `inativos`, `porSetor` (array), `latestAssets` (array).

---

### GET `/api/setores`

Retorna lista de setores distintos (a partir dos colaboradores). **Resposta 200:** array de strings.

---

## Uso do token

Para rotas que exigem autenticação (ex.: `PUT /api/auth/change-password`), envie no header:

```
Authorization: Bearer <token>
```

Token obtido em `POST /api/login`. Se expirado ou inválido, a API retorna 401.
