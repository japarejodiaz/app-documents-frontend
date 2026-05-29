import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { apiUrl } from '../utils/api-url';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  logout() {
    localStorage.removeItem('token');

    this.http.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe(() => {});

    this.router.navigate(['/login']);
  }

  login(data: { email: string; password: string }): Observable<any> {
    return this.http.post(apiUrl('auth/login'), data, {
      withCredentials: true
    }).pipe(
      tap((res: any) => {
        const token = res.accessToken ?? res.token ?? null;

        if (token) {
          localStorage.setItem('token', token);
        }
      })
    );
  }

  register(data: { name: string; email: string; password: string }): Observable<any> {
    return this.http.post(apiUrl('auth/register'), data);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  refresh(): Observable<any> {
    return this.http.post(apiUrl('auth/refresh'), {}, {
      withCredentials: true
    });
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      return Date.now() > exp;
    } catch {
      return true;
    }
  }
}
