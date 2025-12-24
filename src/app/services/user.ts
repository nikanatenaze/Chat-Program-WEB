import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserInterface } from '../interfaces/user.interface';
import { GlobalMethods } from '../classes/global-methods';

@Injectable({
  providedIn: 'root',
})
export class User {
  private apiUrl = GlobalMethods.GlobalApiUrl + "/User"

  constructor(private http: HttpClient) {}

  getUserById(id:number) {
    return this.http.get<UserInterface>(this.apiUrl+`/GetById/${id}`, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  updateUser(prompt: {id:number, name:string, email:string, password:string}) {
    return this.http.patch(this.apiUrl+`/Update`, prompt, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }
  
  deleteUser(prompt: {id:number, password:string}) {
    return this.http.delete(this.apiUrl + "/Delete", {
      body: prompt,
      headers: GlobalMethods.getAuthHeaders()
    });
  }
}
