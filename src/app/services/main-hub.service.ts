import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { GlobalData } from '../classes/global-data';

@Injectable({
  providedIn: 'root',
})
export class MainHubService {
  private hubConnection!: signalR.HubConnection;
  private hubUrl = GlobalData.RENDER_URL + "/main-hub"

  // Baisic signalR methods
  startConnection(token: string): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve();
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    return this.hubConnection
      .start()
      .then(() => console.log('SignalR connected'))
      .catch(err => console.error('SignalR error123:', err));
  }

  stopConnection() {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return this.hubConnection.stop();
    }
    return Promise.resolve();
  }

  joinGroupAny(name: string): Promise<void> {
    if (!this.hubConnection) return Promise.reject('Hub connection not started');
    return this.hubConnection.invoke('JoinGroup', name)
      .catch(err => console.error('JoinChat error:', err));
  }

  leaveGroupAny(name: string): Promise<void> {
    if (!this.hubConnection) return Promise.reject('Hub connection not started');
    return this.hubConnection.invoke('LeaveGroup', name)
      .catch(err => console.error('JoinChat error:', err));
  }

  // Grouping methods

  // Chat, messages grouping methods
  joinChat(chatId: number): Promise<void> {
    if (!this.hubConnection) return Promise.reject('Hub connection not started');
    return this.hubConnection.invoke('JoinChat', chatId) // <-- Does hub append "chat-"?
      .catch(err => console.error('JoinChat error:', err));
  }

  leaveChat(chatId: number): Promise<void> {
    if (!this.hubConnection) return Promise.reject('Hub connection not started');
    return this.hubConnection.invoke('LeaveChat', chatId)
      .catch(err => console.error('JoinChat error:', err));
  }

  // Chat users grouping methods
  joinChatUsers(userId: number): Promise<void> {
    if (!this.hubConnection) return Promise.reject('Hub connection not started');
    return this.hubConnection.invoke('JoinChatUsers', userId)
      .catch(err => console.error('JoinChat error:', err));
  }

  leaveChatUsers(userId: number): Promise<void> {
    if (!this.hubConnection) return Promise.reject('Hub connection not started');
    return this.hubConnection.invoke('LeaveChatUsers', userId)
      .catch(err => console.error('JoinChat error:', err));
  }

  // Listeners

  // Chat, messages listeners
  onCreateMessage(callback: (message: any) => void) {
    if (!this.hubConnection) return;
    this.hubConnection.on("CreateMessage", callback);
  }

  onEditMessage(callback: (message: any) => void) {
    if (!this.hubConnection) return;
    this.hubConnection.on('EditMessage', callback);
  }

  onDeleteMessage(callback: (message: any) => void) {
    if (!this.hubConnection) return;
    this.hubConnection.on('RemoveMessage', callback);
  }


  // Chat users listeners
  onAddUser(callback: (output: any) => void) {
    this.hubConnection.on('AddChatUser', callback);
  }

  onRemoveUser(callback: (output: any) => void) {
    this.hubConnection.on('RemoveChatUser', callback);
  }

  // On test
  onTest(callback: (output: any) => any) {
    this.hubConnection.on('test', callback);
  }
}
