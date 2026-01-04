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
import { ChatUserService } from '../../services/chat-user.service';
import { ChatUserInterface } from '../../interfaces/chat-user.interface';
import { ChatInterface } from '../../interfaces/chat.interface';
import { GlobalMethods } from '../../classes/global-methods';
import { UserInterface } from '../../interfaces/user.interface';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-chat',
  standalone: false,
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
})
export class Chat implements OnInit, OnDestroy {
  public routerId!: number;
  public tokenData!: TokenModelInterface;
  public usersData!: UserInterface[];
  public chatData!: ChatInterface;
  public messagesData: MessageInterface[] = [];
  public newMessage = '';
  public loading = true;
  public isSending = false;

  constructor(
    private actRouter: ActivatedRoute,
    private router: Router,
    private userService: User,
    private chatHub: ChatHubService,
    private messagesService: MessageService,
    private chatUserService: ChatUserService,
    private chatService: ChatService
  ) { }

  ngOnInit(): void {
    sessionStorage.setItem("navHidden", "true")
    this.actRouter.params.subscribe(params => {
      this.routerId = +params['id'];
      this.userService.getDataFromToken().subscribe(token => {
        this.tokenData = token;
        this.initChat();
      });
    });
  }

  private initChat() {
    this.connection();
    this.fetchData();
  }

  //Data fetching methods

  private async fetchData() {
    try {
      await this.fetchChat();
      await this.fetchUsers();
      await this.fetchMessages();
    } catch (err) {
      console.error(err);
      this.router.navigate(["/"])
    } finally {
      var checkUser = this.getUserById(this.tokenData.id)
      if (!checkUser) this.router.navigate(["/"])
      this.loading = false;
    }
  }

  private fetchUsers(): Promise<void> {
    return new Promise((res, rej) => {
      this.chatUserService.GetUsersInChat(this.routerId).subscribe({
        next: x => {
          this.usersData = x
          res();
        },
        error(err) {
          rej(err)
        },
      })
    })
  }

  private fetchMessages(): Promise<void> {
    return new Promise((res, rej) => {
      this.chatService.GetChatMessages(this.routerId).subscribe({
        next: x => {
          const formatted = x.map(a => ({
            ...a,
            createdAt: GlobalMethods.formatDate(a.createdAt, true),
            userName: this.getUserById(a.userId)?.name || 'Unknown'
          }));
          this.messagesData = formatted;
          this.scrollToBottom();
          res()
        },
        error(err) {
          rej(err)
        },
      });
    })
  }

  private fetchChat(): Promise<void> {
    return new Promise((res, rej) => {
      this.chatService.GetChatById(this.routerId).subscribe({
        next: x => {
          const formated = {
            ...x,
            createdAt: GlobalMethods.formatDate(x.createdAt, true)
          }
          this.chatData = x
          res();
        },
        error(err) {
          rej(err)
        },
      })
    })
  }

  // signalR methods
  private connection() {
    this.chatHub.startConnection(sessionStorage.getItem("token") ?? '')
      .then(() => {
        this.chatHub.joinChat(this.routerId);
        this.chatHub.onCreateMessage(msg => {
          const formattedMsg = {
            ...msg,
            createdAt: GlobalMethods.formatDate(msg.createdAt, true),
            userName: this.getUserById(msg.userId)?.name || 'Unknown'
          };
          this.messagesData.push(formattedMsg);
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
  }

  public createMessage() {
    if (this.isSending) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Stop spamming!",
        footer: '<a href="#">Why do I have this issue?</a>'
      });
      return;
    };
    if (!this.newMessage.trim()) return;

    this.isSending = true;
    const payload = {
      content: this.newMessage,
      userId: this.tokenData.id,
      chatId: this.routerId
    };

    this.messagesService.CreateMessage(payload).subscribe({
      next: () => {
        this.newMessage = ''
        this.isSending = false;
      },
      error: err => {
        console.error(err)
        this.isSending = false;
      }
    });
    this.scrollToBottom()
  }

  ngOnDestroy(): void {
    this.chatHub.stopConnection();
  }

  // Baisic methods
  private scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.messages');
      if (container) container.scrollTop = container.scrollHeight;
    }, 50);
  }

  private getUserById(id: number) {
    return this.usersData.find(x => x.id == id)
  }

  notImplemented() {
    GlobalMethods.notImplemented();
  }

  // Functional

  quitFromChat() {
    Swal.fire({
      title: "You want quit?",
      text: "You cant join back, by your self",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, I want quit"
    }).then((result) => {
      if (result.isConfirmed) {
        this.chatUserService.RemoveChatUser({ userId: this.tokenData.id, chatId: this.chatData.id }).subscribe({
          next: () => {
            Swal.fire({
              title: "Quited!",
              text: "You have successfuly quited the chat.",
              icon: "success"
            }).then(() => {
              this.router.navigate(["/chats"])
            });
          }
        })
      }
    })
  }
  
}