import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/http/api-error';
import { SLUG_PATTERN, slugify } from './slugify';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  // Reaproveita o visual do login: o redesenho vem depois.
  styleUrl: '../login/login.component.scss'
})
export class RegisterComponent {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);

  readonly loading      = signal(false);
  readonly errorMessage = signal('');
  readonly fieldErrors  = signal<Record<string, string>>({});

  private slugEdited = false;

  readonly form = this.fb.nonNullable.group({
    tenantName: ['', Validators.required],
    tenantSlug: ['', [Validators.required, Validators.pattern(SLUG_PATTERN)]],
    name:       ['', Validators.required],
    email:      ['', [Validators.required, Validators.email]],
    password:   ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor() {
    if (localStorage.getItem('stocksentry_token')) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }

    this.form.controls.tenantName.valueChanges.subscribe(name => {
      if (!this.slugEdited) this.form.controls.tenantSlug.setValue(slugify(name));
    });
  }

  /** O usuário digitou no campo de slug: deixa de sobrescrevê-lo com a sugestão. */
  onSlugInput(): void {
    this.slugEdited = true;
  }

  onSubmit(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.fieldErrors.set({});

    this.authService.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: unknown) => {
        this.loading.set(false);
        this.handleError(err);
      }
    });
  }

  private handleError(err: unknown): void {
    const status = err instanceof HttpErrorResponse ? err.status : 0;
    if (status === 429) {
      this.errorMessage.set('Muitos cadastros. Tente novamente em alguns minutos.');
    } else if (status === 400) {
      const fields = (err as HttpErrorResponse).error?.fields;
      if (fields && typeof fields === 'object') this.fieldErrors.set(fields);
      this.errorMessage.set(fields ? 'Corrija os campos destacados.' : apiErrorMessage(err, [400], 'Dados inválidos.'));
    } else {
      this.errorMessage.set(
        apiErrorMessage(err, [409], 'Erro ao conectar com o servidor. Tente novamente.')
      );
    }
  }
}
