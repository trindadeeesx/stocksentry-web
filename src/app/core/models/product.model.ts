export type UnitType = 'UN' | 'KG' | 'L' | 'CX';

export interface ProductResponse {
  id: string;
  name: string;
  sku: string;
  unit: UnitType;
  currentStock: number;
  minStock: number;
  active: boolean;
  critical: boolean;
  createdAt: string;
}

/** Metadados de paginação; o back manda aninhado em `page` (Spring PagedModel). */
export interface PageMeta {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface Page<T> {
  content: T[];
  page: PageMeta;
}
