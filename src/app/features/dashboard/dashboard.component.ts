import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, interval, of, switchMap, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { SyncService } from '../../core/services/sync.service';
import { ProductService } from '../../core/services/product.service';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { SseService } from '../../core/services/sse.service';
import { SyncStatusResponse } from '../../core/models/sync.model';
import { ProductResponse } from '../../core/models/product.model';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';
import { BrDatePipe } from '../../shared/pipes/br-date.pipe';
import { environment } from '../../../environments/environment';

interface PdvProduct {
  id: number;
  codigo: string;
  nome: string;
  estoque: number;
  unidade: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, TopbarComponent, BrDatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly syncService     = inject(SyncService);
  private readonly productService  = inject(ProductService);
  private readonly settingsService = inject(SettingsService);
  private readonly toast           = inject(ToastService);
  private readonly destroyRef      = inject(DestroyRef);
  private readonly http            = inject(HttpClient);
  private readonly sse             = inject(SseService);

  // ── Debug PDV ──
  readonly debugOpen        = signal(false);
  readonly pdvProducts      = signal<PdvProduct[]>([]);
  readonly pdvLoading       = signal(false);
  readonly pdvSyncing       = signal(false);
  readonly editingId        = signal<number | null>(null);
  readonly editingEstoque   = signal<number>(0);

  private readonly interval$ = toObservable(this.settingsService.syncIntervalMs);

  readonly syncStatus       = signal<SyncStatusResponse | null>(null);
  readonly criticalProducts = signal<ProductResponse[]>([]);
  readonly outOfStock       = signal<ProductResponse[]>([]);
  readonly loading          = signal(true);
  readonly syncing          = signal(false);

  ngOnInit(): void {
    this.settingsService.loadFromBackend().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

    this.syncing.set(true);
    this.syncService.syncNow().pipe(
      catchError(() => {
        this.toast.error('Falha ao sincronizar na entrada.');
        return of(null);
      }),
      switchMap(() => this.fetchAll()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.interval$.pipe(
      switchMap(ms => interval(ms)),
      switchMap(() => this.fetchAll()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    // SSE: atualiza imediatamente quando o backend conclui uma sync
    this.sse.on('sync').pipe(
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

    this.syncService.syncNow().pipe(
      catchError(() => of(null)),
      switchMap(() => this.fetchAll())
    ).subscribe({
      next: (result) => {
        if (result) this.toast.success('Sync concluída com sucesso.');
        else        this.toast.error('Falha ao atualizar dados. Tente novamente.');
      },
      error: () => {
        this.syncing.set(false);
        this.toast.error('Falha ao sincronizar. Tente novamente.');
      }
    });
  }

  stockLabel(p: ProductResponse): string {
    return p.currentStock === 0 ? '0' : `${p.currentStock}`;
  }

  toggleDebug(): void {
    const open = !this.debugOpen();
    this.debugOpen.set(open);
    if (open && this.pdvProducts().length === 0) this.loadPdvProducts();
  }

  loadPdvProducts(): void {
    this.pdvLoading.set(true);
    this.http.get<PdvProduct[]>(`${environment.apiUrl}/api/v1/debug/pdv/products`).subscribe({
      next: (list) => { this.pdvProducts.set(list); this.pdvLoading.set(false); },
      error: () => { this.toast.error('Falha ao carregar produtos do PDV.'); this.pdvLoading.set(false); }
    });
  }

  startEdit(p: PdvProduct): void {
    this.editingId.set(p.id);
    this.editingEstoque.set(p.estoque);
  }

  cancelEdit(): void { this.editingId.set(null); }

  saveStock(p: PdvProduct): void {
    this.http.patch(`${environment.apiUrl}/api/v1/debug/pdv/products/${p.id}/stock`, { estoque: this.editingEstoque() }).subscribe({
      next: () => {
        this.editingId.set(null);
        this.loadPdvProducts();
        this.toast.success(`Estoque de "${p.nome}" atualizado no PDV.`);
      },
      error: () => this.toast.error('Falha ao atualizar estoque no PDV.')
    });
  }

  syncAfterEdit(): void {
    if (this.pdvSyncing()) return;
    this.pdvSyncing.set(true);
    this.syncService.syncNow().pipe(
      catchError(() => of(null)),
      switchMap(() => this.fetchAll())
    ).subscribe({
      next: (r) => {
        this.pdvSyncing.set(false);
        if (r) this.toast.success('Sync do PDV → StockSentry concluída.');
        else   this.toast.error('Falha ao sincronizar após edição.');
      },
      error: () => { this.pdvSyncing.set(false); this.toast.error('Falha ao sincronizar.'); }
    });
  }
}
