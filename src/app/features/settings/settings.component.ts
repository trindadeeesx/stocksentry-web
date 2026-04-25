import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { interval, switchMap } from 'rxjs';
import { SseService } from '../../core/services/sse.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { PushService } from '../../core/services/push.service';
import { SettingsService, ToastPosition } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { ThemeService } from '../../core/services/theme.service';
import { AlertConfigResponse, AlertConfigRequest } from '../../core/models/alert.model';
import { MeResponse } from '../../core/models/auth.model';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [TopbarComponent, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent implements OnInit {
  private readonly authService    = inject(AuthService);
  private readonly alertService   = inject(AlertService);
  private readonly toast          = inject(ToastService);
  private readonly destroyRef     = inject(DestroyRef);
  readonly settingsService        = inject(SettingsService);
  readonly themeService           = inject(ThemeService);
  readonly pushService            = inject(PushService);
  private readonly sse            = inject(SseService);

  // ── Conta ────────────────────────────────────────
  readonly currentUser   = signal<MeResponse | null>(null);
  readonly userLoading   = signal(true);

  // ── Sincronização ────────────────────────────────
  selectedInterval       = this.settingsService.syncIntervalMs();

  // ── Toast position ───────────────────────────────
  selectedPosition: ToastPosition = this.settingsService.toastPosition();

  // ── Configs de alerta ────────────────────────────
  readonly alertConfigs  = signal<AlertConfigResponse[]>([]);
  readonly configLoading = signal(true);
  readonly configSaving   = signal(false);
  readonly savingInterval = signal(false);

  newType: 'EMAIL' | 'PUSH' = 'EMAIL';
  newDest = '';

  ngOnInit(): void {
    this.pushService.init();

    this.authService.fetchMe().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: user => { this.currentUser.set(user); this.userLoading.set(false); },
      error: ()   => this.userLoading.set(false)
    });

    this.alertService.getConfig().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: configs => {
        this.alertConfigs.set(configs);
        this.configLoading.set(false);
        this.pushService.syncWithConfigs(configs);
      },
      error: () => this.configLoading.set(false)
    });

    // SSE: config alterada em outro dispositivo → recarrega lista de canais
    this.sse.on('config').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.alertService.getConfig().subscribe(configs => this.alertConfigs.set(configs));
    });

    // Fallback: polling de 20s caso SSE não emita em alguma operação
    interval(20_000).pipe(
      switchMap(() => this.alertService.getConfig()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(configs => this.alertConfigs.set(configs));
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.themeService.setTheme(theme);
  }

  saveSyncInterval(): void {
    if (this.savingInterval()) return;
    this.savingInterval.set(true);
    this.settingsService.saveSyncInterval(this.selectedInterval).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.savingInterval.set(false);
        this.toast.success('Intervalo de sync salvo. Polling atualizado.');
      },
      error: () => {
        this.savingInterval.set(false);
        this.toast.error('Erro ao salvar intervalo de sync.');
      }
    });
  }

  saveToastPosition(): void {
    this.settingsService.update({ toastPosition: this.selectedPosition });
    this.toast.info('Posição das notificações atualizada.');
  }

  addConfig(): void {
    const dest = this.newDest.trim();
    if (!dest || this.configSaving()) return;

    if (this.newType === 'EMAIL' && !EMAIL_RE.test(dest)) {
      this.toast.error('Endereço de e-mail inválido.');
      return;
    }

    this.configSaving.set(true);
    const body: AlertConfigRequest = { type: this.newType, destination: dest };
    this.alertService.addConfig(body).subscribe({
      next: created => {
        this.alertConfigs.update(list => [...list, created]);
        this.newDest = '';
        this.configSaving.set(false);
        this.toast.success('Canal de alerta adicionado.');
      },
      error: () => {
        this.configSaving.set(false);
        this.toast.error('Erro ao adicionar configuração.');
      }
    });
  }

  pushConfigLabel(c: AlertConfigResponse, allConfigs: AlertConfigResponse[]): string {
    if (c.type !== 'PUSH') return c.destination;
    if (c.destination) return c.destination;

    const pushConfigs = allConfigs.filter(x => x.type === 'PUSH' && !x.destination);
    const localName   = this.pushService.localDeviceName;

    if (pushConfigs.length === 1) {
      return localName ? `${localName} — Este dispositivo` : 'Este dispositivo';
    }

    const idx = pushConfigs.findIndex(x => x.id === c.id);
    const isLocal = this.pushService.status() === 'subscribed' && idx === pushConfigs.length - 1;
    const label = `Dispositivo ${idx + 1}`;
    return isLocal ? `${label} — Este dispositivo` : label;
  }

  deleteConfig(id: string, destination: string): void {
    if (!confirm(`Remover o canal "${destination}"?`)) return;
    this.alertService.deleteConfig(id).subscribe({
      next: () => {
        this.alertConfigs.update(list => list.filter(c => c.id !== id));
        this.toast.info('Canal removido.');
      },
      error: () => this.toast.error('Erro ao remover configuração.')
    });
  }

  enablePush(): void {
    this.pushService.subscribe().then(() => {
      this.toast.success('Notificações push ativadas neste dispositivo.');
    }).catch(() => {
      const s = this.pushService.status();
      if (s === 'denied') {
        this.toast.error('Permissão negada. Habilite notificações nas configurações do navegador.');
      } else {
        this.toast.error('Não foi possível ativar as notificações push.');
      }
    });
  }

  disablePush(): void {
    const localName = this.pushService.localDeviceName;
    this.pushService.unsubscribe().then(() => {
      this.toast.info('Notificações push desativadas neste dispositivo.');

      const config = this.alertConfigs().find(
        c => c.type === 'PUSH' && (localName ? c.destination === localName : true)
      );
      if (config) {
        this.alertService.deleteConfig(config.id).subscribe({
          next: () => this.alertConfigs.update(list => list.filter(c => c.id !== config.id)),
          error: () => this.toast.error('Erro ao remover canal push da lista.')
        });
      }
    }).catch(() => {
      this.toast.error('Erro ao desativar notificações push.');
    });
  }

  logout(): void {
    this.toast.info('Sessão encerrada.');
    setTimeout(() => this.authService.logout(), 600);
  }
}
