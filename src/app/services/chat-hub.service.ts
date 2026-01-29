import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root',
})
export class ChatHubService {
  private hubConnection!: signalR.HubConnection;

  // Start connection
  startConnection(token: string): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve();
    }

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

  // Join a chat group
  joinChat(chatId: number): Promise<void> {
    if (!this.hubConnection) return Promise.reject('Hub connection not started');
    return this.hubConnection.invoke('JoinChat', chatId)
      .catch(err => console.error('JoinChat error:', err));
  }

  // Event listeners
  onCreateMessage(callback: (message: any) => void) {
    this.hubConnection.on('CreateMessage', callback);
  }

  onEditMessage(callback: (message: any) => void) {
    this.hubConnection.on('EditMessage', callback);
  }

  onDeleteMessage(callback: (message: any) => void) {
    this.hubConnection.on('DeleteMessage', callback);
  }

  onUserJoined(callback: (userId: string) => void) {
    this.hubConnection.on('UserJoined', callback);
  }

  stopConnection() {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return this.hubConnection.stop();
    }
    return Promise.resolve();
  }
}
