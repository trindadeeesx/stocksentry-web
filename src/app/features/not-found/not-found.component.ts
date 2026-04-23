import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="not-found">
      <div class="not-found__card">
        <p class="not-found__code">404</p>
        <h1 class="not-found__title">Página não encontrada</h1>
        <p class="not-found__desc">O endereço que você acessou não existe ou foi removido.</p>
        <a routerLink="/dashboard" class="not-found__link">Voltar ao Dashboard</a>
      </div>
    </div>
  `,
  styles: [`
    .not-found {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg);
      padding: var(--spacing-md);
    }
    .not-found__card {
      text-align: center;
      max-width: 380px;
    }
    .not-found__code {
      font-size: 5.5rem;
      font-weight: 800;
      color: var(--color-brand);
      line-height: 1;
      letter-spacing: -.05em;
      margin-bottom: var(--spacing-lg);
    }
    .not-found__title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: -.02em;
      margin-bottom: var(--spacing-sm);
    }
    .not-found__desc {
      font-size: .875rem;
      color: var(--color-text-muted);
      margin-bottom: var(--spacing-xl);
      line-height: 1.6;
    }
    .not-found__link {
      display: inline-block;
      padding: 9px 24px;
      background: var(--color-brand);
      color: #fff;
      border-radius: var(--radius-sm);
      font-size: .875rem;
      font-weight: 600;
      letter-spacing: .02em;
      transition: background .12s;
      &:hover { background: #b8154f; }
    }
  `]
})
export class NotFoundComponent {}
