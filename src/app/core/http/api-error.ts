import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorBody {
  error?: string;
  fields?: Record<string, string>;
}

/**
 * Mensagem para o usuário a partir do corpo de erro do back
 * (`{"error": "..."}`, com `fields` na validação). Só usa a mensagem do back
 * nos status esperados; nos demais (rede, 5xx inesperado) cai no `fallback`.
 */
export function apiErrorMessage(err: unknown, statuses: number[], fallback: string): string {
  if (!(err instanceof HttpErrorResponse) || !statuses.includes(err.status)) return fallback;
  const body = err.error as ApiErrorBody | null;
  if (!body || typeof body.error !== 'string' || !body.error) return fallback;
  const details = body.fields ? Object.values(body.fields).join('; ') : '';
  return details ? `${body.error}: ${details}` : body.error;
}
