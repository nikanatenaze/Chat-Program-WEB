import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { UserInterface } from '../interfaces/user.interface';
import { GlobalData } from '../classes/global-data';

interface LoginResponse {
  token: string;
  refreshToken: string;
  user?: UserInterface;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = GlobalData.RENDER_API_URL + "/Auth"

  private _userToken = new BehaviorSubject<string | null>(sessionStorage.getItem('token'));
  private _userRefreshToken = new BehaviorSubject<string | null>(sessionStorage.getItem('refresh_token'));
  public userToken$ = this._userToken.asObservable();
  public refreshToken$ = this._userRefreshToken.asObservable();
  constructor(private http: HttpClient) { }

  login(data: { email: string; password: string }): Observable<LoginResponse> {
    return new Observable(observer => {
      this.http.post<LoginResponse>(`${this.apiUrl}/login`, data).subscribe({
        next: (res) => {
          if (res.token) {
            sessionStorage.setItem('token', res.token);
            sessionStorage.setItem('refresh_token', res.refreshToken);
            this._userToken.next(res.token);
          }
          observer.next(res);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  register(data: { email: string; username: string; password: string }): Observable<UserInterface> {
    return this.http.post<UserInterface>(`${this.apiUrl}/register`, data);
  }

  logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refresh_token')
    this._userToken.next(null);
  }

  refreshToken(): Observable<RefreshResponse> {  // 👈 RefreshResponse
    const refreshToken = this.getRefreshToken();
    const accessToken = this.getToken();

    console.log('=== REFRESH DEBUG ===');
    console.log('accessToken:', accessToken);
    console.log('refreshToken:', refreshToken);
    console.log('body being sent:', { accessToken, refreshToken });
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<RefreshResponse>(`${this.apiUrl}/refresh`, {
      accessToken,
      refreshToken
    }).pipe(
      tap((res) => {
        sessionStorage.setItem('token', res.accessToken);      // 👈 accessToken
        sessionStorage.setItem('refresh_token', res.refreshToken);
        this._userToken.next(res.accessToken);                 // 👈 accessToken
        this._userRefreshToken.next(res.refreshToken);
      }),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem('refresh_token');
  }
}
