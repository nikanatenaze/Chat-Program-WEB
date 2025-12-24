import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MessageInterface } from '../interfaces/message.interface';
import { GlobalMethods } from '../classes/global-methods';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private api = GlobalMethods.GlobalApiUrl + "/Message"

  constructor(private http: HttpClient) { }

  GetMessageById(id: number) {
    return this.http.get<MessageInterface>(this.api + `/GetById/${id}`, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  CreateMessage(propmt: {content: string, userId: number, chatId: number}) {
    return this.http.post<MessageInterface>(this.api + `/Create`, propmt, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  EditMessage(prompt: {id: number, content: string, userId: number}) {
    return this.http.patch<MessageInterface>(this.api + `/Edit`, prompt, {
      headers: GlobalMethods.getAuthHeaders()
    })
  }

  DeleteMessage(propmt: {id: number, userId: number}) {
    return this.http.delete<MessageInterface>(this.api + `Delete`, {
      headers: GlobalMethods.getAuthHeaders(),
      body: propmt
    })
  }
}
