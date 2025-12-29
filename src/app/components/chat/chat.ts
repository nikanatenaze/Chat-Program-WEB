import { Component, OnInit, OnDestroy, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatHubService } from '../../services/chat-hub.service';
import { MessageService } from '../../services/message.service';
import { ChatService } from '../../services/chat.service';
import { User } from '../../services/user';
import { MessageInterface } from '../../interfaces/message.interface';
import { TokenModelInterface } from '../../interfaces/token-model.interface';

@Component({
  selector: 'app-chat',
  standalone: false,
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
})
export class Chat implements OnInit, OnDestroy, AfterViewChecked {
  public routerId!: number;
  public tokenData!: TokenModelInterface;
  public messagesData: MessageInterface[] = [];
  public newMessage = '';
  public loading = true;

  constructor(
    private actRouter: ActivatedRoute,
    private router: Router,
    private userService: User,
    private chatHub: ChatHubService,
    private messagesService: MessageService,
    private chatService: ChatService
  ) { }

  ngOnInit(): void {
    this.actRouter.params.subscribe(params => {
      this.routerId = +params['id'];
      this.userService.getDataFromToken().subscribe(token => {
        this.tokenData = token;
        this.initChat();
      });
    });
  }

  private initChat() {
    this.chatHub.startConnection(sessionStorage.getItem("token") ?? '')
      .then(() => {
        this.chatHub.joinChat(this.routerId);
        this.chatHub.onCreateMessage(msg => {
          this.messagesData.push(msg);
          this.scrollToBottom();
        });

        this.chatHub.onEditMessage(msg => {
          const index = this.messagesData.findIndex(m => m.id === msg.id);
          if (index !== -1) this.messagesData[index] = msg;
        });

        this.chatHub.onDeleteMessage(msg => {
          this.messagesData = this.messagesData.filter(m => m.id !== msg.id);
        });
      });
    this.fetchMessages();
  }

  private fetchMessages() {
    this.chatService.GetChatMessages(this.routerId).subscribe(msgs => {
      this.messagesData = msgs;
      this.loading = false;
      console.log(this.loading);
      
      this.scrollToBottom();
    });
  }

  public createMessage() {
    if (!this.newMessage.trim()) return;

    const payload = {
      content: this.newMessage,
      userId: this.tokenData.id,
      chatId: this.routerId
    };

    this.messagesService.CreateMessage(payload).subscribe({
      next: () => this.newMessage = '',
      error: err => console.error(err)
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.messages');
      if (container) container.scrollTop = container.scrollHeight;
    }, 50);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.chatHub.stopConnection();
  }
}