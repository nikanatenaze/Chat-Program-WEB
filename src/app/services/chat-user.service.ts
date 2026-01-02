import { HttpClient, HttpHandler, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ChatInterface } from '../interfaces/chat.interface';
import { UserInterface } from '../interfaces/user.interface';
import { GlobalMethods } from '../classes/global-methods';
import { MessageInterface } from '../interfaces/message.interface';
import { ChatUserInterface } from '../interfaces/chat-user.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatUserService {
  private api = GlobalMethods.GlobalApiUrl + "/ChatUser"
  constructor(private http: HttpClient) { }

  // ✅ RETURNS ARRAY
  GetChatsOfUser(id: number): Observable<ChatInterface[]> {
    return this.http.get<ChatInterface[]>(
      `${this.api}/GetChatsOfUser/${id}`,
      { headers: GlobalMethods.getAuthHeaders() }
    );
  }

  // ✅ RETURNS ARRAY
  GetUsersInChat(id: number): Observable<UserInterface[]> {
    return this.http.get<UserInterface[]>(
      `${this.api}/GetUsersInChat/${id}`,
      { headers: GlobalMethods.getAuthHeaders() }
    );
  }

  CheckUserInChat(chatId: number, userId: number): Observable<boolean> {
    return this.http.get<boolean>(
      `${this.api}/${chatId}/isMember/${userId}`,
      { headers: GlobalMethods.getAuthHeaders() }
    );
  }

  AddChatUser(prompt: { userId: number; chatId: number }): Observable<void> {
    return this.http.post<void>(
      `${this.api}/AddChatUser`,
      prompt,
      { headers: GlobalMethods.getAuthHeaders() }
    );
  }

  RemoveChatUser(prompt: { userId: number; chatId: number }): Observable<void> {
    return this.http.delete<void>(
      `${this.api}/RemoveFromChat`,
      {
        headers: GlobalMethods.getAuthHeaders(),
        body: prompt,
      }
    );
  }
}
