import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Page, ProductResponse } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getAll(page = 0, size = 20, sort = 'name,asc') {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', sort);
    return this.http.get<Page<ProductResponse>>(`${this.base}/api/v1/products`, { params });
  }

  getCritical() {
    return this.http.get<ProductResponse[]>(`${this.base}/api/v1/products/critical`);
  }

  getOutOfStock() {
    return this.http.get<ProductResponse[]>(`${this.base}/api/v1/products/out-of-stock`);
  }

  updateMinStock(id: string, minStock: number) {
    return this.http.patch<ProductResponse>(`${this.base}/api/v1/products/${id}/min-stock`, { minStock });
  }
}
