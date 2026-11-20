import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CreateOperatorRequest, UserResponse } from '../models/user.model';

/** Gestão de usuários da empresa. Só ADMIN; para os demais o back responde 403. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/v1/users`;

  list() {
    return this.http.get<UserResponse[]>(this.url);
  }

  createOperator(body: CreateOperatorRequest) {
    return this.http.post<UserResponse>(this.url, body);
  }
}
