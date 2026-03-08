import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ChatInterface } from '../interfaces/chat.interface';
import { GlobalMethods } from '../classes/global-methods';
import { MessageInterface } from '../interfaces/message.interface';
import { GlobalData } from '../classes/global-data';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private api = GlobalData.RENDER_API_URL + "/Chat"
  constructor(public http: HttpClient) { }

  GetChatById(id: number) {
    return this.http.get<ChatInterface>(this.api + `/GetById/${id}`, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  GetChatMessages(ChatId: number) {
    return this.http.get<Array<MessageInterface>>(this.api + `/GetMessages/${ChatId}`, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  CreateChat(prompt: { name: string, hasPassword: boolean, password: string, createdByUserId: number }) {
    return this.http.post<ChatInterface>(this.api + `/Create`, prompt, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  uploadChatImage(chatId: number, file: File) {
    const formData = new FormData();
    formData.append('ChatId', chatId.toString());
    formData.append('Image', file);

    return this.http.post<{ ImageUrl: string }>('/api/Chat/UploadChatImage', formData);
  }

  ChatVerification(prompt: { id: number, password: string }) {
    return this.http.post(this.api + `/ChatVerification`, prompt, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  UpdateChat(prompt: { id: number, name: string, hasPassword: boolean, password: string }) {
    return this.http.patch<ChatInterface>(this.api + `/Update`, prompt, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  DeleteChat(id: number) {
    return this.http.delete(this.api + `/DeleteById/${id}`)
  }
}
