import { HttpClient, HttpHandler, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ChatInterface } from '../interfaces/chat.interface';
import { UserInterface } from '../interfaces/user.interface';
import { GlobalMethods } from '../classes/global-methods';
import { MessageInterface } from '../interfaces/message.interface';

@Injectable({
  providedIn: 'root',
})
export class ChatUserService {
  private api = GlobalMethods.GlobalApiUrl + "/ChatUser"

  constructor(private http: HttpClient) {}

  GetUsersInChat(id:number) {
    return this.http.get<Array<UserInterface>>(this.api + `/GetUsersInChat/${id}`, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  GetChatsOfUser(id: number) {
    return this.http.get<Array<ChatInterface>>(this.api + `/GetChatsOfUser/${id}`, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  CheckUserInChat(chatId: number, userId: number) {
    return this.http.get<boolean>(this.api + `/${chatId}/isMember/${userId}`, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  AddChatUser(propmt: {userId: number, chatId: number}) {
    return this.http.post(this.api + `/AddChatUser`, propmt, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  RemoveChatUser(propmt: {userId: number, chatId: number}) {
    return this.http.delete(this.api + `/RemoveFromChat`, {
      headers: GlobalMethods.getAuthHeaders(),
      body: propmt
    })
  }
}
