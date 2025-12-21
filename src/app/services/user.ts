import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserClass } from '../classes/user.class';

@Injectable({
  providedIn: 'root',
})
export class User {
  private apiUrl = "https://chat-program-api.onrender.com/api/User"

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    const token = localStorage.getItem('token'); // or wherever you store your JWT
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
  

  getUserById(id:number) {
    return this.http.get<UserClass>(this.apiUrl+`/GetById/${id}`, {
      headers: this.getAuthHeaders()
    })
  }

  updateUser(prompt: {id:number, name:string, email:string, password:string}) {
    return this.http.patch(this.apiUrl+`/Update`, prompt, {
      headers: this.getAuthHeaders()
    })
  }
  
  deleteUser(prompt: {id:number, password:string}) {
    return this.http.delete(this.apiUrl + "/Delete", {
      body: prompt,
      headers: this.getAuthHeaders()
    });
  }
}
