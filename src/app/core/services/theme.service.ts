import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.load());

  init(): void { this.apply(this.theme()); }

  toggle(): void {
    this.setTheme(this.theme() === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    this.apply(theme);
    localStorage.setItem('stocksentry_theme', theme);
  }

  private load(): Theme {
    const stored = localStorage.getItem('stocksentry_theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private apply(theme: Theme): void {
    const el = document.documentElement;
    el.classList.add('theme-transitioning');
    el.setAttribute('data-theme', theme);
    setTimeout(() => el.classList.remove('theme-transitioning'), 280);
  }
}
