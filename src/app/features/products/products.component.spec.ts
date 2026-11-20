import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ProductsComponent } from './products.component';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';
import { SseService, SseEventType } from '../../core/services/sse.service';
import { ProductResponse } from '../../core/models/product.model';

const product: ProductResponse = {
  id: 'p1', name: 'Papel A4', sku: 'PAP-A4', unit: 'UN', currentStock: 4,
  minStock: 10, active: true, critical: true, createdAt: '2026-11-19T10:00:00'
};

function setup(productService: Partial<ProductService>) {
  const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  const events: Record<string, Subject<void>> = {};
  const sse = { on: (t: SseEventType) => (events[t] ??= new Subject<void>()) };
  TestBed.configureTestingModule({
    providers: [
      { provide: ProductService, useValue: productService },
      { provide: ToastService, useValue: toast },
      { provide: SseService, useValue: sse }
    ]
  });
  const cmp = TestBed.runInInjectionContext(() => new ProductsComponent());
  return { cmp, toast, events };
}

const pageOf = (content: ProductResponse[]) => ({
  content,
  page: { size: 20, number: 0, totalElements: 41, totalPages: 3 }
});

describe('ProductsComponent', () => {
  it('lê totalPages da paginação aninhada em "page"', () => {
    const getAll = vi.fn(() => of(pageOf([product])));
    const { cmp } = setup({ getAll } as unknown as Partial<ProductService>);

    cmp.load();

    expect(cmp.rows()).toEqual([product]);
    expect(cmp.totalPages()).toBe(3);
  });

  it('recarrega a lista quando chega um evento SSE "alert"', () => {
    const getAll = vi.fn(() => of(pageOf([product])));
    const { cmp, events } = setup({ getAll } as unknown as Partial<ProductService>);
    cmp.ngOnInit();
    expect(getAll).toHaveBeenCalledTimes(1);

    events['alert'].next();

    expect(getAll).toHaveBeenCalledTimes(2);
  });

  it.each([400, 404])('saveEdit mostra a mensagem do back no erro %i', status => {
    const updateMinStock = vi.fn(() => throwError(() => new HttpErrorResponse({
      status, error: { error: `erro ${status} do back` }
    })));
    const { cmp, toast } = setup({ updateMinStock } as unknown as Partial<ProductService>);
    cmp.editingValue.set(5);

    cmp.saveEdit(product);

    expect(toast.error).toHaveBeenCalledWith(`erro ${status} do back`);
    expect(cmp.saving()).toBe(false);
  });

  it('saveEdit mostra o detalhe do campo quando a validação falha', () => {
    const updateMinStock = vi.fn(() => throwError(() => new HttpErrorResponse({
      status: 400, error: { error: 'Validation failed', fields: { minStock: 'must be greater than or equal to 0.0' } }
    })));
    const { cmp, toast } = setup({ updateMinStock } as unknown as Partial<ProductService>);
    cmp.editingValue.set(5);

    cmp.saveEdit(product);

    expect(toast.error).toHaveBeenCalledWith('Validation failed: must be greater than or equal to 0.0');
  });
});
