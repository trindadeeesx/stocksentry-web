import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type SseEventType = 'sync' | 'alert' | 'config' | 'heartbeat';

@Injectable({ providedIn: 'root' })
export class SseService {
  private es: EventSource | null = null;
  private readonly events$ = new Subject<SseEventType>();
  private visibilityHandler?: () => void;

  constructor(private readonly zone: NgZone) {}

  connect(): void {
    this.openEventSource();
    this.watchVisibility();
  }

  disconnect(): void {
    this.es?.close();
    this.es = null;
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = undefined;
    }
  }

  on(type: SseEventType): Observable<void> {
    return this.events$.pipe(filter(t => t === type), map(() => void 0));
  }

  private openEventSource(): void {
    const token = localStorage.getItem('stocksentry_token');
    if (!token) return;
    if (this.es && this.es.readyState !== EventSource.CLOSED) return;

    this.es?.close();
    const url = `${environment.apiUrl}/api/v1/events?token=${encodeURIComponent(token)}`;
    this.es = new EventSource(url);

    for (const type of ['sync', 'alert', 'config', 'heartbeat'] as SseEventType[]) {
      this.es.addEventListener(type, () => {
        this.zone.run(() => this.events$.next(type));
      });
    }

    this.es.onerror = () => {
      if (this.es?.readyState === EventSource.CLOSED) this.es = null;
    };
  }

  // Reconecta imediatamente quando o usuário volta pra aba/app
  private watchVisibility(): void {
    if (this.visibilityHandler) return;
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') this.openEventSource();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }
}
