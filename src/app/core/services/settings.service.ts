import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, tap } from 'rxjs';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ToastPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface AppSettings {
  syncIntervalMs: number;
  toastPosition: ToastPosition;
}

interface BackendConfig { syncIntervalMs: number; }

const DEFAULTS: AppSettings = { syncIntervalMs: 300_000, toastPosition: 'bottom-right' };
const STORAGE_KEY = 'stocksentry_settings';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  private readonly _settings = signal<AppSettings>(this.loadLocal());

  readonly syncIntervalMs = computed(() => this._settings().syncIntervalMs);
  readonly toastPosition  = computed(() => this._settings().toastPosition);

  readonly intervalOptions: { label: string; value: number }[] = [
    { label: '1 minuto',   value: 60_000 },
    { label: '2 minutos',  value: 120_000 },
    { label: '5 minutos',  value: 300_000 },
    { label: '10 minutos', value: 600_000 },
    { label: '15 minutos', value: 900_000 },
    { label: '30 minutos', value: 1_800_000 },
    { label: '1 hora',     value: 3_600_000 },
  ];

  readonly positionOptions: { label: string; value: ToastPosition }[] = [
    { label: 'Superior esquerdo',  value: 'top-left'      },
    { label: 'Superior centro',    value: 'top-center'    },
    { label: 'Superior direito',   value: 'top-right'     },
    { label: 'Inferior esquerdo',  value: 'bottom-left'   },
    { label: 'Inferior centro',    value: 'bottom-center' },
    { label: 'Inferior direito',   value: 'bottom-right'  },
  ];

  /** Busca o intervalo de sync do backend e atualiza o signal. */
  loadFromBackend(): Observable<void> {
    return this.http.get<BackendConfig>(`${this.base}/api/v1/settings`).pipe(
      tap(res => this.applySyncInterval(res.syncIntervalMs)),
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }

  /** Salva o intervalo de sync no backend e atualiza o signal em caso de sucesso. */
  saveSyncInterval(ms: number): Observable<void> {
    return this.http.patch<BackendConfig>(`${this.base}/api/v1/settings`, { syncIntervalMs: ms }).pipe(
      tap(res => this.applySyncInterval(res.syncIntervalMs)),
      map(() => void 0)
    );
  }

  /** Atualiza configurações puramente locais (UI preferences). */
  update(patch: Partial<Pick<AppSettings, 'toastPosition'>>): void {
    const next = { ...this._settings(), ...patch };
    this._settings.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  labelFor(ms: number): string {
    return this.intervalOptions.find(o => o.value === ms)?.label ?? `${ms / 60_000} min`;
  }

  private applySyncInterval(ms: number): void {
    this._settings.update(s => ({ ...s, syncIntervalMs: ms }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings()));
  }

  private loadLocal(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  }
}
