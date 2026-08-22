import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { User, LoginResponse } from '../models/user.model';
import { Observable, tap, switchMap, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  // Angular Signals for Reactive Auth State
  currentUser = signal<User | null>(null);
  token = signal<string | null>(localStorage.getItem('access_token'));
  
  isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  userRole = computed(() => this.currentUser()?.role?.name?.toUpperCase() || 'EMPLOYEE');

  constructor() {
    if (this.token()) {
      this.fetchProfile().subscribe({
        error: () => this.logout()
      });
    }
  }

  login(credentials: { email: string; password: string }): Observable<User> {
    return this.api.post<LoginResponse>('/auth/login', credentials).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token);
        this.token.set(res.access_token);
      }),
      switchMap(() => this.fetchProfile())
    );
  }

  register(data: any): Observable<User> {
    return this.api.post<User>('/auth/register', data);
  }

  fetchProfile(): Observable<User> {
    return this.api.get<User>('/auth/me').pipe(
      tap(user => this.currentUser.set(user))
    );
  }

  updateCurrentUser(partialData: Partial<User>) {
    const current = this.currentUser();
    if (current) {
      this.currentUser.set({ ...current, ...partialData } as User);
    }
  }

  logout() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      this.api.post('/auth/logout', { refresh_token: refreshToken }).subscribe();
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  hasRole(allowedRoles: string[]): boolean {
    const role = this.userRole();
    if (role === 'CEO') return true;
    return allowedRoles.map(r => r.toUpperCase()).includes(role);
  }
}
