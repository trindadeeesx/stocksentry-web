import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
}

const MAX_TOASTS = 5;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  readonly toasts = signal<Toast[]>([]);

  success(message: string, duration = 4000): void { this.add(message, 'success', duration); }
  error(message: string,   duration = 5000): void { this.add(message, 'error',   duration); }
  info(message: string,    duration = 4000): void { this.add(message, 'info',    duration); }

  dismiss(id: number): void {
    this.toasts.update(list =>
      list.map(t => t.id === id ? { ...t, exiting: true } : t)
    );
    setTimeout(() => {
      this.toasts.update(list => list.filter(t => t.id !== id));
    }, 320);
  }

  private add(message: string, type: ToastType, duration: number): void {
    const id = ++this.counter;
    this.toasts.update(list => {
      const capped = list.length >= MAX_TOASTS ? list.slice(0, MAX_TOASTS - 1) : list;
      return [{ id, message, type, exiting: false }, ...capped];
    });
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }
}
