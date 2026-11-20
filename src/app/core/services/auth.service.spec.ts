import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { SseService } from './sse.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SseService, useValue: { connect: vi.fn(), disconnect: vi.fn() } }
      ]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

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
});
