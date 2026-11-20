import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { SseService } from './sse.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let sse: { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };

  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; }
    });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SseService, useFactory: () => (sse = { connect: vi.fn(), disconnect: vi.fn() }) }
      ]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  it('fetchMe desembrulha {user} e guarda o usuário com o tenant', () => {
    let result: unknown;
    service.fetchMe().subscribe(u => (result = u));

    http.expectOne('/api/v1/auth/me').flush({
      user: {
        id: 'u1',
        name: 'Admin Demo',
        email: 'admin@demo.local',
        role: 'ADMIN',
        tenant: { id: 't1', name: 'Loja Demo', slug: 'loja-demo' }
      }
    });

    const expected = {
      id: 'u1',
      name: 'Admin Demo',
      email: 'admin@demo.local',
      role: 'ADMIN',
      tenant: { id: 't1', name: 'Loja Demo', slug: 'loja-demo' }
    };
    expect(result).toEqual(expected);
    expect(service.currentUser()).toEqual(expected);
    expect(service.currentUser()?.name).toBe('Admin Demo');
  });

  it('register faz POST em /auth/register, guarda o token e conecta o SSE', () => {
    const body = {
      tenantName: 'Loja Nova', tenantSlug: 'loja-nova',
      name: 'Dono', email: 'dono@nova.com', password: 'segredo123'
    };
    service.register(body).subscribe();

    const req = http.expectOne('/api/v1/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ token: 'jwt-novo', email: 'dono@nova.com', role: 'ADMIN', tenantId: 't9' });

    expect(localStorage.getItem('stocksentry_token')).toBe('jwt-novo');
    expect(sse.connect).toHaveBeenCalledTimes(1);
  });

  it('register com erro não guarda token nem conecta o SSE', () => {
    service.register({
      tenantName: 'X', tenantSlug: 'x', name: 'N', email: 'a@b.co', password: '12345678'
    }).subscribe({ error: () => undefined });

    http.expectOne('/api/v1/auth/register').flush({ error: 'Slug already in use' }, { status: 409, statusText: 'Conflict' });

    expect(localStorage.getItem('stocksentry_token')).toBeNull();
    expect(sse.connect).not.toHaveBeenCalled();
  });
});
