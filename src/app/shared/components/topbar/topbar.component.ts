import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <div class="topbar__brand">
        <span class="topbar__logo" aria-hidden="true">M</span>
        <div class="topbar__titles">
          <span class="topbar__name">Meiliy Cosméticos</span>
          <span class="topbar__module">Gestão de Estoque</span>
        </div>
      </div>

      <nav class="topbar__nav" aria-label="Navegação principal">
        <a routerLink="/dashboard"  routerLinkActive="nav-link--active" class="nav-link">Dashboard</a>
        <a routerLink="/products"   routerLinkActive="nav-link--active" class="nav-link">Produtos</a>
        <a routerLink="/alerts"     routerLinkActive="nav-link--active" class="nav-link">Alertas</a>
        <a routerLink="/settings"   routerLinkActive="nav-link--active" class="nav-link">Configurações</a>
      </nav>

      <div class="topbar__actions">
        <button
          class="btn-theme"
          (click)="theme.toggle()"
          [attr.aria-label]="theme.theme() === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'"
        >
          @if (theme.theme() === 'dark') {
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          } @else {
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          }
        </button>

        <button class="btn-logout" (click)="auth.logout()" aria-label="Encerrar sessão">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span class="btn-logout__label">Sair</span>
        </button>
      </div>
    </header>

    <!-- Bottom nav — visível apenas em mobile -->
    <nav class="bottom-nav" aria-label="Navegação mobile">
      <a routerLink="/dashboard"  routerLinkActive="bnav-link--active" class="bnav-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        <span>Dashboard</span>
      </a>
      <a routerLink="/products"   routerLinkActive="bnav-link--active" class="bnav-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <span>Produtos</span>
      </a>
      <a routerLink="/alerts"     routerLinkActive="bnav-link--active" class="bnav-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span>Alertas</span>
      </a>
      <a routerLink="/settings"   routerLinkActive="bnav-link--active" class="bnav-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span>Config.</span>
      </a>
    </nav>
  `,
  styles: [`
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      height: 56px;
      background: var(--color-primary);
      border-bottom: 1px solid rgba(255,255,255,.06);
      flex-shrink: 0;
      gap: 24px;
    }

    .topbar__brand {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .topbar__logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: var(--color-brand);
      border-radius: 6px;
      color: #fff;
      font-size: .8125rem;
      font-weight: 800;
      letter-spacing: -.01em;
      flex-shrink: 0;
    }

    .topbar__titles {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .topbar__name {
      color: rgba(255,255,255,.9);
      font-size: .875rem;
      font-weight: 600;
      letter-spacing: -.01em;
      line-height: 1;
    }

    .topbar__module {
      color: rgba(255,255,255,.35);
      font-size: .6875rem;
      font-weight: 400;
      line-height: 1;
    }

    .topbar__nav {
      display: flex;
      align-items: center;
      gap: 2px;
      flex: 1;
    }

    .topbar__actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .nav-link {
      padding: 6px 11px;
      color: rgba(255,255,255,.45);
      font-size: .8125rem;
      font-weight: 500;
      border-radius: 5px;
      transition: color .12s, background .12s;
    }
    .nav-link:hover    { color: rgba(255,255,255,.85); background: rgba(255,255,255,.06); }
    .nav-link--active  { color: #fff; background: rgba(255,255,255,.10); }

    .btn-theme {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 6px;
      color: rgba(255,255,255,.5);
      transition: color .12s, border-color .12s, background .12s;
      &:hover { color: rgba(255,255,255,.9); border-color: rgba(255,255,255,.28); background: rgba(255,255,255,.06); }
    }

    .btn-logout {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 11px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 6px;
      color: rgba(255,255,255,.45);
      font-size: .8125rem;
      font-weight: 500;
      transition: color .12s, border-color .12s, background .12s;
      &:hover { color: rgba(255,255,255,.9); border-color: rgba(255,255,255,.28); background: rgba(255,255,255,.06); }
    }

    /* ── Bottom nav (mobile only) ── */
    .bottom-nav { display: none; }

    @media (max-width: 640px) {
      .topbar {
        padding: 0 16px;
        gap: 12px;
      }
      .topbar__module  { display: none; }
      .topbar__nav     { display: none; }
      .btn-logout__label { display: none; }
      .btn-logout { padding: 5px 8px; }

      .bottom-nav {
        display: flex;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 60px;
        background: var(--color-primary);
        border-top: 1px solid rgba(255,255,255,.08);
        z-index: 100;
        justify-content: space-around;
        align-items: stretch;
        padding-bottom: env(safe-area-inset-bottom);
      }

      .bnav-link {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        flex: 1;
        color: rgba(255,255,255,.4);
        font-size: .625rem;
        font-weight: 500;
        letter-spacing: .02em;
        transition: color .12s;
        padding: 8px 4px;
        -webkit-tap-highlight-color: transparent;
      }
      .bnav-link:hover        { color: rgba(255,255,255,.7); }
      .bnav-link--active      { color: var(--color-brand); }
      .bnav-link--active svg  { stroke: var(--color-brand); }
    }
  `]
})
export class TopbarComponent {
  readonly auth  = inject(AuthService);
  readonly theme = inject(ThemeService);
}
