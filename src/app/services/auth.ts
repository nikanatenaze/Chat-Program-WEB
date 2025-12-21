import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserClass } from '../classes/user.class';

interface LoginResponse {
  token: string;
  user?: UserClass;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = "https://chat-program-api.onrender.com/api/Auth"

  private _userToken = new BehaviorSubject<string | null>(localStorage.getItem('token'));
  public userToken$ = this._userToken.asObservable();

  constructor(private http: HttpClient) {}

  login(data: { email: string; password: string }): Observable<LoginResponse> {
    return new Observable(observer => {
      this.http.post<LoginResponse>(`${this.apiUrl}/login`, data).subscribe({
        next: (res) => {
          if (res.token) {
            localStorage.setItem('token', res.token);
            this._userToken.next(res.token);
          }
          observer.next(res);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  register(data: { email: string; username: string; password: string }): Observable<UserClass> {
    return this.http.post<UserClass>(`${this.apiUrl}/register`, data);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('logedin_user_id');
    this._userToken.next(null);
  }

  getToken(): string | null {
    return this._userToken.value;
  }
}
