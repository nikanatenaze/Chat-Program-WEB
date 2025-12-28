import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root',
})
export class ChatHubService {
  private hubConnection!: signalR.HubConnection;

  startConnection(token: string): Promise<void> {
  this.hubConnection = new signalR.HubConnectionBuilder()
    .withUrl('https://chat-program-api.onrender.com/chathub', {
      accessTokenFactory: () => token
    })
    .withAutomaticReconnect()
    .build();

  return this.hubConnection
    .start()
    .then(() => console.log('SignalR connected'))
    .catch(err => console.error('SignalR error:', err));
}

  joinChat(chatId: number) {
    return this.hubConnection.invoke('JoinChat', chatId);
  }

  onCreateMessage(callback: (message: any) => void) {
    this.hubConnection.on('CreateMessage', callback);
  }

  onEditMessage(callback: (message: any) => void) {
    this.hubConnection.on('EditMessage', callback);
  }

  onDeleteMessage(callback: (message: any) => void) {
    this.hubConnection.on('DeleteMessage', callback);
  }

  stopConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
