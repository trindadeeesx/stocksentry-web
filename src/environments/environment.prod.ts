declare global {
  interface Window { __env?: { apiUrl: string } }
}

export const environment = {
  production: true,
  get apiUrl(): string {
    return window.__env?.apiUrl ?? '';
  }
};
