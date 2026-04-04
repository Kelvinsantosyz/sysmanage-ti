---

# API REST — SysManage TI

Base URL (desenvolvimento): `http://localhost:3000`

Respostas de erro utilizam JSON com o campo `error` (string). Requisições bem-sucedidas retornam objetos com dados ou mensagens de confirmação.

---

## Autenticação

### POST `/api/login`
Autentica o usuário e define um **Cookie HTTP-Only** contendo o token JWT.

**Body (JSON):**
* `email`: string (obrigatório)
* `password`: string (obrigatório)

**Resposta 200:**
```json
{
  "mustChangePassword": false,
  "user": {
    "id": 1,
    "name": "Nome do Usuário",
    "role": "admin"
  }
}
```
*Roles disponíveis: `admin`, `tecnico`, `leitura`.*

### POST `/api/logout`
Encerra a sessão removendo o cookie de autenticação do navegador.

---

## Setores

### GET `/api/setores` 🔒
Retorna a lista de todos os setores cadastrados na tabela independente.
**Resposta 200:** Array de objetos `[{ "id": 1, "nome": "TI" }]`.

### POST `/api/setores` 🔒
Cria um novo setor. Nome deve ser único e não vazio.

### PUT `/api/setores/:id` 🔒
Atualiza o nome de um setor existente.

### DELETE `/api/setores/:id` 🔒
Remove um setor do sistema.

---

## Colaboradores

### GET `/api/colaboradores` 🔒
Lista colaboradores. Suporta filtros via Query Params: `setor`, `status`.

### POST `/api/colaboradores` 🔒
Cria um colaborador.
**Campos:** `nome`, `funcao`, `cpf` (único), `telefone`, `data_nascimento` (pode ser null), `setor`, `status`.

### DELETE `/api/colaboradores/:id` 🔒
Remove um colaborador. Requer privilégios de `admin`.

---

## Ativos (Máquinas e Softwares)

### GET `/api/assets` 🔒
Lista ativos. Query param opcional: `type` (ex: `Software`).
*Utilizado também para a geração de relatórios CSV.*

### POST e PUT `/api/assets` 🔒
Cria ou atualiza um ativo. O corpo da requisição aceita campos dinâmicos baseados no tipo:

**Campos Comuns:**
* `nome`, `type`, `status`, `setor`.

**Campos específicos para Hardware:**
* `patrimonio`, `numero_serie`.

**Campos específicos para Software (Licenciamento):**
* `fabricante`, `versao`, `chave_licenca`, `data_expiracao`.

### DELETE `/api/assets/:id` 🔒
Remove um ativo permanentemente. Requer privilégios de `admin`.

---

## Dashboard

### GET `/api/dashboard/summary` 🔒
Retorna métricas consolidadas para o painel principal e gráficos:
* Totais de máquinas e softwares.
* Contagem de ativos por status (Ativo/Inativo/Estoque).
* Distribuição de máquinas por setor (usado no `Chart.js`).

---

## Segurança e Permissões

As rotas marcadas com 🔒 exigem que a requisição inclua o cookie de sessão válido. A API valida o nível de acesso (`role`) do usuário para permitir ou bloquear certas operações:

* **Admin**: Acesso total (Leitura, Escrita, Exclusão).
* **Tecnico**: Permissão para criar e editar ativos/colaboradores, mas não pode excluir.
* **Leitura**: Apenas visualização de dados.

---

