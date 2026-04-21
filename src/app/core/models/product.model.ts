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

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
