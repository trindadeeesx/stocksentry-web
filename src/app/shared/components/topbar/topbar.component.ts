import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <div class="topbar__brand">
        <span class="topbar__name">StockSentry</span>
        <span class="topbar__sep">|</span>
        <span class="topbar__client">Meiliy Cosméticos</span>
      </div>
      <nav class="topbar__nav">
        <a routerLink="/dashboard"  routerLinkActive="nav-link--active" class="nav-link">Dashboard</a>
        <a routerLink="/products"   routerLinkActive="nav-link--active" class="nav-link">Produtos</a>
        <a routerLink="/alerts"     routerLinkActive="nav-link--active" class="nav-link">Alertas</a>
        <a routerLink="/settings"   routerLinkActive="nav-link--active" class="nav-link">Configurações</a>
        <button class="btn-logout" (click)="auth.logout()">Sair</button>
      </nav>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      height: 52px;
      background: var(--color-primary);
      flex-shrink: 0;
    }
    .topbar__brand { display: flex; align-items: center; gap: 8px; }
    .topbar__name  { color: #fff; font-size: .9375rem; font-weight: 700; letter-spacing: -.01em; }
    .topbar__sep   { color: rgba(255,255,255,.25); font-weight: 300; }
    .topbar__client{ color: var(--color-brand); font-size: .875rem; font-weight: 500; }
    .topbar__nav   { display: flex; align-items: center; gap: 2px; }
    .nav-link {
      padding: 5px 10px;
      color: rgba(255,255,255,.55);
      font-size: .8125rem;
      font-weight: 500;
      border-radius: 2px;
      transition: color .12s;
    }
    .nav-link:hover, .nav-link--active { color: #fff; }
    .nav-link--active { background: rgba(255,255,255,.07); }
    .btn-logout {
      margin-left: 10px;
      padding: 5px 10px;
      border: 1px solid rgba(255,255,255,.2);
      border-radius: 2px;
      color: rgba(255,255,255,.55);
      font-size: .8125rem;
      font-weight: 500;
      transition: color .12s, border-color .12s;
    }
    .btn-logout:hover { color: #fff; border-color: rgba(255,255,255,.45); }
  `]
})
export class TopbarComponent {
  readonly auth = inject(AuthService);
}
