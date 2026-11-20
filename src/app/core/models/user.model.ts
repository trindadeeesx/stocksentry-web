export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export interface CreateOperatorRequest {
  name: string;
  email: string;
  password: string;
}
