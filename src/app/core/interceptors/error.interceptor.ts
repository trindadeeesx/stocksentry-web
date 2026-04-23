import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, retry, throwError, timer } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    retry({
      count: 1,
      delay: (err) => {
        // don't retry client errors — only network/server errors
        if (err.status >= 400 && err.status < 500) throw err;
        return timer(800);
      }
    }),
    catchError(err => {
      if (err.status === 401) {
        localStorage.removeItem('stocksentry_token');
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
