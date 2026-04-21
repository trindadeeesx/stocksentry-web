import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AlertService } from '../../core/services/alert.service';
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

  readonly loading     = signal(true);
  readonly rows        = signal<AlertResponse[]>([]);
  readonly totalPages  = signal(0);
  readonly currentPage = signal(0);
  readonly filter      = signal<Filter>('all');

  readonly reportLoading  = signal(false);
  readonly reportFeedback = signal('');

  readonly filtered = computed(() => {
    const f = this.filter();
    const list = this.rows();
    if (f === 'all') return list;
    return list.filter(r => r.status === f || r.type === f);
  });

  ngOnInit(): void {
    this.loadPage(0);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.alertService.getHistory(page).subscribe({
      next: res => {
        this.rows.set(res.content);
        this.totalPages.set(res.totalPages);
        this.currentPage.set(res.number);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setFilter(f: Filter): void { this.filter.set(f); }

  generateReport(days: 7 | 30): void {
    if (this.reportLoading()) return;
    this.reportLoading.set(true);
    this.reportFeedback.set('');
    this.alertService.generateReport(days).subscribe({
      next: res => {
        this.reportFeedback.set(res.message);
        this.reportLoading.set(false);
        setTimeout(() => this.reportFeedback.set(''), 5000);
      },
      error: () => {
        this.reportFeedback.set('Erro ao gerar relatório.');
        this.reportLoading.set(false);
        setTimeout(() => this.reportFeedback.set(''), 5000);
      }
    });
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i);
  }
}
