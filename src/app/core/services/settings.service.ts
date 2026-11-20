import { computed, Injectable, signal } from '@angular/core';

export type ToastPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface AppSettings {
  toastPosition: ToastPosition;
}

const DEFAULTS: AppSettings = { toastPosition: 'bottom-right' };
const STORAGE_KEY = 'stocksentry_settings';

/** Preferências puramente locais (por navegador), guardadas em localStorage. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly _settings = signal<AppSettings>(this.loadLocal());

  readonly toastPosition = computed(() => this._settings().toastPosition);

  readonly positionOptions: { label: string; value: ToastPosition }[] = [
    { label: 'Superior esquerdo',  value: 'top-left'      },
    { label: 'Superior centro',    value: 'top-center'    },
    { label: 'Superior direito',   value: 'top-right'     },
    { label: 'Inferior esquerdo',  value: 'bottom-left'   },
    { label: 'Inferior centro',    value: 'bottom-center' },
    { label: 'Inferior direito',   value: 'bottom-right'  },
  ];

  update(patch: Partial<AppSettings>): void {
    const next = { ...this._settings(), ...patch };
    this._settings.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  private loadLocal(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULTS;
      // Ignora chaves antigas de versões anteriores que possam ter ficado salvas.
      const { toastPosition } = JSON.parse(raw) as Partial<AppSettings>;
      return { toastPosition: toastPosition ?? DEFAULTS.toastPosition };
    } catch {
      return DEFAULTS;
    }
  }
}
