import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
});

function setup(register = vi.fn(() => of({ token: 't', email: 'a@b.co', role: 'ADMIN', tenantId: 'x' }))) {
  const router = { navigate: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { register } },
      { provide: Router, useValue: router },
      { provide: ToastService, useValue: toast }
    ]
  });
  const cmp = TestBed.runInInjectionContext(() => new RegisterComponent());
  return { cmp, register, router, toast };
}

function fillValid(cmp: RegisterComponent) {
  cmp.form.patchValue({
    tenantName: 'Loja Nova', name: 'Dono', email: 'dono@nova.com', password: 'segredo123'
  });
}

describe('RegisterComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('sugere o slug a partir do nome da empresa', () => {
    const { cmp } = setup();
    cmp.form.controls.tenantName.setValue('Padaria do João');
    expect(cmp.form.controls.tenantSlug.value).toBe('padaria-do-joao');
  });

  it('para de sugerir depois que o slug é editado à mão', () => {
    const { cmp } = setup();
    cmp.form.controls.tenantName.setValue('Loja');
    cmp.onSlugInput();
    cmp.form.controls.tenantSlug.setValue('meu-slug');
    cmp.form.controls.tenantName.setValue('Loja Nova');
    expect(cmp.form.controls.tenantSlug.value).toBe('meu-slug');
  });

  it('não envia com dados inválidos', () => {
    const { cmp, register } = setup();
    cmp.form.patchValue({ tenantName: 'Loja', name: 'Dono', email: 'invalido', password: '1234567' });

    cmp.onSubmit();

    expect(register).not.toHaveBeenCalled();
    expect(cmp.form.controls.email.invalid).toBe(true);
    expect(cmp.form.controls.password.invalid).toBe(true);
  });

  it('rejeita slug fora do padrão', () => {
    const { cmp, register } = setup();
    fillValid(cmp);
    cmp.onSlugInput();
    cmp.form.controls.tenantSlug.setValue('Slug Inválido');

    cmp.onSubmit();

    expect(register).not.toHaveBeenCalled();
    expect(cmp.form.controls.tenantSlug.hasError('pattern')).toBe(true);
  });

  it('envia os dados e navega para o dashboard no sucesso', () => {
    const { cmp, register, router } = setup();
    fillValid(cmp);

    cmp.onSubmit();

    expect(register).toHaveBeenCalledWith({
      tenantName: 'Loja Nova', tenantSlug: 'loja-nova',
      name: 'Dono', email: 'dono@nova.com', password: 'segredo123'
    });
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('409 mostra a mensagem do back', () => {
    const register = vi.fn(() => throwError(() => new HttpErrorResponse({
      status: 409, error: { error: 'Slug already in use' }
    })));
    const { cmp, router } = setup(register);
    fillValid(cmp);

    cmp.onSubmit();

    expect(cmp.errorMessage()).toBe('Slug already in use');
    expect(cmp.loading()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('429 avisa sobre excesso de cadastros', () => {
    const register = vi.fn(() => throwError(() => new HttpErrorResponse({ status: 429 })));
    const { cmp } = setup(register);
    fillValid(cmp);

    cmp.onSubmit();

    expect(cmp.errorMessage()).toBe('Muitos cadastros. Tente novamente em alguns minutos.');
  });

  it('400 expõe os erros por campo', () => {
    const register = vi.fn(() => throwError(() => new HttpErrorResponse({
      status: 400, error: { error: 'Validation failed', fields: { password: 'size must be at least 8' } }
    })));
    const { cmp } = setup(register);
    fillValid(cmp);

    cmp.onSubmit();

    expect(cmp.fieldErrors()['password']).toBe('size must be at least 8');
  });
});
