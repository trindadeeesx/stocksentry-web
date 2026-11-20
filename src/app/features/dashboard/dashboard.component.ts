import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, merge, of, switchMap, tap } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';
import { SseService } from '../../core/services/sse.service';
import { ProductResponse } from '../../core/models/product.model';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, TopbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly toast          = inject(ToastService);
  private readonly destroyRef     = inject(DestroyRef);
  private readonly sse            = inject(SseService);

  readonly criticalProducts = signal<ProductResponse[]>([]);
  readonly outOfStock       = signal<ProductResponse[]>([]);
  readonly loading          = signal(true);
  readonly refreshing       = signal(false);

  ngOnInit(): void {
    this.fetchAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

    // SSE: alerta disparado ou config alterada → números podem ter mudado
    merge(this.sse.on('alert'), this.sse.on('config')).pipe(
      switchMap(() => this.fetchAll()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  refresh(): void {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    this.fetchAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      this.refreshing.set(false);
      if (!result) this.toast.error('Falha ao atualizar dados. Tente novamente.');
    });
  }

  private fetchAll() {
    return forkJoin({
      critical:   this.productService.getCritical(),
      outOfStock: this.productService.getOutOfStock()
    }).pipe(
      tap(({ critical, outOfStock }) => {
        this.criticalProducts.set(critical);
        this.outOfStock.set(outOfStock);
        this.loading.set(false);
      }),
      catchError(() => {
        this.loading.set(false);
        return of(null);
      })
    );
  }

  stockLabel(p: ProductResponse): string {
    return p.currentStock === 0 ? '0' : `${p.currentStock}`;
  }
}
