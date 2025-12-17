import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface LoginResponse {
  token: string;
  message?: string;
}

interface RegisterResponse {
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = "https://chat-program-api.onrender.com/api/Auth"
  
  constructor(private http: HttpClient) {}

  login(data: {email: string, password:string}): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data)
  }

  register(data: { email: string; username: string; password: string }): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, data);
  }
}
