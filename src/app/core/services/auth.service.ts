import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, MeResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = environment.apiUrl;

  readonly currentUser = signal<MeResponse | null>(null);

  login(body: LoginRequest) {
    return this.http.post<AuthResponse>(`${this.base}/api/v1/auth/login`, body).pipe(
      tap(res => localStorage.setItem('stocksentry_token', res.token))
    );
  }

  fetchMe() {
    return this.http.get<MeResponse>(`${this.base}/api/v1/auth/me`).pipe(
      tap(user => this.currentUser.set(user))
    );
  }

  logout(): void {
    localStorage.removeItem('stocksentry_token');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('stocksentry_token');
  }
}
