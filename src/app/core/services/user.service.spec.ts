import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list faz GET em /users', () => {
    const users = [{ id: 'u1', name: 'A', email: 'a@x.co', role: 'ADMIN', active: true, createdAt: '2026-11-19T10:00:00' }];
    let result: unknown;
    service.list().subscribe(r => (result = r));

    const req = http.expectOne('/api/v1/users');
    expect(req.request.method).toBe('GET');
    req.flush(users);

    expect(result).toEqual(users);
  });

  it('createOperator faz POST em /users com nome, e-mail e senha', () => {
    const body = { name: 'Maria', email: 'maria@x.co', password: 'segredo123' };
    service.createOperator(body).subscribe();

    const req = http.expectOne('/api/v1/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'u2', ...body, role: 'OPERATOR', active: true, createdAt: '2026-11-19T10:00:00' }, { status: 201, statusText: 'Created' });
  });
});
