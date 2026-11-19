import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar — StockSentry',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        title: 'Dashboard — StockSentry',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'products',
        title: 'Produtos — StockSentry',
        loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent)
      },
      {
        path: 'alerts',
        title: 'Alertas — StockSentry',
        loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent)
      },
      {
        path: 'settings',
        title: 'Configurações — StockSentry',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },
  {
    path: '404',
    title: 'Não encontrado — StockSentry',
    loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent)
  },
  { path: '**', redirectTo: '404' }
];
