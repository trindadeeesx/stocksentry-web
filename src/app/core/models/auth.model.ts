export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  role: string;
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  role: string;
}
