import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
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

  it.each([422, 429, 502])('generateReport mostra a mensagem do back no erro %i', status => {
    const generateReport = vi.fn(() => throwError(() => new HttpErrorResponse({
      status, error: { error: `mensagem do back ${status}` }
    })));
    const { cmp, toast } = setup({ generateReport } as unknown as Partial<AlertService>);

    cmp.generateReport(7);

    expect(toast.error).toHaveBeenCalledWith(`mensagem do back ${status}`);
    expect(cmp.reportLoading()).toBe(false);
  });

  it('generateReport usa mensagem genérica quando o back não manda corpo', () => {
    const generateReport = vi.fn(() => throwError(() => new HttpErrorResponse({ status: 0 })));
    const { cmp, toast } = setup({ generateReport } as unknown as Partial<AlertService>);

    cmp.generateReport(30);

    expect(toast.error).toHaveBeenCalledWith('Erro ao gerar relatório.');
  });
});
