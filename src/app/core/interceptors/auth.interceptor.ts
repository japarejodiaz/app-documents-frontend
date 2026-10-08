import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

export let isRefreshing = false;
export const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Siempre enviar cookies
  let modified = req.clone({ withCredentials: true });
  const isAuthEndpoint = /\/auth\/(login|logout|refresh)(?:\/|$|\?)/.test(modified.url);

  // Si hay accessToken → agregar Authorization
  if (token) {
    modified = modified.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  // Si el token está vencido → refrescar antes de enviar
  if (token && authService.isTokenExpired(token) && !isAuthEndpoint) {
    return authService.refresh().pipe(
      switchMap((res: any) => {
        const newToken = res.accessToken;
        authService.saveToken(newToken);

        const retryReq = modified.clone({
          setHeaders: { Authorization: `Bearer ${newToken}` }
        });

        return next(retryReq);
      }),
      catchError(err => {
        authService.logout();
        return throwError(() => err);
      })
    );
  }

  // Enviar request normal
  return next(modified).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si NO es 401 → no es problema de token
      if (error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }

      // Si ya estamos refrescando → esperar
      if (isRefreshing) {
        return refreshTokenSubject.pipe(
          filter(t => t !== null),
          take(1),
          switchMap((newToken) => {
            const retryReq = modified.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` }
            });
            return next(retryReq);
          })
        );
      }

      // Iniciar refresh
      isRefreshing = true;
      refreshTokenSubject.next(null);

      return authService.refresh().pipe(
        switchMap((res: any) => {
          const newToken = res.accessToken;
          authService.saveToken(newToken);

          refreshTokenSubject.next(newToken);
          isRefreshing = false;

          const retryReq = modified.clone({
            setHeaders: { Authorization: `Bearer ${newToken}` }
          });

          return next(retryReq);
        }),
        catchError((err) => {
          isRefreshing = false;
          authService.logout();
          return throwError(() => err);
        })
      );
    })
  );
};
