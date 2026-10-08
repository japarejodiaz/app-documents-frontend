import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();

  // 1) Si NO hay token, redirigir a login
  if (!token) {
    return router.createUrlTree(['/login']);
  }

  // 🟦 2) Si hay token pero está vencido → logout (el interceptor ya intentará refresh)
  if (authService.isTokenExpired(token)) {
    authService.logout();
    return false;
  }

  // 🟦 3) Token válido → permitir acceso
  return true;
};
