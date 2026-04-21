import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, interval, of, switchMap, tap } from 'rxjs';
import { SyncService } from '../../core/services/sync.service';
import { ProductService } from '../../core/services/product.service';
import { SyncStatusResponse } from '../../core/models/sync.model';
import { ProductResponse } from '../../core/models/product.model';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { BrDatePipe } from '../../shared/pipes/br-date.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, TopbarComponent, BrDatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly syncService = inject(SyncService);
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);

  readonly syncStatus = signal<SyncStatusResponse | null>(null);
  readonly criticalProducts = signal<ProductResponse[]>([]);
  readonly outOfStock = signal<ProductResponse[]>([]);
  readonly loading = signal(true);
  readonly syncing = signal(false);
  readonly syncFeedback = signal<'success' | 'error' | null>(null);

  ngOnInit(): void {
    // Auto-sync on entry, then load data
    this.syncing.set(true);
    this.syncService.syncNow().pipe(
      catchError(() => of(null)),
      switchMap(() => this.fetchAll()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    // Background polling every 5 min (data only)
    interval(300_000).pipe(
      switchMap(() => this.fetchAll()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  private fetchAll() {
    return forkJoin({
      status:     this.syncService.getStatus(),
      critical:   this.productService.getCritical(),
      outOfStock: this.productService.getOutOfStock()
    }).pipe(
      tap(({ status, critical, outOfStock }) => {
        this.syncStatus.set(status);
        this.criticalProducts.set(critical);
        this.outOfStock.set(outOfStock);
        this.loading.set(false);
        this.syncing.set(false);
      }),
      catchError(() => {
        this.loading.set(false);
        this.syncing.set(false);
        return of(null);
      })
    );
  }

  forceSync(): void {
    if (this.syncing()) return;
    this.syncing.set(true);
    this.syncFeedback.set(null);

    this.syncService.syncNow().pipe(
      catchError(() => of(null)),
      switchMap(() => this.fetchAll())
    ).subscribe({
      next: () => {
        this.syncFeedback.set('success');
        setTimeout(() => this.syncFeedback.set(null), 4000);
      },
      error: () => {
        this.syncFeedback.set('error');
        this.syncing.set(false);
        setTimeout(() => this.syncFeedback.set(null), 4000);
      }
    });
  }

  stockLabel(p: ProductResponse): string {
    if (p.currentStock === 0) return '0';
    return `${p.currentStock}`;
  }
}
