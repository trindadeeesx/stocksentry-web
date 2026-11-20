import { inject, Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subject, Observable, Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type SseEventType = 'alert' | 'config' | 'heartbeat';

const EVENT_TYPES: SseEventType[] = ['alert', 'config', 'heartbeat'];
const TOKEN_KEY = 'stocksentry_token';
const INITIAL_DELAY_MS = 2_000;
const MAX_DELAY_MS = 30_000;
/** Limite de tickets/streams estourado (429): espera bem mais antes de tentar de novo. */
const RATE_LIMITED_DELAY_MS = 60_000;

/**
 * Stream SSE autenticado por ticket de uso único.
 *
 * EventSource não manda header Authorization, e JWT na URL vaza em log.
 * Por isso cada conexão (e cada reconexão) pede um ticket novo em
 * POST /api/v1/events/ticket (o authInterceptor põe o Bearer) e abre
 * /api/v1/events?ticket=... O reconnect nativo do EventSource reusaria o
 * ticket já gasto, então no erro o stream é fechado e a reconexão é manual,
 * com backoff exponencial. Isso cobre também o fim do stream que o
 * servidor força a cada 30 min.
 */
@Injectable({ providedIn: 'root' })
export class SseService {
  private readonly http = inject(HttpClient);
  private readonly zone = inject(NgZone);
  private readonly base = environment.apiUrl;

  private readonly events$ = new Subject<SseEventType>();
  private es: EventSource | null = null;
  private ticketSub: Subscription | null = null;
  private requestingTicket = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = INITIAL_DELAY_MS;
  private active = false;
  private visibilityHandler?: () => void;

  connect(): void {
    this.active = true;
    this.watchVisibility();
    this.open();
  }

  disconnect(): void {
    this.active = false;
    this.clearRetry();
    this.ticketSub?.unsubscribe();
    this.ticketSub = null;
    this.requestingTicket = false;
    this.es?.close();
    this.es = null;
    this.retryDelay = INITIAL_DELAY_MS;
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = undefined;
    }
  }

  on(type: SseEventType): Observable<void> {
    return this.events$.pipe(filter(t => t === type), map(() => void 0));
  }

  private canConnect(): boolean {
    return this.active
      && !!localStorage.getItem(TOKEN_KEY)
      && document.visibilityState !== 'hidden';
  }

  private open(): void {
    if (!this.canConnect()) return;
    // Já conectado ou pedindo ticket: evita duas conexões simultâneas.
    if (this.es || this.requestingTicket) return;
    this.clearRetry();

    this.requestingTicket = true;
    this.ticketSub = this.http
      .post<{ ticket: string }>(`${this.base}/api/v1/events/ticket`, {})
      .subscribe({
        next: ({ ticket }) => {
          this.requestingTicket = false;
          this.ticketSub = null;
          if (!this.canConnect() || this.es) return;
          this.openStream(ticket);
        },
        error: (err: HttpErrorResponse) => {
          this.requestingTicket = false;
          this.ticketSub = null;
          // 401/403: sessão inválida; o errorInterceptor cuida do logout.
          if (err.status === 401 || err.status === 403) return;
          this.scheduleReconnect(err.status === 429 ? RATE_LIMITED_DELAY_MS : undefined);
        }
      });
  }

  private openStream(ticket: string): void {
    const es = new EventSource(`${this.base}/api/v1/events?ticket=${encodeURIComponent(ticket)}`);
    this.es = es;

    for (const type of EVENT_TYPES) {
      es.addEventListener(type, () => {
        this.retryDelay = INITIAL_DELAY_MS;
        this.zone.run(() => this.events$.next(type));
      });
    }

    es.onerror = () => {
      if (this.es !== es) return;
      es.close();
      this.es = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(delay?: number): void {
    // Aba oculta: o handler de visibilidade reabre quando o usuário voltar.
    if (!this.canConnect()) return;
    this.clearRetry();
    const wait = delay ?? this.retryDelay;
    if (delay === undefined) this.retryDelay = Math.min(this.retryDelay * 2, MAX_DELAY_MS);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.open();
    }, wait);
  }

  private clearRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  // Reconecta imediatamente quando o usuário volta pra aba/app
  private watchVisibility(): void {
    if (this.visibilityHandler) return;
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') this.open();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }
}
