export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  role: string;
  tenantId: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant: TenantInfo;
}

/** O back devolve o usuário embrulhado: `{ "user": { ... } }`. */
export interface MeEnvelope {
  user: MeResponse;
}
