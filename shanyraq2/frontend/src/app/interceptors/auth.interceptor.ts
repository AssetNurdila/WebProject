import { inject, PLATFORM_ID } from '@angular/core';
import { HttpBackend, HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const httpBackend = inject(HttpBackend);

  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const token = localStorage.getItem('access_token');
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  const isAuthRequired = (url: string) =>
    url.includes('/auth/profile') ||
    url.includes('/auth/logout') ||
    url.includes('/favorites/') ||
    (url.includes('/listings/') && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE'));

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        token &&
        !req.url.includes('/token/refresh/') &&
        !req.url.includes('/auth/login/') &&
        !req.url.includes('/auth/register/')
      ) {
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
          const httpDirect = new HttpClient(httpBackend);
          return httpDirect
            .post<{ access: string }>('/api/auth/token/refresh/', { refresh })
            .pipe(
              switchMap((res) => {
                localStorage.setItem('access_token', res.access);
                const retryReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${res.access}` },
                });
                return next(retryReq);
              }),
              catchError(() => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                if (isAuthRequired(req.url)) {
                  router.navigate(['/auth']);
                }
                return throwError(() => error);
              })
            );
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (isAuthRequired(req.url)) {
          router.navigate(['/auth']);
        }
      }
      return throwError(() => error);
    })
  );
};
