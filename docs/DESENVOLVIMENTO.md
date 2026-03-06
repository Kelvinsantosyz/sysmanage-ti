# Guia de desenvolvimento

Padrões e dicas para quem for alterar ou estender o SysManage TI.

## Estrutura do backend

- **`server.js`**: ponto de entrada; configura Express, pool MySQL, middlewares e todas as rotas.  
- Rotas estão no próprio `server.js` (não há pasta `routes/` separada por enquanto).  
- **`sql/`**: scripts de criação/alteracao de tabelas; executados manualmente no MySQL.

Para evoluir sem bagunçar:

- Manter validação de entrada (campos obrigatórios, tamanhos, tipos).  
- Respostas de erro em JSON com campo `error`.  
- Rotas sensíveis (alterar senha, etc.) protegidas com o middleware de JWT.

## Autenticação

- Login retorna JWT com `id` e `email`; expiração definida no `jwt.sign` (ex.: 8h).  
- Rotas protegidas usam `authMiddleware` e leem `req.user.id` (e `req.user.email` se precisar).  
- Frontend envia `Authorization: Bearer <token>` em todas as chamadas que exigem login.

Ao adicionar novas rotas “só para logados”, use:

```js
app.get('/api/minha-rota', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  // ...
});
```

## Banco de dados

- Sempre usar parâmetros preparados (`?` e array de valores) para evitar SQL injection.  
- Colunas opcionais (ex.: `must_change_password`, `setor` em assets): o código verifica com `SHOW COLUMNS` e monta o SQL dinamicamente para não quebrar em bancos antigos.  
- Novas colunas: criar script em `sql/` e documentar em `docs/AMBIENTE.md`.

## Frontend

- Páginas em `sysmanage-ti/frontend/public/` (HTML, CSS, JS).  
- O backend serve essa pasta em `/`; não há build (ex.: Webpack) nem SPA com roteador.  
- Token e usuário em `localStorage`; redirecionamento para `login.html` quando não há token ou quando a API retorna 401.  
- Ao adicionar novas telas, seguir o padrão de `fetch` com header `Authorization: Bearer ${token}` e tratamento de 401 (limpar storage e redirecionar para login).

## Boas práticas

- **Nunca** commitar `.env` ou arquivos com senhas/chaves.  
- Manter documentação atualizada (README, `docs/API.md`, `docs/AMBIENTE.md`) quando criar rotas ou variáveis novas.  
- Mensagens de erro da API em português e objetivas para o frontend exibir.  
- Logs de erro no backend com `console.error` (evitar logar corpo de requisição com senha).

## Rodando em desenvolvimento

```bash
# Backend (com recarregamento)
cd sysmanage-ti/backend
npm run dev
```

Se não houver script `dev`, use `node server.js` ou configure `nodemon` no `package.json`.  
Frontend é só abrir o navegador em `http://localhost:3000` após o backend estar no ar.

## Testes manuais da API

- **Postman / Insomnia:** importar a base URL `http://localhost:3000`, criar request de login (POST `/api/login`), copiar o `token` da resposta e usar em rotas protegidas no header `Authorization: Bearer <token>`.  
- **curl:**  
  Login: `curl -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d "{\"email\":\"...\",\"password\":\"...\"}"`  
  Rota protegida: `curl -X PUT http://localhost:3000/api/auth/change-password -H "Content-Type: application/json" -H "Authorization: Bearer SEU_TOKEN" -d "{\"currentPassword\":\"...\",\"newPassword\":\"...\"}"`

## Dúvidas ou melhorias

- Arquitetura: `docs/ARQUITETURA.md`  
- Endpoints: `docs/API.md`  
- Ambiente e banco: `docs/AMBIENTE.md`
