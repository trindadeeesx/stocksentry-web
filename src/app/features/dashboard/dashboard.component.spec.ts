import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';
import { SseService, SseEventType } from '../../core/services/sse.service';
import { ProductResponse } from '../../core/models/product.model';

const p = (id: string, currentStock: number): ProductResponse => ({
  id, name: id, sku: id, unit: 'UN', currentStock, minStock: 10,
  active: true, critical: true, createdAt: '2026-11-19T10:00:00'
});

function setup() {
  const productService = {
    getCritical: vi.fn(() => of([p('a', 4), p('b', 0)])),
    getOutOfStock: vi.fn(() => of([p('b', 0)]))
  };
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
  const cmp = TestBed.runInInjectionContext(() => new DashboardComponent());
  return { cmp, productService, events, toast };
}

describe('DashboardComponent', () => {
  it('carrega críticos e zerados no init', () => {
    const { cmp, productService } = setup();

    cmp.ngOnInit();

    expect(productService.getCritical).toHaveBeenCalledTimes(1);
    expect(productService.getOutOfStock).toHaveBeenCalledTimes(1);
    expect(cmp.criticalProducts().length).toBe(2);
    expect(cmp.outOfStock().length).toBe(1);
    expect(cmp.loading()).toBe(false);
  });

  it.each(['alert', 'config'] as const)('recarrega ao receber o evento SSE "%s"', type => {
    const { cmp, productService, events } = setup();
    cmp.ngOnInit();

    events[type].next();

    expect(productService.getCritical).toHaveBeenCalledTimes(2);
    expect(productService.getOutOfStock).toHaveBeenCalledTimes(2);
  });

  it('refresh() recarrega sob demanda', () => {
    const { cmp, productService } = setup();
    cmp.ngOnInit();

    cmp.refresh();

    expect(productService.getCritical).toHaveBeenCalledTimes(2);
    expect(cmp.refreshing()).toBe(false);
  });
});
