# Arquitetura — SysManage TI

Documentação da arquitetura do sistema para desenvolvedores.

## Visão geral

O sistema é dividido em três partes principais:

┌─────────────┐     HTTP      ┌─────────────┐     HTTP      ┌─────────────┐
│  Frontend   │ ◄───────────► │   Backend   │ ◄───────────► │   MySQL     │
│  (Browser)  │   (API +      │  (Node.js)  │   (queries)   │  (dados)    │
│             │    arquivos   │   Express   │               │             │
└─────────────┘    estáticos) └──────┬──────┘               └─────────────┘

* **Frontend**: páginas estáticas (HTML/CSS/JS) servidas pelo backend. Consome a API REST via `fetch` utilizando Cookies para autenticação contínua.
* **Backend**: API em Node.js (Express), serve o frontend e persiste dados no MySQL. Autenticação via JWT em Cookies HTTP-Only.
* **Banco de Dados**: MySQL gerenciando todas as relações (Usuários, Ativos, Setores e Colaboradores).

## Fluxo de autenticação
1.  Usuário envia **email + senha** em `POST /api/login`.
2.  Backend valida no banco, gera um **JWT** (contém `id`, `email` e `role`) e o insere em um **Cookie HTTP-Only**. Retorna um JSON com dados públicos do `user`.
3.  Frontend guarda as informações públicas do `user` no `localStorage` para renderização visual (ex: Nome e Badge de Permissão na navbar).
4.  O browser anexa o Cookie automaticamente em requisições para a API protegidas pelo **middleware**.

## Banco de dados (principais entidades)
* **users**: usuários do sistema (login). Campos: id, name, email, password, role.
* **colaboradores**: colaboradores da empresa. Campos: nome, funcao, telefone, cpf, data_nascimento, setor, status.
* **assets**: ativos de TI (máquinas, softwares). Incorpora modelo GLPI.
* **setores**: entidades de localização isoladas. Campos: id, nome.