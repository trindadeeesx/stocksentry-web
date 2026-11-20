# StockSentry Web

Front do StockSentry: controle de estoque multi-tenant com alerta de estoque crítico por e-mail e push (Web Push/VAPID). Cada empresa (tenant) tem usuários com papel `ADMIN` ou `OPERATOR`. O produto é genérico, sem marca de nenhum cliente. Back em repositório separado (`stocksentry/`, Spring Boot).

## Stack e comandos

Angular 21 (standalone + signals), TypeScript 5.9, RxJS 7.8, SCSS, Vitest (via `ng test`) + jsdom. Sem lib de UI nem de estado.

| Comando | O que faz |
|---|---|
| `npm start` | `ng serve` com `proxy.conf.json` (`/api` -> `http://localhost:8080`) |
| `npm run build` | build de produção em `dist/stocksentry-web/browser` |
| `npm test` | `ng test` (Vitest) |

- Em dev `environment.apiUrl` é `''`: as chamadas vão para a mesma origem e o proxy repassa ao back.
- Em produção `environment.apiUrl` lê `window.__env.apiUrl` de `public/env.js`. No deploy, `entrypoint.sh` gera `env.js` a partir de `env.js.template` com `envsubst` da variável `API_URL` e injeta `PORT` no nginx. `env.js` nunca é cacheado (ver `nginx.conf`).
- Deploy: `Dockerfile` (build com node 20, serve com nginx, porta 8080) + `railway.json`.

## Estrutura (`src/app/`)

- `app.ts`: inicia o tema, conecta o SSE se já há token e, no evento `config`, reconcilia a subscription push local com o back.
- `app.config.ts`: `provideRouter(withComponentInputBinding)` e `provideHttpClient` com `authInterceptor` e `errorInterceptor`.
- `core/guards/`: `authGuard`.
- `core/interceptors/`: `auth.interceptor.ts`, `error.interceptor.ts`.
- `core/http/api-error.ts`: `apiErrorMessage(err, statuses, fallback)`.
- `core/models/`: tipos da API (`auth`, `product`, `alert`, `user`).
- `core/services/`: `auth`, `sse`, `push`, `alert`, `product`, `user`, `settings`, `theme`, `toast`.
- `features/`: `login`, `register` (com `slugify.ts`), `dashboard`, `products`, `alerts`, `settings`, `not-found`.
- `shared/`: `components/topbar`, `components/toast`, `pipes/br-date.pipe.ts`.
- `src/styles/`: `_variables.scss` (tokens), `_reset`, `_typography`, `_skeleton`; `src/styles.scss` os importa.
- `public/`: `env.js`, `env.js.template`, `sw.js` (service worker de push), `favicon.ico`.

## Rotas e guards

Todas com `loadComponent` (lazy) e título "<Tela> — StockSentry".

| Rota | Tela | Acesso |
|---|---|---|
| `/login`, `/register` | login, cadastro de empresa + admin | públicas; redirecionam a `/dashboard` se já há token |
| `/` | redireciona a `/dashboard` | `authGuard` |
| `/dashboard`, `/products`, `/alerts`, `/settings` | telas principais | `authGuard` |
| `/404`, `**` | não encontrado | pública |

- `authGuard` só checa se existe `stocksentry_token` no `localStorage`; não valida o JWT nem o papel. Não há guard de papel: a seção "Equipe" em `/settings` aparece só se `currentUser.role === 'ADMIN'` e o back responde 403 aos demais.

## Auth, SSE e push

**Sessão.** O JWT fica em `localStorage` (`stocksentry_token`). `AuthService.login`/`register` gravam o token e chamam `sse.connect()`. `fetchMe()` lê `GET /auth/me` (resposta embrulhada em `{ user }`) e preenche o signal `currentUser`. `logout()` desconecta o SSE, limpa o token e vai a `/login`.

**Interceptors.** `authInterceptor` põe `Authorization: Bearer`. `errorInterceptor` tenta de novo 1 vez (após 800 ms) só em erro de rede/5xx; em 401 remove o token e navega a `/login`.

**Erros do back.** Corpo `{"error": "..."}` (na validação, com `fields`). Use `apiErrorMessage` e só exiba a mensagem do back nos status esperados; senão, texto fixo em PT-BR.

**SSE (`SseService`).** `EventSource` não manda header, então cada conexão usa ticket de uso único: `POST /api/v1/events/ticket` (com Bearer) e depois `GET /api/v1/events?ticket=...`. Eventos: `alert`, `config`, `heartbeat`; consumo por `sse.on(tipo)`. No erro, fecha o stream e reconecta manualmente (novo ticket) com backoff de 2 s até 30 s; 429 espera 60 s; 401/403 não reconecta (o interceptor faz o logout). Aba oculta não conecta; reabre ao voltar a ficar visível. Dashboard e produtos recarregam em `alert`; dashboard também em `config`; alertas recarrega em `alert`.

**Push (`PushService`).** Fluxo de `subscribe()`: pede permissão, busca `GET /push/vapid-key`, registra `/sw.js`, cria a subscription, `POST /push/subscribe` e `POST /alerts/config` (type PUSH, destination = nome do dispositivo derivado do user agent). O nome fica em `localStorage` (`stocksentry_push_device`). `unsubscribe()` faz `DELETE /push/subscribe`. O signal `status` assume `unsupported | denied | not-subscribed | subscribing | subscribed`.

**Preferências locais.** `ThemeService` (`stocksentry_theme`, claro/escuro, usa `data-theme` no `<html>`) e `SettingsService` (`stocksentry_settings`, só a posição dos toasts). Nada disso vai ao back.

## Convenções

- Componentes `standalone`, estado com `signal`/`computed`, `inject()` em vez de construtor com parâmetros, `takeUntilDestroyed` nas assinaturas. Há mistura de `OnPush` e default; ao criar novo, prefira `OnPush`.
- Formulários: reativos em login/register, `ngModel` em settings.
- Textos de UI em PT-BR. Marca única: "StockSentry".
- Cores e espaçamentos via variáveis CSS de `styles/_variables.scss` (marca `--color-brand: #0F766E`, teal; tema escuro em `[data-theme="dark"]`). Não hardcode cores novas.
- Testes `*.spec.ts` ao lado do código (Vitest, `TestBed`, `HttpTestingController`). Existem para `auth`, `user`, `sse`, `slugify`, register, settings, products, alerts, dashboard e `app`.
- Commits PT-BR em Conventional Commits, pequenos, uma branch por tarefa (`feature/`, `fix/`, `docs/`), sem `Co-Authored-By`. Push, PR e merge só quando o usuário pedir.

## Contrato com o back

Base `/api/v1`. Tudo exige Bearer, exceto `auth/login` e `auth/register`.

| Método e caminho | Uso |
|---|---|
| `POST /auth/login`, `POST /auth/register` | devolvem `{ token, email, role, tenantId }`; register recebe `tenantName`, `tenantSlug`, `name`, `email`, `password` |
| `GET /auth/me` | `{ user: { id, name, email, role, tenant } }` |
| `GET /products?page&size&sort` | paginado: `{ content, page: { size, number, totalElements, totalPages } }` |
| `GET /products/critical`, `GET /products/out-of-stock` | listas simples |
| `PATCH /products/{id}/min-stock` | corpo `{ minStock }` |
| `GET /alerts/history?page&size` | paginado, mesmo formato |
| `GET/POST /alerts/config`, `DELETE /alerts/config/{id}` | canais EMAIL/PUSH |
| `POST /alerts/report?days=7\|30` | gera relatório por e-mail |
| `GET/POST /users` | listar e criar operador (só ADMIN; 403 caso contrário) |
| `GET /push/vapid-key`, `POST/DELETE /push/subscribe` | Web Push |
| `POST /events/ticket`, `GET /events?ticket=` | SSE |

Os controllers do back para todos esses caminhos existem. Registro público tem rate limit (429), tratado na tela de cadastro; slug segue `^[a-z0-9]+(-[a-z0-9]+)*$`.

## Pendências

- **Redesign visual** a fazer: o CSS atual é provisório (register reaproveita o SCSS do login). Preserve a estrutura e os tokens de cor.
- **Sem UI para criar produtos** nem **registrar movimentações de estoque** (entrada/saída): a listagem só lê e edita o estoque mínimo.
- Mensagens de erro de alertas e produtos ainda são texto fixo, sem passar por `apiErrorMessage` (ex.: erro de validação 400/422 do back não aparece).
- Settings faz polling de 20 s em `alerts/config` além do SSE, como fallback.
- Não há guard de papel nas rotas nem renovação/validação de token no cliente.
