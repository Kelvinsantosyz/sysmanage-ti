

---

# Guia de desenvolvimento

Padrões e dicas para quem for alterar ou estender o SysManage TI.

## Estrutura do backend

- **`server.js`**: Ponto de entrada único. Configura o Express, pool de conexões MySQL, middlewares (CORS, JSON, Cookies) e todas as rotas da API.
- **Arquitetura de Rotas**: As rotas estão concentradas no `server.js`. Para evoluções futuras, recomenda-se a migração para uma pasta `routes/` visando melhor organização.
- **Persistência (`sql/`)**: Scripts SQL para criação e alteração de tabelas. Devem ser executados manualmente no MySQL para refletir as mudanças de esquema.

### Evolução Segura
- **Validação**: Mantenha a validação rigorosa de entrada (campos obrigatórios, tipos e tratamento de strings vazias para `null` em campos de data).
- **Respostas**: Erros devem retornar status HTTP adequado e um JSON com o campo `error` descritivo.
- **Segurança**: Rotas sensíveis devem obrigatoriamente usar o `authMiddleware`.

## Autenticação e Permissões (RBAC)

O sistema utiliza **Role-Based Access Control (RBAC)** para gerenciar o que cada usuário pode fazer.

- **Níveis de Acesso (Roles)**:
    - `admin`: Acesso total (visualização, edição e exclusão).
    - `tecnico`: Pode visualizar, criar e editar ativos/colaboradores, mas **não possui permissão de exclusão**.
    - `leitura`: Apenas visualização dos dados e dashboards.
- **Armazenamento do Token**: O JWT não é mais enviado no corpo do JSON. Ele é armazenado em um **Cookie HTTP-Only**, mitigando ataques de roubo de sessão via scripts (XSS).
- **Identificação no Frontend**: O objeto `user` no `localStorage` contém o nome e a `role`, utilizados apenas para controle visual (esconder/exibir botões).

## Banco de dados

- **Parâmetros Preparados**: Utilize sempre `?` em consultas SQL para evitar ataques de SQL Injection.
- **Tratamento de Datas**: O backend converte automaticamente strings de data vazias vindas do frontend em `null` para evitar erros de integridade no MySQL.
- **Gestão de Setores**: Utilize a tabela independente `setores` para garantir a padronização das localizações em todo o sistema.

## Frontend

- **Tecnologias**: HTML5, CSS3, Bootstrap 5.3 e Vanilla JS.
- **Gráficos**: Integração com **Chart.js** no dashboard principal para exibição da distribuição de ativos por setor.
- **Comunicação com API**: As chamadas `fetch` devem incluir a propriedade `{ credentials: "include" }` para que o navegador envie o cookie de autenticação automaticamente.
- **Relatórios**: Implementação de exportação de dados em tempo real para formato **CSV** no painel de Relatórios.

## Boas práticas

- **Variáveis Sensíveis**: Jamais comite o arquivo `.env`. Utilize o `.env.example` como referência.
- **Logs**: Utilize `console.error` para capturar falhas no backend, mas evite logar dados sensíveis como senhas ou tokens completos.
- **UX**: Garanta que as mensagens de erro retornadas pela API sejam amigáveis e em português.

## Rodando em desenvolvimento

```bash
# Navegue até a pasta do backend
cd sysmanage-ti/backend

# Inicie com recarregamento automático (requer nodemon)
npm run dev
```

O frontend é servido estaticamente pelo backend na porta definida (padrão `http://localhost:3000`).

## Dúvidas ou melhorias

- **Arquitetura detalhada**: `docs/ARQUITETURA.md`
- **Documentação da API**: `docs/API.md`
- **Configuração de Ambiente**: `docs/AMBIENTE.md`