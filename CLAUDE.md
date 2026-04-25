# CLAUDE.md — StockSentry Frontend

> **Documento de contrato frontend × backend.**
> Descreve o que o frontend faz, o que exibe, o que permite o usuário alterar, e exatamente quais endpoints consome — incluindo formato de request e response esperado.

---

## Visão geral

**StockSentry** é um painel administrativo de monitoramento de estoque em tempo real para a Meiliy Cosméticos. Usuário único: o dono da loja. O frontend é uma SPA Angular servida estáticamente; o backend é um Spring Boot rodando em `http://localhost:8080`.

**Stack frontend:** Angular 21 · Standalone Components · Angular Signals · RxJS (apenas onde HttpClient exige) · SCSS puro com CSS custom properties · Vitest para testes · sem Tailwind, sem Bootstrap, sem Axios.

---

## Comandos de desenvolvimento

```bash
ng serve                                              # dev → http://localhost:4200 (proxya /api → localhost:8080)
ng build --configuration production                   # build de produção
npx vitest run                                        # testes (single run)
ng lint
```

---

## Arquitetura de arquivos

```
src/app/
  core/
    guards/         authGuard — CanActivateFn, checa token no localStorage
    interceptors/   authInterceptor (Bearer header), errorInterceptor (retry + 401 → /login)
    models/         interfaces TypeScript (sem classes): alert, auth, product, sync
    services/       auth, product, alert, sync, settings, theme, toast, sse, push
  features/
    login/          página de autenticação
    dashboard/      visão geral + polling reativo + painel debug PDV
    products/       listagem + edição inline de estoque mínimo
    alerts/         histórico de alertas + geração de relatório
    settings/       configurações da conta, sync, canais de alerta, UI
    not-found/      página 404
  shared/
    components/
      topbar/       barra de navegação global (desktop + mobile bottom nav)
      toast/        container de notificações posicionável
    pipes/
      br-date       formata ISO 8601 → dd/MM/yyyy HH:mm (pt-BR)
src/styles/
  _variables.scss   CSS custom properties (light + dark theme)
  _reset.scss
  _typography.scss
  _skeleton.scss
  styles.scss
src/environments/
  environment.ts          apiUrl: '' (usa proxy em dev)
  environment.prod.ts     apiUrl: window.__env?.apiUrl ?? ''
public/sw.js              service worker para Web Push
proxy.conf.json           proxia /api → http://localhost:8080 em dev
```

---

## Rotas (todas lazy-loaded)

| Rota | Componente | Guard |
|---|---|---|
| `/login` | LoginComponent | — |
| `/` | → redirect `/dashboard` | authGuard |
| `/dashboard` | DashboardComponent | authGuard |
| `/products` | ProductsComponent | authGuard |
| `/alerts` | AlertsComponent | authGuard |
| `/settings` | SettingsComponent | authGuard |
| `/404` | NotFoundComponent | — |
| `/**` | → redirect `/404` | — |

`authGuard` verifica `localStorage.getItem('stocksentry_token')`. Se ausente, redireciona para `/login`.

---

## Autenticação

- Token JWT armazenado em `localStorage` na chave `stocksentry_token`.
- `authInterceptor` injeta `Authorization: Bearer <token>` em **todas** as requisições.
- `errorInterceptor` faz retry automático (1x, delay 800ms) apenas para erros de rede/servidor (5xx). Erros 4xx não são retentados. Em caso de 401, limpa o token e redireciona para `/login`.
- Login redireciona automaticamente para `/dashboard` se já houver token válido.
- Ao fazer login, `AuthService` também chama `SseService.connect()`.

---

## Tempo real — SSE (Server-Sent Events)

`SseService` abre um `EventSource` em `GET /api/v1/events?token={jwt}` logo após o login.

**Tipos de evento:**

| Tipo | Quem escuta | Ação |
|---|---|---|
| `sync` | DashboardComponent, ProductsComponent | Refaz fetch de dados imediatamente |
| `alert` | AlertsComponent | Refaz fetch do histórico de alertas |
| `config` | AppComponent, SettingsComponent | Sincroniza estado de push; SettingsComponent também recarrega configs |
| `heartbeat` | — | Mantém conexão viva (ignorado pelos componentes) |

- Reconecta automaticamente quando a aba volta a ser visível (`visibilitychange`).
- O token é passado via query string (EventSource não suporta headers customizados).
- `AppComponent` escuta `config` para chamar `PushService.syncWithConfigs()`.
- `SettingsComponent` tem fallback de polling de 20s para `config` além do SSE.

---

## Páginas — o que o usuário vê e faz

### Login (`/login`)

**Exibe:**
- Logotipo + nome da empresa
- Formulário com campos e-mail e senha
- Validação inline (campo obrigatório, formato de e-mail)
- Estado de carregamento no botão ("Entrando...")
- Toast de erro para credenciais inválidas (401/403) ou falha de conexão

**Ação:** `POST /api/v1/auth/login`

---

### Dashboard (`/dashboard`)

**Exibe:**
- Timestamp da última sincronização ("Última sync: dd/MM/yyyy HH:mm")
- 5 cards de estatísticas: **Críticos**, **Zerados**, **Criados**, **Atualizados**, **Recuperados** (dados da última sync)
- Tabela **Estoque Crítico**: nome, SKU, estoque atual (com chip colorido), estoque mínimo — até 15 itens, link "ver todos" se houver mais
- Tabela **Estoque Zerado**: nome, SKU, unidade, estoque mínimo
- Estados de skeleton loading em todos os elementos enquanto carrega
- Empty states ("Tudo normal", "Nenhum produto com estoque zerado")
- Botão **Forçar Sync** com spinner durante operação
- **Painel debug PDV** (toggle): lista produtos do PDV com edição inline de estoque + botão de sync manual

**Polling reativo:** ao entrar na página, dispara `POST /api/v1/sync/now` imediatamente, depois faz fetch dos dados. Intervalo de polling configurável via backend (padrão 5 min); quando o usuário altera nas Configurações, o `interval$` do dashboard se recria automaticamente via `toObservable + switchMap`. SSE `sync` também dispara `fetchAll()`.

**Ações do usuário:**
- Clicar em **Forçar Sync** → `POST /api/v1/sync/now` + refresh dos dados
- (Debug) Editar estoque de produto no PDV → `PATCH /api/v1/debug/pdv/products/{id}/stock`
- (Debug) Sync manual pós-edição → `POST /api/v1/sync/now`

**Endpoints consumidos:**
- `POST /api/v1/sync/now`
- `GET /api/v1/sync/status`
- `GET /api/v1/products/critical`
- `GET /api/v1/products/out-of-stock`
- `GET /api/v1/settings` (ao entrar, para carregar o intervalo de polling)
- `GET /api/v1/debug/pdv/products` (painel debug)
- `PATCH /api/v1/debug/pdv/products/{id}/stock` — body: `{ "estoque": number }` (painel debug)

---

### Produtos (`/products`)

**Exibe:**
- Filtros: **Todos** (paginado) · **Críticos** · **Zerados**
- Tabela com colunas: Produto, SKU, Un., Estoque, Mínimo, Status, Ações
- Chip de estoque: vermelho escuro (zerado), laranja (crítico), sem destaque (normal)
- Badge de status: `Zerado` · `Crítico` · `Normal`
- Edição inline de estoque mínimo: campo numérico + botões Salvar / Cancelar diretamente na linha
- Paginação numérica (Anterior / páginas / Próxima) — apenas quando `filter = 'all'`
- Skeleton loading (8 linhas) durante carregamento

**Atualização em tempo real:** SSE `sync` dispara reload da lista atual.

**Ações do usuário:**
- Alternar filtro → recarrega lista do endpoint correspondente
- Navegar entre páginas (apenas no filtro "Todos")
- Clicar **Editar mín.** → edição inline ativada na linha
- Salvar novo valor mínimo → `PATCH /api/v1/products/{id}/min-stock`
- Cancelar edição → descarta alteração

**Endpoints consumidos:**
- `GET /api/v1/products?page={n}&size=20&sort=name,asc`
- `GET /api/v1/products/critical`
- `GET /api/v1/products/out-of-stock`
- `PATCH /api/v1/products/{id}/min-stock` — body: `{ "minStock": number }`

---

### Alertas (`/alerts`)

**Exibe:**
- Filtros: **Todos** · **Enviados** (SENT) · **Falhos** (FAILED) · **E-mail** · **Push**
- Tabela com colunas: Data/Hora, Produto, Tipo, Destino, Status
- Chip de tipo: `EMAIL` / `PUSH`
- Chip de status: `Enviado` (verde) / `Falhou` (vermelho)
- Data formatada em pt-BR via `brDate` pipe
- Paginação numérica
- Skeleton loading (8 linhas)
- Empty state ("Nenhum alerta encontrado.")

**Atualização em tempo real:** SSE `alert` dispara reload da página atual.

**Ações do usuário:**
- Alternar filtro → filtra localmente a página atual (sem nova requisição)
- Navegar páginas → nova requisição com a página selecionada
- Clicar **Relatório 7 dias** → `POST /api/v1/alerts/report?days=7`
- Clicar **Relatório 30 dias** → `POST /api/v1/alerts/report?days=30`

**Endpoints consumidos:**
- `GET /api/v1/alerts/history?page={n}&size=20`
- `POST /api/v1/alerts/report?days={7|30}` — response: `{ message: string }`

---

### Configurações (`/settings`)

Dividida em 5 seções:

#### Aparência
- Seleção de tema **Claro / Escuro** — persiste em `localStorage`, aplica imediatamente. Detecta `prefers-color-scheme` na primeira visita.

#### Sincronização automática
- Select com opções: 1 min, 2 min, 5 min, 10 min, 15 min, 30 min, 1 hora
- Botão **Salvar intervalo** → `PATCH /api/v1/settings` — atualiza o backend e o polling do dashboard reage imediatamente (sem reload)
- Estado de carregamento no botão ("Salvando...")

#### Canais de alerta
- Lista de canais configurados (tipo + destino) com botão de remoção (confirm nativo)
- Formulário de adição: select Tipo (EMAIL / PUSH) + campo Destino + botão Adicionar
- Validação de formato de e-mail no frontend antes de enviar
- Toast de sucesso/erro para cada operação
- SSE `config` + polling de 20s atualizam a lista automaticamente

#### Push notifications
- Exibe o status atual da subscrição push deste dispositivo
- Botão **Ativar notificações** ou **Desativar** conforme o estado
- Status possíveis: `unsupported` · `denied` · `not-subscribed` · `subscribing` · `subscribed`

#### Notificações na tela
- Select de posição do toast: 6 opções (superior/inferior × esquerda/centro/direita)
- Persiste apenas em `localStorage` (preferência puramente visual)

#### Conta
- Exibe nome, e-mail e role do usuário logado (avatar com inicial)
- Botão **Encerrar sessão** → limpa token + desconecta SSE + redireciona para `/login`

**Endpoints consumidos:**
- `GET /api/v1/auth/me`
- `GET /api/v1/alerts/config`
- `POST /api/v1/alerts/config` — body: `{ "type": "EMAIL"|"PUSH", "destination": string }`
- `DELETE /api/v1/alerts/config/{id}`
- `GET /api/v1/settings`
- `PATCH /api/v1/settings` — body: `{ "syncIntervalMs": number }`

---

## Contrato completo de endpoints

> Todos os endpoints exigem `Authorization: Bearer <token>`, exceto `POST /api/v1/auth/login` e `GET /api/v1/push/vapid-key`.

### Auth

```
POST /api/v1/auth/login
Body:    { "email": string, "password": string }
200 OK:  { "token": string, "email": string, "role": string }

GET /api/v1/auth/me
200 OK:  { "id": string, "name": string, "email": string, "role": string }
```

### Products

```
GET /api/v1/products?page=0&size=20&sort=name,asc
200 OK: {
  "content": ProductResponse[],
  "totalElements": number,
  "totalPages": number,
  "number": number,
  "size": number
}

GET /api/v1/products/critical
200 OK: ProductResponse[]

GET /api/v1/products/out-of-stock
200 OK: ProductResponse[]

PATCH /api/v1/products/{id}/min-stock
Body:    { "minStock": number }
200 OK:  ProductResponse

ProductResponse: {
  "id": string,
  "name": string,
  "sku": string,
  "unit": "UN" | "KG" | "L" | "CX",
  "currentStock": number,
  "minStock": number,
  "active": boolean,
  "critical": boolean,
  "createdAt": string  // ISO 8601
}
```

### Alerts

```
GET /api/v1/alerts/config
200 OK: AlertConfigResponse[]

POST /api/v1/alerts/config
Body:    { "type": "EMAIL" | "PUSH", "destination": string }
200 OK:  AlertConfigResponse

DELETE /api/v1/alerts/config/{id}
204 No Content

AlertConfigResponse: {
  "id": string,
  "type": "EMAIL" | "PUSH",
  "destination": string,
  "active": boolean
}

GET /api/v1/alerts/history?page=0&size=20
200 OK: {
  "content": AlertResponse[],
  "totalElements": number,
  "totalPages": number,
  "number": number,
  "size": number
}

AlertResponse: {
  "id": string,
  "productName": string,
  "type": "EMAIL" | "PUSH",
  "destination": string,
  "status": "SENT" | "FAILED",
  "triggeredAt": string  // ISO 8601
}

POST /api/v1/alerts/report?days=7
POST /api/v1/alerts/report?days=30
200 OK: { "message": string }
```

### Sync

```
POST /api/v1/sync/now
200 OK: (qualquer body — frontend ignora)

GET /api/v1/sync/status
200 OK: {
  "lastSyncAt": string,     // ISO 8601
  "lastCreated": number,
  "lastUpdated": number,
  "lastCritical": number,
  "lastRecovered": number
}
```

### Settings

```
GET /api/v1/settings
200 OK: { "syncIntervalMs": number }

PATCH /api/v1/settings
Body:    { "syncIntervalMs": number }
200 OK:  { "syncIntervalMs": number }
```

### Push Notifications

```
GET /api/v1/push/vapid-key          (sem auth)
200 OK: { "publicKey": string }

POST /api/v1/push/subscribe
Body:    { "endpoint": string, "p256dh": string, "auth": string, "deviceName": string }
200 OK: (qualquer body)

DELETE /api/v1/push/subscribe?endpoint={url}
204 No Content
```

### SSE

```
GET /api/v1/events?token={jwt}      (auth via query string)
Content-Type: text/event-stream

Eventos: sync | alert | config | heartbeat
```

### Debug PDV (desenvolvimento)

```
GET /api/v1/debug/pdv/products
200 OK: PdvProduct[]

PATCH /api/v1/debug/pdv/products/{id}/stock
Body:    { "estoque": number }
200 OK: (qualquer body)

PdvProduct: {
  "id": number,
  "codigo": string,
  "nome": string,
  "estoque": number,
  "unidade": string
}
```

---

## Lógica de status de estoque

| Condição | Label | Visual |
|---|---|---|
| `currentStock === 0` | Zerado | chip vermelho escuro |
| `currentStock < minStock` (`critical: true`) | Crítico | chip laranja/vermelho |
| caso contrário | Normal | chip neutro/verde |

O campo `critical` retornado pelo backend deve espelhar `currentStock < minStock`.

---

## Comportamentos notáveis

- **Polling reativo:** o intervalo de polling do dashboard é um signal derivado do backend. Alterar via Configurações → o `interval$` do dashboard se recria automaticamente via `toObservable + switchMap`, sem reload de página.
- **SSE:** complementa o polling — qualquer evento `sync` do backend atualiza o dashboard imediatamente, independente do intervalo configurado.
- **Skeleton loading:** todas as páginas exibem placeholders animados enquanto aguardam resposta do backend — nunca uma tela em branco.
- **Toast system:** notificações posicionáveis (6 posições), máximo 5 simultâneos, auto-dismiss (4s success/info, 5s error), animação de entrada e saída.
- **Dark mode:** persiste em `localStorage`, detecta `prefers-color-scheme` na primeira visita, aplica via `data-theme` no `<html>`.
- **Retry automático:** erros de rede/servidor (5xx) são retentados 1 vez com delay de 800ms. Erros 4xx (incluindo 401) não são retentados.
- **LocalStorage como cache:** o `syncIntervalMs` é cacheado localmente como fallback offline — o backend é a fonte de verdade, e o valor é atualizado ao abrir o dashboard.
- **Push notifications:** `PushService` gerencia o ciclo de vida completo (pedir permissão, subscrever no navegador, registrar endpoint no backend, revogar). O nome do dispositivo é gerado e persistido em `localStorage`.
- **Mobile:** topbar fixa no topo (desktop) + nav de ícones no rodapé fixo (mobile, 60px). `styles.scss` adiciona `padding-bottom` para compensar no conteúdo.

---

## Variáveis CSS (tokens de design)

```scss
// Cores — modo claro
--color-brand:          #DC1960   // rosa Meiliy
--color-primary:        #020000   // topbar (preto absoluto, não muda com o tema)

--color-danger:         #c0392b
--color-warning:        #d97706
--color-success:        #16a34a
--color-info:           #2b6cb0

--color-bg:             #f4f4f5   // fundo das páginas
--color-surface:        #ffffff   // cards, tabelas
--color-surface-hover:  #f5f5f7
--color-border:         #e4e4e7
--color-text:           #18181b
--color-text-muted:     #71717a

// Espaçamento
--spacing-xs: 4px  |  --spacing-sm: 8px  |  --spacing-md: 16px
--spacing-lg: 24px |  --spacing-xl: 32px

// Bordas
--radius-sm: 5px  |  --radius-md: 8px  |  --radius-lg: 12px

// Sombras
--shadow-sm  |  --shadow-md  |  --shadow-lg
```

Tema escuro via `[data-theme="dark"]`: inverte surfaces, ajusta status colors e sombras. `--color-primary` e `--color-brand` **não mudam** com o tema.

---

## Restrições técnicas

- Sem Tailwind, sem Bootstrap — SCSS puro com custom properties
- Sem Axios — `HttpClient` do Angular exclusivamente
- `signal()` sobre `BehaviorSubject` sempre que possível
- `ChangeDetectionStrategy.OnPush` em todos os componentes de feature
- Todos os componentes são standalone (sem NgModules)
- Rotas usam `loadComponent` (lazy loading)
- Backend retorna datas em ISO 8601; frontend formata com `BrDatePipe` → `dd/MM/yyyy HH:mm`
- Paginação Spring: `{ content, totalElements, totalPages, number, size }`
- Em desenvolvimento, `proxy.conf.json` proxia `/api` para `localhost:8080` — `environment.apiUrl` é `''`
- Em produção, `apiUrl` vem de `window.__env.apiUrl` injetado no HTML
