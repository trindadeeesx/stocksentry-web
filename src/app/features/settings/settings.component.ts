import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { SettingsService } from '../../core/services/settings.service';
import { AlertConfigResponse, AlertConfigRequest } from '../../core/models/alert.model';
import { MeResponse } from '../../core/models/auth.model';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';

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
  readonly settingsService        = inject(SettingsService);

  // ── Conta ────────────────────────────────────────
  readonly currentUser   = signal<MeResponse | null>(null);
  readonly userLoading   = signal(true);

  // ── Sincronização ────────────────────────────────
  selectedInterval       = this.settingsService.syncIntervalMs();
  readonly syncSaved     = signal(false);

  // ── Configs de alerta ────────────────────────────
  readonly alertConfigs  = signal<AlertConfigResponse[]>([]);
  readonly configLoading = signal(true);
  readonly configSaving  = signal(false);
  readonly configError   = signal('');

  newType: 'EMAIL' | 'PUSH' = 'EMAIL';
  newDest = '';

  ngOnInit(): void {
    this.authService.fetchMe().subscribe({
      next: user => { this.currentUser.set(user); this.userLoading.set(false); },
      error: ()   => this.userLoading.set(false)
    });

    this.alertService.getConfig().subscribe({
      next: configs => { this.alertConfigs.set(configs); this.configLoading.set(false); },
      error: ()      => this.configLoading.set(false)
    });
  }

  saveSyncInterval(): void {
    this.settingsService.update({ syncIntervalMs: this.selectedInterval });
    this.syncSaved.set(true);
    setTimeout(() => this.syncSaved.set(false), 3000);
  }

  addConfig(): void {
    const dest = this.newDest.trim();
    if (!dest || this.configSaving()) return;

    this.configError.set('');
    this.configSaving.set(true);

    const body: AlertConfigRequest = { type: this.newType, destination: dest };
    this.alertService.addConfig(body).subscribe({
      next: created => {
        this.alertConfigs.update(list => [...list, created]);
        this.newDest = '';
        this.configSaving.set(false);
      },
      error: () => {
        this.configError.set('Erro ao adicionar configuração.');
        this.configSaving.set(false);
      }
    });
  }

  deleteConfig(id: string): void {
    this.alertService.deleteConfig(id).subscribe({
      next: () => this.alertConfigs.update(list => list.filter(c => c.id !== id)),
      error: () => this.configError.set('Erro ao remover configuração.')
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
