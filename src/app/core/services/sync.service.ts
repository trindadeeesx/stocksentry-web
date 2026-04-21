import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SyncStatusResponse } from '../models/sync.model';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getStatus() {
    return this.http.get<SyncStatusResponse>(`${this.base}/api/v1/sync/status`);
  }

  syncNow() {
    return this.http.post<{ message: string; timestamp: string }>(`${this.base}/api/v1/sync/now`, {});
  }
}
