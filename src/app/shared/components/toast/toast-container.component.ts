import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-wrap" [class]="'toast-wrap--' + settings.toastPosition()">
      @for (t of toast.toasts(); track t.id) {
        <div
          class="toast"
          [class]="'toast toast--' + t.type"
          [class.toast--exiting]="t.exiting"
          role="alert"
          aria-live="polite"
        >
          <span class="toast__icon" aria-hidden="true">
            @if (t.type === 'success') { ✓ }
            @else if (t.type === 'error') { ✕ }
            @else { i }
          </span>
          <span class="toast__msg">{{ t.message }}</span>
          <button class="toast__close" (click)="toast.dismiss(t.id)" aria-label="Fechar">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-wrap {
      position: fixed;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
      padding: 16px;
    }

    /* positions */
    .toast-wrap--top-left     { top: 0; left: 0; align-items: flex-start; }
    .toast-wrap--top-center   { top: 0; left: 50%; transform: translateX(-50%); align-items: center; }
    .toast-wrap--top-right    { top: 0; right: 0; align-items: flex-end; }
    .toast-wrap--bottom-left  { bottom: 0; left: 0; align-items: flex-start; flex-direction: column-reverse; }
    .toast-wrap--bottom-center{ bottom: 0; left: 50%; transform: translateX(-50%); align-items: center; flex-direction: column-reverse; }
    .toast-wrap--bottom-right { bottom: 0; right: 0; align-items: flex-end; flex-direction: column-reverse; }

    .toast {
      pointer-events: all;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 14px;
      border-radius: 8px;
      font-size: .8125rem;
      font-weight: 500;
      line-height: 1.4;
      min-width: 240px;
      max-width: 380px;
      box-shadow: 0 4px 20px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.06);
      border-left: 3px solid transparent;
      background: var(--color-surface);
      color: var(--color-text);
      animation: toast-in 200ms cubic-bezier(.16,1,.3,1) both;
    }

    .toast--exiting {
      animation: toast-out 280ms ease-in both;
    }

    .toast__icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      font-size: .625rem;
      font-weight: 700;
      line-height: 1;
    }

    .toast--success { border-left-color: var(--color-success); }
    .toast--success .toast__icon { background: rgba(22,163,74,.12); color: var(--color-success); }

    .toast--error   { border-left-color: var(--color-danger); }
    .toast--error   .toast__icon { background: rgba(192,57,43,.12); color: var(--color-danger); }

    .toast--info    { border-left-color: var(--color-info); }
    .toast--info    .toast__icon { background: rgba(43,108,176,.12); color: var(--color-info); }

    .toast__msg { flex: 1; }

    .toast__close {
      flex-shrink: 0;
      font-size: .6875rem;
      color: var(--color-text-muted);
      opacity: .5;
      padding: 3px 4px;
      line-height: 1;
      border-radius: 3px;
      transition: opacity .1s, background .1s;
      &:hover { opacity: 1; background: var(--color-surface-hover); }
    }

    @keyframes toast-in {
      from { opacity: 0; transform: translateY(8px) scale(.97); }
      to   { opacity: 1; transform: translateY(0)  scale(1); }
    }

    @keyframes toast-out {
      from { opacity: 1; max-height: 80px; margin-bottom: 0; }
      to   { opacity: 0; max-height: 0;    margin-bottom: -8px; }
    }
  `]
})
export class ToastContainerComponent {
  readonly toast    = inject(ToastService);
  readonly settings = inject(SettingsService);
}
