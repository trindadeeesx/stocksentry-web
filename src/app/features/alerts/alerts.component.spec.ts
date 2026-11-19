import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { AlertsComponent } from './alerts.component';
import { AlertService } from '../../core/services/alert.service';
import { ToastService } from '../../core/services/toast.service';
import { SseService } from '../../core/services/sse.service';

function setup(alertService: Partial<AlertService>) {
  const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  const alert$ = new Subject<void>();
  TestBed.configureTestingModule({
    providers: [
      { provide: AlertService, useValue: alertService },
      { provide: ToastService, useValue: toast },
      { provide: SseService, useValue: { on: () => alert$ } }
    ]
  });
  const cmp = TestBed.runInInjectionContext(() => new AlertsComponent());
  return { cmp, toast, alert$ };
}

describe('AlertsComponent', () => {
  it('lê a paginação aninhada em "page" do histórico', () => {
    const getHistory = vi.fn(() => of({
      content: [{ id: 'a1', productName: 'Papel', type: 'EMAIL', destination: 'x@y.z', status: 'SENT', triggeredAt: '2026-11-19T10:00:00' }],
      page: { size: 20, number: 2, totalElements: 45, totalPages: 3 }
    }));
    const { cmp } = setup({ getHistory } as unknown as Partial<AlertService>);

    cmp.loadPage(2);

    expect(getHistory).toHaveBeenCalledWith(2);
    expect(cmp.rows().length).toBe(1);
    expect(cmp.totalPages()).toBe(3);
    expect(cmp.currentPage()).toBe(2);
    expect(cmp.pages()).toEqual([0, 1, 2]);
  });
});
