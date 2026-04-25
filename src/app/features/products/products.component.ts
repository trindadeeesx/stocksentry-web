import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';
import { SseService } from '../../core/services/sse.service';
import { ProductResponse } from '../../core/models/product.model';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';

type Filter = 'all' | 'critical' | 'outofstock';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [TopbarComponent, FormsModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly toast          = inject(ToastService);
  private readonly sse            = inject(SseService);
  private readonly destroyRef     = inject(DestroyRef);

  readonly loading     = signal(true);
  readonly rows        = signal<ProductResponse[]>([]);
  readonly totalPages  = signal(0);
  readonly currentPage = signal(0);
  readonly filter      = signal<Filter>('all');

  readonly editingId    = signal<string | null>(null);
  readonly editingValue = signal(0);
  readonly saving       = signal(false);

  ngOnInit(): void {
    this.load();

    // SSE: recarrega lista quando uma sync é concluída no backend
    this.sse.on('sync').pipe(
      switchMap(() => {
        this.load();
        return [];
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  load(): void {
    const f = this.filter();
    this.loading.set(true);

    if (f === 'critical') {
      this.productService.getCritical().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: list => { this.rows.set(list); this.totalPages.set(0); this.loading.set(false); },
        error: () => { this.loading.set(false); this.toast.error('Erro ao carregar produtos críticos.'); }
      });
    } else if (f === 'outofstock') {
      this.productService.getOutOfStock().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: list => { this.rows.set(list); this.totalPages.set(0); this.loading.set(false); },
        error: () => { this.loading.set(false); this.toast.error('Erro ao carregar produtos zerados.'); }
      });
    } else {
      this.productService.getAll(this.currentPage()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => {
          this.rows.set(res.content);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => { this.loading.set(false); this.toast.error('Erro ao carregar produtos.'); }
      });
    }
  }

  setFilter(f: Filter): void {
    this.filter.set(f);
    this.currentPage.set(0);
    this.editingId.set(null);
    this.load();
  }

  goToPage(p: number): void {
    if (p < 0 || p >= this.totalPages()) return;
    this.currentPage.set(p);
    this.load();
  }

  startEdit(p: ProductResponse): void {
    this.editingId.set(p.id);
    this.editingValue.set(p.minStock);
  }

  cancelEdit(): void { this.editingId.set(null); }

  saveEdit(p: ProductResponse): void {
    if (this.saving()) return;
    const val = this.editingValue();
    if (val < 0) {
      this.toast.error('Estoque mínimo não pode ser negativo.');
      return;
    }
    this.saving.set(true);
    this.productService.updateMinStock(p.id, val).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        this.rows.update(list => list.map(r => r.id === updated.id ? updated : r));
        this.editingId.set(null);
        this.saving.set(false);
        this.toast.success('Estoque mínimo atualizado.');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Erro ao salvar estoque mínimo.');
      }
    });
  }

  statusLabel(p: ProductResponse): 'zero' | 'critical' | 'ok' {
    if (p.currentStock === 0) return 'zero';
    if (p.critical) return 'critical';
    return 'ok';
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i);
  }
}
