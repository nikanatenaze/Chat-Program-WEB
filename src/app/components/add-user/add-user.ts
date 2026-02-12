import { Component, OnInit, OnDestroy, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatHubService } from '../../services/chat-hub.service';
import { MessageService } from '../../services/message.service';
import { ChatService } from '../../services/chat.service';
import { User } from '../../services/user';
import { MessageInterface } from '../../interfaces/message.interface';
import { TokenModelInterface } from '../../interfaces/token-model.interface';
import { ChatUserService } from '../../services/chat-user.service';
import { ChatInterface } from '../../interfaces/chat.interface';
import { GlobalMethods } from '../../classes/global-methods';
import { UserInterface } from '../../interfaces/user.interface';
import Swal from 'sweetalert2';
import { flush } from '@angular/core/testing';
import { MainHubService } from '../../services/main-hub.service';


@Component({
  selector: 'app-add-user',
  standalone: false,
  templateUrl: './add-user.html',
  styleUrl: './add-user.css',
})
export class AddUser {
  public routerId!: number;
  public tokenData!: TokenModelInterface;
  public usersData!: UserInterface[];
  public chatData!: ChatInterface;
  public messagesData: MessageInterface[] = [];
  public newMessage = '';
  public loading = true;
  public isSending = false;

  private readonly NAVIGATION_STORAGE_KEY = 'navHidden';

  constructor(
    private actRouter: ActivatedRoute,
    private router: Router,
    private userService: User,
    private chatHub: MainHubService,
    private messagesService: MessageService,
    private chatUserService: ChatUserService,
    private chatService: ChatService
  ) { }

  ngOnInit(): void {
    sessionStorage.setItem(this.NAVIGATION_STORAGE_KEY, "true");

    this.actRouter.params.subscribe(async params => {
      this.routerId = +params['id'];
      this.userService.getDataFromToken().subscribe(async token => {
        this.tokenData = token;
        await this.initChat();
      });
    });
  }


  private async initChat() {
    await this.connection(); // connect SignalR first
    await this.fetchData();  // then fetch chat, users, messages
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
    }
    finally {
      this.loading = false
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
            createdAt: GlobalMethods.formatDate(a.createdAt, false, true),
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
            createdAt: GlobalMethods.formatDate(x.createdAt, false, true)
          }
          this.chatData = formated;
          res();
        },
        error(err) {
          console.log(123);

          rej(err)
        },
      })
    })
  }

  // signalR methods
  private async connection() {
    await this.chatHub.startConnection(sessionStorage.getItem("token") ?? '');

    // WAIT for join to complete
    await this.chatHub.joinChat(this.routerId);

    // THEN subscribe
    this.chatHub.onCreateMessage(msg => {
      console.log("Received message", msg);
      const formattedMsg = {
        ...msg,
        createdAt: GlobalMethods.formatDate(msg.createdAt, false, true),
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
  }

  public createMessage() {
    if (this.isSending || !this.newMessage.trim()) return;

    this.isSending = true;

    const payload = {
      content: this.newMessage,
      userId: this.tokenData.id,
      chatId: this.routerId
    };

    this.messagesService.CreateMessage(payload).subscribe({
      next: () => {
        this.newMessage = '';  // reset input
        this.isSending = false;
        // no need to push message manually; SignalR will broadcast
      },
      error: err => {
        console.error(err);
        this.isSending = false;
      }
    });
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
    return this.usersData.find(x => x.id === id) ?? null;
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

  isGrouped(index: number): boolean {
    if (index === 0) return false;
    return this.messagesData[index].userId === this.messagesData[index - 1].userId;
  }
}
