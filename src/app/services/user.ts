import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserInterface } from '../interfaces/user.interface';
import { GlobalMethods } from '../classes/global-methods';
import { TokenModelInterface } from '../interfaces/token-model.interface';
import { GlobalData } from '../classes/global-data';

@Injectable({
  providedIn: 'root',
})
export class User {
  private apiUrl = GlobalData.RENDER_API_URL + "/User"

  constructor(private http: HttpClient) { }

  getUserById(id: number) {
    return this.http.get<UserInterface>(this.apiUrl + `/GetById/${id}`, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  getDataFromToken() {
    return this.http.get<TokenModelInterface>(this.apiUrl + `/GetCurrentUserInfo`, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  searchUserByName(name: string) {
    return this.http.get<Array<TokenModelInterface>>(this.apiUrl + `/Search/${name}`, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  updateProfileImage(image: File) {
    const formData = new FormData();
    formData.append('Image', image);

    return this.http.post(this.apiUrl + `/UploadProfileImage`, formData, {
      headers: GlobalMethods.getAuthHeaders(true)
    });
  }

  changePassword(passwords: { currentPassword: string; newPassword: string }) {
    return this.http.patch(this.apiUrl + `/ChangePassword`, passwords, {
      headers: GlobalMethods.getAuthHeaders(),
      responseType: 'text'
    });
  }

  updateUser(prompt: { name: string, email: string }) {
    return this.http.patch(this.apiUrl + `/Update`, prompt, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  removeProfileImage() {
    return this.http.delete(this.apiUrl + `/RemoveProfilePicture`, {
      headers: GlobalMethods.getAuthHeaders(),
      responseType: 'text'
    })
  }

  deleteUser(password: string) {
    const body = { password };

    return this.http.request('delete', this.apiUrl + '/Delete', {
      body,
      headers: GlobalMethods.getAuthHeaders()
    });
  }
}
