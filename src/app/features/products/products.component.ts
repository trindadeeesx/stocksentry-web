import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { ProductResponse } from '../../core/models/product.model';
import { TopbarComponent } from '../../shared/components/topbar/topbar.component';

type Filter = 'all' | 'critical' | 'outofstock';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [TopbarComponent, FormsModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);

  readonly loading     = signal(true);
  readonly rows        = signal<ProductResponse[]>([]);
  readonly totalPages  = signal(0);
  readonly currentPage = signal(0);
  readonly filter      = signal<Filter>('all');

  readonly editingId    = signal<string | null>(null);
  readonly editingValue = signal(0);
  readonly saving       = signal(false);

  ngOnInit(): void { this.load(); }

  load(): void {
    const f = this.filter();
    this.loading.set(true);

    if (f === 'critical') {
      this.productService.getCritical().subscribe({
        next: list => { this.rows.set(list); this.totalPages.set(0); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    } else if (f === 'outofstock') {
      this.productService.getOutOfStock().subscribe({
        next: list => { this.rows.set(list); this.totalPages.set(0); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    } else {
      this.productService.getAll(this.currentPage()).subscribe({
        next: res => {
          this.rows.set(res.content);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
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
    this.saving.set(true);
    this.productService.updateMinStock(p.id, this.editingValue()).subscribe({
      next: updated => {
        this.rows.update(list => list.map(r => r.id === updated.id ? updated : r));
        this.editingId.set(null);
        this.saving.set(false);
      },
      error: () => this.saving.set(false)
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
