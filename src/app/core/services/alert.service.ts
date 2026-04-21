import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AlertConfigRequest, AlertConfigResponse, AlertResponse } from '../models/alert.model';
import { Page } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getHistory(page = 0, size = 20) {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<AlertResponse>>(`${this.base}/api/v1/alerts/history`, { params });
  }

  getConfig() {
    return this.http.get<AlertConfigResponse[]>(`${this.base}/api/v1/alerts/config`);
  }

  addConfig(body: AlertConfigRequest) {
    return this.http.post<AlertConfigResponse>(`${this.base}/api/v1/alerts/config`, body);
  }

  deleteConfig(id: string) {
    return this.http.delete<void>(`${this.base}/api/v1/alerts/config/${id}`);
  }

  generateReport(days: 7 | 30) {
    return this.http.post<{ message: string; timestamp: string }>(
      `${this.base}/api/v1/alerts/report?days=${days}`, {}
    );
  }
}
