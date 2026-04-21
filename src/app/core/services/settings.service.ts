import { computed, Injectable, signal } from '@angular/core';

export interface AppSettings {
  syncIntervalMs: number;
}

const DEFAULTS: AppSettings = { syncIntervalMs: 300_000 };
const STORAGE_KEY = 'stocksentry_settings';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly _settings = signal<AppSettings>(this.load());

  readonly syncIntervalMs = computed(() => this._settings().syncIntervalMs);

  readonly intervalOptions: { label: string; value: number }[] = [
    { label: '1 minuto',   value: 60_000 },
    { label: '2 minutos',  value: 120_000 },
    { label: '5 minutos',  value: 300_000 },
    { label: '10 minutos', value: 600_000 },
    { label: '15 minutos', value: 900_000 },
    { label: '30 minutos', value: 1_800_000 },
    { label: '1 hora',     value: 3_600_000 },
  ];

  private load(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  }

  update(patch: Partial<AppSettings>): void {
    const next = { ...this._settings(), ...patch };
    this._settings.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  labelFor(ms: number): string {
    return this.intervalOptions.find(o => o.value === ms)?.label ?? `${ms / 60_000} min`;
  }
}
