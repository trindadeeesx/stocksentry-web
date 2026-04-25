import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast/toast-container.component';
import { ThemeService } from './core/services/theme.service';
import { SseService } from './core/services/sse.service';
import { PushService } from './core/services/push.service';
import { AlertService } from './core/services/alert.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  constructor() {
    inject(ThemeService).init();

    const sse  = inject(SseService);
    const push = inject(PushService);
    const alerts = inject(AlertService);

    if (localStorage.getItem('stocksentry_token')) {
      sse.connect();
    }

    // Em qualquer página: quando configs mudam, verifica se a subscription
    // local ainda existe no backend e desinscreve o SW se não existir mais.
    sse.on('config').subscribe(() => {
      if (push.status() !== 'subscribed') return;
      alerts.getConfig().subscribe(configs => push.syncWithConfigs(configs));
    });
  }
}
