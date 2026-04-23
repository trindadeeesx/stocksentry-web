import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertService } from '../../core/services/alert.service';
import { ToastService } from '../../core/services/toast.service';
import { AlertResponse, AlertStatus, AlertType } from '../../core/models/alert.model';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { BrDatePipe } from '../../shared/pipes/br-date.pipe';

type Filter = 'all' | AlertStatus | AlertType;

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [TopbarComponent, BrDatePipe],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.scss'
})
export class AlertsComponent implements OnInit {
  private readonly alertService = inject(AlertService);
  private readonly toast        = inject(ToastService);
  private readonly destroyRef   = inject(DestroyRef);

  readonly loading     = signal(true);
  readonly rows        = signal<AlertResponse[]>([]);
  readonly totalPages  = signal(0);
  readonly currentPage = signal(0);
  readonly filter      = signal<Filter>('all');

  readonly reportLoading = signal(false);

  readonly filtered = computed(() => {
    const f = this.filter();
    const list = this.rows();
    if (f === 'all') return list;
    return list.filter(r => r.status === f || r.type === f);
  });

  ngOnInit(): void { this.loadPage(0); }

  loadPage(page: number): void {
    this.loading.set(true);
    this.alertService.getHistory(page).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.rows.set(res.content);
        this.totalPages.set(res.totalPages);
        this.currentPage.set(res.number);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Erro ao carregar histórico de alertas.');
      }
    });
  }

  setFilter(f: Filter): void {
    this.filter.set(f);
    this.loadPage(0);
  }

  generateReport(days: 7 | 30): void {
    if (this.reportLoading()) return;
    this.reportLoading.set(true);
    this.alertService.generateReport(days).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.reportLoading.set(false);
        this.toast.success(res.message);
      },
      error: () => {
        this.reportLoading.set(false);
        this.toast.error('Erro ao gerar relatório.');
      }
    });
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i);
  }
}
