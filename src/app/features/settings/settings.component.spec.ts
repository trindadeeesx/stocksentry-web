import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SettingsComponent } from './settings.component';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { PushService } from '../../core/services/push.service';
import { SseService } from '../../core/services/sse.service';
import { SettingsService } from '../../core/services/settings.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { UserService } from '../../core/services/user.service';
import { MeResponse } from '../../core/models/auth.model';
import { UserResponse } from '../../core/models/user.model';

const tenant = { id: 't1', name: 'Loja Demo', slug: 'loja-demo' };
const me = (role: string): MeResponse => ({ id: 'u1', name: 'Fulano', email: 'f@x.co', role, tenant });
const user: UserResponse = {
  id: 'u2', name: 'Maria', email: 'maria@x.co', role: 'OPERATOR', active: true, createdAt: '2026-11-19T10:00:00'
};

function setup(role: string, userService: Partial<UserService> = {}) {
  const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  const users = { list: vi.fn(() => of([user])), createOperator: vi.fn(() => of(user)), ...userService };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { fetchMe: () => of(me(role)), logout: vi.fn() } },
      { provide: AlertService, useValue: { getConfig: () => of([]) } },
      { provide: PushService, useValue: { init: vi.fn(), syncWithConfigs: vi.fn(), status: () => 'idle' } },
      { provide: SseService, useValue: { on: () => new Subject<void>() } },
      { provide: SettingsService, useValue: { toastPosition: () => 'top-right', positionOptions: [] } },
      { provide: ThemeService, useValue: { theme: () => 'light' } },
      { provide: UserService, useValue: users },
      { provide: ToastService, useValue: toast }
    ]
  });
  const cmp = TestBed.runInInjectionContext(() => new SettingsComponent());
  return { cmp, toast, users };
}

const httpError = (status: number, error: unknown) =>
  throwError(() => new HttpErrorResponse({ status, error }));

describe('SettingsComponent — Equipe', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('ADMIN: carrega a lista de usuários', () => {
    const { cmp, users } = setup('ADMIN');
    cmp.ngOnInit();

    expect(cmp.isAdmin()).toBe(true);
    expect(users.list).toHaveBeenCalledTimes(1);
    expect(cmp.team()).toEqual([user]);
  });

  it('OPERATOR: não vê a seção e não chama /users', () => {
    const { cmp, users } = setup('OPERATOR');
    cmp.ngOnInit();

    expect(cmp.isAdmin()).toBe(false);
    expect(users.list).not.toHaveBeenCalled();
    cmp.addOperator();
    expect(users.createOperator).not.toHaveBeenCalled();
  });

  it('guarda o tenant do usuário logado para exibir a empresa', () => {
    const { cmp } = setup('OPERATOR');
    cmp.ngOnInit();
    expect(cmp.currentUser()?.tenant.name).toBe('Loja Demo');
  });

  it('addOperator envia os dados, mostra toast e recarrega a lista', () => {
    const { cmp, toast, users } = setup('ADMIN');
    cmp.ngOnInit();
    cmp.opName = ' Maria '; cmp.opEmail = 'maria@x.co'; cmp.opPassword = 'segredo123';

    cmp.addOperator();

    expect(users.createOperator).toHaveBeenCalledWith({ name: 'Maria', email: 'maria@x.co', password: 'segredo123' });
    expect(toast.success).toHaveBeenCalled();
    expect(users.list).toHaveBeenCalledTimes(2);
    expect(cmp.opName).toBe('');
    expect(cmp.opPassword).toBe('');
  });

  it('addOperator não envia com senha curta ou e-mail inválido', () => {
    const { cmp, toast, users } = setup('ADMIN');
    cmp.ngOnInit();

    cmp.opName = 'Maria'; cmp.opEmail = 'maria@x.co'; cmp.opPassword = '1234567';
    cmp.addOperator();
    cmp.opPassword = '12345678'; cmp.opEmail = 'invalido';
    cmp.addOperator();

    expect(users.createOperator).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(2);
  });

  it('409 mostra a mensagem do back', () => {
    const { cmp, toast } = setup('ADMIN', {
      createOperator: vi.fn(() => httpError(409, { error: 'Email already in use' }))
    });
    cmp.ngOnInit();
    cmp.opName = 'Maria'; cmp.opEmail = 'maria@x.co'; cmp.opPassword = 'segredo123';

    cmp.addOperator();

    expect(toast.error).toHaveBeenCalledWith('Email already in use');
    expect(cmp.opSaving()).toBe(false);
  });

  it('403 mostra mensagem de permissão', () => {
    const { cmp, toast } = setup('ADMIN', {
      createOperator: vi.fn(() => httpError(403, null))
    });
    cmp.ngOnInit();
    cmp.opName = 'Maria'; cmp.opEmail = 'maria@x.co'; cmp.opPassword = 'segredo123';

    cmp.addOperator();

    expect(toast.error).toHaveBeenCalledWith('Você não tem permissão para gerenciar usuários.');
  });
});
