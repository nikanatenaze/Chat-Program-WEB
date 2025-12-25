import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserInterface } from '../interfaces/user.interface';
import { GlobalMethods } from '../classes/global-methods';

interface LoginResponse {
  token: string;
  user?: UserInterface;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = GlobalMethods.GlobalApiUrl + "/Auth"

  private _userToken = new BehaviorSubject<string | null>(sessionStorage.getItem('token'));
  public userToken$ = this._userToken.asObservable();

  constructor(private http: HttpClient) {}

  login(data: { email: string; password: string }): Observable<LoginResponse> {
    return new Observable(observer => {
      this.http.post<LoginResponse>(`${this.apiUrl}/login`, data).subscribe({
        next: (res) => {
          if (res.token) {
            sessionStorage.setItem('token', res.token);
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
    this._userToken.next(null);
  }

  getToken(): string | null {
    return sessionStorage.getItem('token'); 
  }
}
