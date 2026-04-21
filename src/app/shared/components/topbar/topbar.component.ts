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
        <span class="topbar__name">Meiliy Cosméticos</span>
        <span class="topbar__sep">·</span>
        <span class="topbar__module">Gestão de Estoque</span>
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
    .topbar__brand  { display: flex; align-items: center; gap: 10px; }
    .topbar__name   { color: var(--color-brand); font-size: .9375rem; font-weight: 700; letter-spacing: -.01em; }
    .topbar__sep    { color: rgba(255,255,255,.2); font-size: .75rem; }
    .topbar__module { color: rgba(255,255,255,.5); font-size: .8125rem; font-weight: 400; }
    .topbar__nav    { display: flex; align-items: center; gap: 2px; }
    .nav-link {
      padding: 5px 10px;
      color: rgba(255,255,255,.5);
      font-size: .8125rem;
      font-weight: 500;
      border-radius: 2px;
      transition: color .12s;
    }
    .nav-link:hover        { color: rgba(255,255,255,.85); }
    .nav-link--active      { color: #fff; background: rgba(255,255,255,.07); }
    .btn-logout {
      margin-left: 12px;
      padding: 5px 10px;
      border: 1px solid rgba(255,255,255,.15);
      border-radius: 2px;
      color: rgba(255,255,255,.5);
      font-size: .8125rem;
      font-weight: 500;
      transition: color .12s, border-color .12s;
    }
    .btn-logout:hover { color: rgba(255,255,255,.85); border-color: rgba(255,255,255,.35); }
  `]
})
export class TopbarComponent {
  readonly auth = inject(AuthService);
}
