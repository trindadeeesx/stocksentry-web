import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'brDate', standalone: true })
export class BrDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
