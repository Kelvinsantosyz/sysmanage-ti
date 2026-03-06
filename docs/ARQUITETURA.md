# Arquitetura — SysManage TI

Documentação da arquitetura do sistema para desenvolvedores.

## Visão geral

O sistema é dividido em três partes:

```
┌─────────────┐     HTTP      ┌─────────────┐     HTTP      ┌─────────────┐
│  Frontend   │ ◄───────────► │   Backend   │ ◄───────────► │   MySQL     │
│  (Browser)  │   (API +      │  (Node.js)  │   (queries)   │  (dados)     │
│             │    arquivos   │   Express   │               │             │
└─────────────┘    estáticos) └──────┬──────┘               └─────────────┘
                                     │
                                     │ HTTP POST (métricas)
                                     ▼
                              ┌─────────────┐
                              │   Agent     │
                              │   (Go)      │
                              │  nas máquinas
                              └─────────────┘
```

- **Frontend**: páginas estáticas (HTML/CSS/JS) servidas pelo backend. Consome a API REST com `fetch` e armazena o token JWT no `localStorage`.
- **Backend**: API em Node.js (Express), serve o frontend e persiste dados no MySQL. Autenticação via JWT.
- **Agent**: executável em Go que roda nos equipamentos, coleta métricas (CPU, RAM, disco, rede) e envia para o backend (quando a rota existir).

## Fluxo de autenticação

1. Usuário envia **email + senha** em `POST /api/login`.
2. Backend valida no banco, gera um **JWT** (contém `id` e `email`) com expiração (ex.: 8h) e retorna `token`, `user` e opcionalmente `mustChangePassword`.
3. Frontend guarda `token` e `user` no `localStorage` e, em requisições autenticadas, envia o header `Authorization: Bearer <token>`.
4. Rotas protegidas usam o **middleware** que valida o JWT e preenche `req.user`; a rota usa `req.user.id` para identificar o usuário.

Não há sessão no servidor: o estado “logado” é o próprio token assinado com `JWT_SECRET`.

## Banco de dados (principais entidades)

- **users** — usuários do sistema (login). Campos: id, name, email, password (hash), must_change_password (opcional).
- **colaboradores** — colaboradores da empresa. Campos: nome, função, telefone, cpf, data_nascimento, setor, status (Ativo/Inativo).
- **assets** — ativos de TI (máquinas, softwares). Campos: name, type, status, setor (opcional), patrimonio, numero_serie (opcionais).

Scripts de criação/alteracao estão em `sysmanage-ti/backend/sql/`.

## Decisões técnicas

- **Senha**: hash com bcrypt (salt rounds 10). Nunca armazenada em texto puro.
- **Primeiro login**: coluna `must_change_password`; quando ativa, o login retorna `mustChangePassword: true` e o frontend redireciona para a tela de alteração de senha antes do dashboard.
- **Compatibilidade**: o backend verifica a existência de colunas opcionais (ex.: `must_change_password`, `setor` em assets) com `SHOW COLUMNS` e adapta os INSERT/UPDATE/SELECT para não quebrar em bancos ainda não migrados.
