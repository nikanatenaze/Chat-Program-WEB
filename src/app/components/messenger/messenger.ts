import { Component, OnInit } from '@angular/core';
import { ChatHubService } from '../../services/chat-hub.service';
import { GlobalData } from '../../classes/global-data';
import { GlobalMethods } from '../../classes/global-methods';

@Component({
  selector: 'app-messenger',
  standalone: false,
  templateUrl: './messenger.html',
  styleUrl: './messenger.css',
})
export class Messenger implements OnInit {

  constructor(public chatHub: ChatHubService) { }

  ngOnInit(): void {
    this.connection();
  }

  private connection() {
    const token = sessionStorage.getItem("token") ?? '';
    this.chatHub.startConnection(token)
      .then(() => {
        console.log('✅ SignalR connected for chat users');

        // Replace with your chatId from route or session
        const chatId = Number(sessionStorage.getItem('currentChatId') ?? 11);

        this.chatHub.joinChat(chatId)
          .then(() => console.log(`✅ Joined chat ${chatId}`))
          .catch(err => console.error('Failed to join chat:', err));
      })
      .catch(err => console.error('SignalR connection failed:', err));
  }

  ngOnDestroy(): void {
    this.chatHub.stopConnection()
      .then(() => console.log('SignalR disconnected'))
      .catch(err => console.error('SignalR disconnect error:', err));
  }
}
