import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { User } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post('/api/auth/login/', { username, password }).pipe(
      tap((tokens: any) => {
        if (this.isBrowser) {
          localStorage.setItem('access_token', tokens.access);
          localStorage.setItem('refresh_token', tokens.refresh);
        }
        this.loadCurrentUser();
      })
    );
  }

  logout(): void {
    if (this.isBrowser) {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        this.http.post('/api/auth/logout/', { refresh }).subscribe();
      }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }

  register(data: any): Observable<any> {
    return this.http.post('/api/auth/register/', data).pipe(
      tap((res: any) => {
        if (this.isBrowser) {
          localStorage.setItem('access_token', res.access);
          localStorage.setItem('refresh_token', res.refresh);
        }
        this.currentUserSubject.next(res.user);
      })
    );
  }

  isLoggedIn(): boolean {
    return this.isBrowser && !!localStorage.getItem('access_token');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  loadCurrentUser(): void {
    if (this.isLoggedIn()) {
      this.http.get<User>('/api/auth/profile/').subscribe({
        next: (user) => this.currentUserSubject.next(user),
        error: () => {},
      });
    }
  }

  updateProfile(data: { username?: string; phone?: string; avatar?: File }): Observable<User> {
    const form = new FormData();
    if (data.username !== undefined) form.append('username', data.username);
    if (data.phone !== undefined) form.append('phone', data.phone);
    if (data.avatar) form.append('avatar', data.avatar);
    return this.http.put<User>('/api/auth/profile/', form).pipe(
      tap((user) => this.currentUserSubject.next(user))
    );
  }

  refreshToken(): Observable<any> {
    const refresh = this.isBrowser ? localStorage.getItem('refresh_token') : null;
    return this.http.post('/api/auth/token/refresh/', { refresh }).pipe(
      tap((res: any) => {
        if (this.isBrowser) {
          localStorage.setItem('access_token', res.access);
        }
      })
    );
  }
}
