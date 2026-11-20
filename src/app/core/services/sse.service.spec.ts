import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SseService } from './sse.service';

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  readyState = FakeEventSource.CONNECTING;
  onerror: ((e: Event) => void) | null = null;
  private listeners: Record<string, (() => void)[]> = {};
  constructor(public url: string) { FakeEventSource.instances.push(this); }
  addEventListener(type: string, fn: () => void) { (this.listeners[type] ??= []).push(fn); }
  close() { this.readyState = FakeEventSource.CLOSED; }
  emit(type: string) { this.listeners[type]?.forEach(fn => fn()); }
  fail() { this.onerror?.(new Event('error')); }
}

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: k => m.get(k) ?? null,
    key: i => [...m.keys()][i] ?? null,
    removeItem: k => { m.delete(k); },
    setItem: (k, v) => { m.set(k, String(v)); }
  };
}

const TICKET_URL = '/api/v1/events/ticket';

describe('SseService', () => {
  let service: SseService;
  let http: HttpTestingController;
  let visibility: DocumentVisibilityState;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    vi.stubGlobal('localStorage', memoryStorage());
    localStorage.setItem('stocksentry_token', 'jwt');
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });

    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SseService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.disconnect();
    http.verify();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const ticket = (value: string) => {
    const req = http.expectOne(TICKET_URL);
    expect(req.request.method).toBe('POST');
    req.flush({ ticket: value });
  };

  it('pede um ticket antes de abrir o EventSource, sem JWT na URL', () => {
    service.connect();
    expect(FakeEventSource.instances.length).toBe(0);

    ticket('t-1');

    expect(FakeEventSource.instances.length).toBe(1);
    expect(FakeEventSource.instances[0].url).toBe('/api/v1/events?ticket=t-1');
    expect(FakeEventSource.instances[0].url).not.toContain('jwt');
  });

  it('não abre duas conexões ao chamar connect() repetidamente', () => {
    service.connect();
    service.connect();
    ticket('t-1');
    service.connect();

    http.expectNone(TICKET_URL);
    expect(FakeEventSource.instances.length).toBe(1);
  });

  it('repassa os eventos nomeados', () => {
    const seen: string[] = [];
    service.on('alert').subscribe(() => seen.push('alert'));
    service.on('config').subscribe(() => seen.push('config'));
    service.connect();
    ticket('t-1');

    FakeEventSource.instances[0].emit('alert');
    FakeEventSource.instances[0].emit('config');

    expect(seen).toEqual(['alert', 'config']);
  });

  it('no erro fecha o stream e reconecta com um ticket NOVO, com backoff', () => {
    service.connect();
    ticket('t-1');
    const first = FakeEventSource.instances[0];

    first.fail();
    expect(first.readyState).toBe(FakeEventSource.CLOSED);
    vi.advanceTimersByTime(1999);
    http.expectNone(TICKET_URL);
    vi.advanceTimersByTime(1);
    ticket('t-2');
    expect(FakeEventSource.instances[1].url).toBe('/api/v1/events?ticket=t-2');

    // segunda falha seguida: espera 4s
    FakeEventSource.instances[1].fail();
    vi.advanceTimersByTime(3999);
    http.expectNone(TICKET_URL);
    vi.advanceTimersByTime(1);
    ticket('t-3');
  });

  it('o backoff dobra até 30s e zera ao receber um evento', () => {
    service.connect();
    ticket('t-0');
    const delays = [2000, 4000, 8000, 16000, 30000, 30000];
    delays.forEach((d, i) => {
      FakeEventSource.instances.at(-1)!.fail();
      vi.advanceTimersByTime(d - 1);
      http.expectNone(TICKET_URL);
      vi.advanceTimersByTime(1);
      ticket(`t-${i + 1}`);
    });

    FakeEventSource.instances.at(-1)!.emit('heartbeat');
    FakeEventSource.instances.at(-1)!.fail();
    vi.advanceTimersByTime(2000);
    ticket('t-reset');
  });

  it('não reconecta depois do disconnect()', () => {
    service.connect();
    ticket('t-1');
    const es = FakeEventSource.instances[0];

    service.disconnect();
    expect(es.readyState).toBe(FakeEventSource.CLOSED);
    es.fail();
    vi.advanceTimersByTime(60_000);

    http.expectNone(TICKET_URL);
    expect(FakeEventSource.instances.length).toBe(1);
  });

  it('descarta o ticket que chega depois do disconnect()', () => {
    service.connect();
    const req = http.expectOne(TICKET_URL);
    service.disconnect();

    expect(req.cancelled).toBe(true);
    expect(FakeEventSource.instances.length).toBe(0);
  });

  it('não reconecta se o token foi removido (sessão expirada)', () => {
    service.connect();
    ticket('t-1');

    localStorage.removeItem('stocksentry_token');
    FakeEventSource.instances[0].fail();
    vi.advanceTimersByTime(60_000);

    http.expectNone(TICKET_URL);
  });

  it('com a aba oculta não reconecta; ao voltar, reabre com ticket novo', () => {
    service.connect();
    ticket('t-1');

    visibility = 'hidden';
    FakeEventSource.instances[0].fail();
    vi.advanceTimersByTime(60_000);
    http.expectNone(TICKET_URL);

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    ticket('t-2');
    expect(FakeEventSource.instances.length).toBe(2);
  });

  it('429 no ticket espera um backoff longo (60s)', () => {
    service.connect();
    http.expectOne(TICKET_URL).flush({ error: 'Too many' }, { status: 429, statusText: 'Too Many Requests' });

    vi.advanceTimersByTime(59_999);
    http.expectNone(TICKET_URL);
    vi.advanceTimersByTime(1);
    ticket('t-2');
  });

  it('401 no ticket não reconecta (o errorInterceptor desloga)', () => {
    service.connect();
    http.expectOne(TICKET_URL).flush(null, { status: 401, statusText: 'Unauthorized' });

    vi.advanceTimersByTime(60_000);
    http.expectNone(TICKET_URL);
  });

  it('falha de rede no ticket entra no backoff normal', () => {
    service.connect();
    http.expectOne(TICKET_URL).flush(null, { status: 503, statusText: 'Unavailable' });

    vi.advanceTimersByTime(2000);
    ticket('t-2');
  });
});
