import { Component, OnInit } from '@angular/core';
import { TokenModelInterface } from '../../interfaces/token-model.interface';
import { User } from '../../services/user';
import { ChatInterface } from '../../interfaces/chat.interface';
import { UserInterface } from '../../interfaces/user.interface';
import { ChatUserService } from '../../services/chat-user.service';
import { MainHubService } from '../../services/main-hub.service';
import { BehaviorSubject } from 'rxjs';
import Swal from 'sweetalert2';
import { GlobalMethods } from '../../classes/global-methods';
import { ChatService } from '../../services/chat.service';
import { MessageInterface } from '../../interfaces/message.interface';
import { MessageService } from '../../services/message.service';
import { Notyf } from 'notyf';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-messenger',
  templateUrl: './messenger.html',
  standalone: false,
  styleUrls: ['./messenger.css'], // <- fix here
})
export class Messenger implements OnInit {

  public token: string = sessionStorage.getItem("token") ?? '';
  public tokenData!: TokenModelInterface
  public userData!: UserInterface
  public userChats$ = new BehaviorSubject<ChatInterface[]>([])
  public searchTerm$ = new BehaviorSubject<string>('');
  public filteredChats$ = new BehaviorSubject<ChatInterface[]>([]);
  public newMessage = '';

  // loadings
  public chatLoading = false;
  public chatsLoading = true;
  public isSending = false;

  //selected
  public selectedChat: ChatInterface | null = null;
  public selectedChatMessages$ = new BehaviorSubject<MessageInterface[]>([]);

  //users
  private usersMap = new Map<number, string>();

  // audios
  private receiveAudio = new Audio('message-recive-sound.mp3');

  constructor(
    public hub: MainHubService,
    public userService: User,
    public chatUserService: ChatUserService,
    public chatService: ChatService,
    public messageService: MessageService,
    public notification: NotificationService
  ) {

  }

  ngOnInit(): void {
    this.userService.getDataFromToken().subscribe(x => {
      this.tokenData = x
      this.build();
    })

  }

  private async build() {
    await this.fetchData()
    this.applyFilter()
    await this.connection()
  }

  private async fetchData() {
    try {
      await this.fetchUser()
      await this.fetchChats()
    }
    catch (error) {

    }
  }

  private async connection() {
    await this.hub.startConnection(this.token)
    await this.hub.joinChatUsers(this.userData.id);

    // Chat-user SignalR Config
    this.hub.onAddUser(data => {
      const updated = [
        ...this.userChats$.value,
        data
      ].sort((a, b) => a.id - b.id);

      this.userChats$.next(updated);
      this.applyFilter();
      this.notification.success(`You have been added to a ${data.name}  chat!`)
    });

    this.hub.onRemoveUser(data => {
      this.userChats$.next(
        this.userChats$.value.filter(x => x.id !== data.id)
      );
      this.applyFilter();
    })

    // message SignalR Config
    this.hub.onCreateMessage(data => {
      const updated = [
        ...this.selectedChatMessages$.value,
        this.mapMessage(data)
      ]

      if (!this.isWriter(data)) {
        this.receiveAudio.currentTime = 0;
        this.receiveAudio.volume = 0.4
        this.receiveAudio.play();
      }

      this.selectedChatMessages$.next(updated)
      this.scrollToBottom()
    })

    this.hub.onDeleteMessage(data => {
      const updated = this.selectedChatMessages$.value.filter(msg => msg.id !== data.id);
      this.selectedChatMessages$.next(updated);
    });
  }

  ngOnDestroy(): void {
    this.hub.stopConnection()
      .then(() => console.log('SignalR disconnected'))
      .catch(err => console.error('SignalR disconnect error:', err));
  }

  // Data fetching methods

  fetchUser(): Promise<void> {
    return new Promise((res, rej) => {
      this.userService.getUserById(this.tokenData.id).subscribe({
        next: x => {
          this.userData = x
          res();
        },
        error(err) {
          rej(err)
        }
      })
    })
  }

  fetchChats(): Promise<void> {
    return new Promise((res, rej) => {
      this.chatUserService.GetChatsOfUser().subscribe({
        next: x => {
          this.userChats$.next(x);
          this.applyFilter();
          this.chatsLoading = false
          res()
        },
        error(err) {
          rej(err)
        }
      })
    })
  }

  // chat UI methods
  public selectChat(id: number) {
    this.chatLoading = true;
    this.selectedChat = null;
    this.selectedChatMessages$.next([]);

    this.chatService.GetChatById(id).subscribe(chat => {
      this.selectedChat = chat;

      this.chatUserService.GetUsersInChat(chat.id).subscribe(users => {
        users.forEach(u => {
          this.usersMap.set(u.id, u.name);
        });
      });

      this.hub.leaveChat(chat.id);
      this.hub.joinChat(chat.id);

      this.chatService.GetChatMessages(chat.id).subscribe(messages => {
        const updated = messages.map(x => ({
          ...x,
          createdAt: GlobalMethods.formatDate(x.createdAt, false, true),
          isWriter: this.isWriter(x),
          userName: x.userName
        }));

        this.selectedChatMessages$.next(updated);
        this.chatLoading = false;
        this.scrollToBottom()
      });
    });
  }

  shouldShowSender(index: number): boolean {
    const messages = this.selectedChatMessages$.value;
    const current = messages[index];

    if (current.isWriter) return false;

    if (index === 0) return true;

    const prev = messages[index - 1];

    return current.userId !== prev.userId;
  }

  private isWriter(data: MessageInterface): boolean {
    return data.userId === this.userData.id;
  }

  private mapMessage(data: MessageInterface): MessageInterface {
    return {
      ...data,
      createdAt: GlobalMethods.formatDate(data.createdAt, false, true),
      isWriter: this.isWriter(data),
    };
  }

  getUserName(userId: number): string {
    return this.usersMap.get(userId) ?? 'Unknown';
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.chat-messages');
      if (container) container.scrollTop = container.scrollHeight;
    }, 50);
  }

  // chat-list UI methods
  private applyFilter() {
    const term = this.searchTerm$.value.toLowerCase();

    const filtered = this.userChats$.value.filter(c =>
      !term || c.name.toLowerCase().includes(term)
    );

    this.filteredChats$.next(filtered);
  }

  onSearch(value: string) {
    this.searchTerm$.next(value);
    this.applyFilter();
  }

  // chat UI methods
  public sendMessage() {
    if (this.selectedChat) {
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
        chatId: this.selectedChat?.id
      };

      this.messageService.CreateMessage(payload).subscribe({
        next: () => {
          this.newMessage = ''
          this.isSending = false;
        },
        error: err => {
          console.error(err)
          this.isSending = false;
        }
      });
    }
    this.scrollToBottom()
  }

  // swals

  showUserAddedAlert(name: string) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `${name} added to chat!`,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  }

  showUserRemovedAlert(name: string) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `${name} removed from chat!`,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  }

  createChatSwal() {
    Swal.fire({
      title: 'Create Chat',
      html: `
        <input type="text" id="chatName" class="swal2-input" placeholder="Chat Name">
        <div style="text-align: left; margin: 10px 0;">
          <input type="checkbox" id="hasPassword"> Chat has password
        </div>
        <input type="password" id="chatPassword" class="swal2-input" placeholder="Password" style="display:none;">
      `,
      focusConfirm: false,
      preConfirm: () => {
        const chatName = (document.getElementById('chatName') as HTMLInputElement).value;
        const hasPassword = (document.getElementById('hasPassword') as HTMLInputElement).checked;
        const password = (document.getElementById('chatPassword') as HTMLInputElement).value;

        if (!chatName) {
          Swal.showValidationMessage('Chat name is required');
          return false;
        }
        if (hasPassword && !password) {
          Swal.showValidationMessage('Password is required');
          return false;
        }

        return {
          name: chatName,
          hasPassword: hasPassword,
          password: hasPassword ? password : null
        };
      },
      didOpen: () => {
        const hasPasswordCheckbox = document.getElementById('hasPassword') as HTMLInputElement;
        const passwordInput = document.getElementById('chatPassword') as HTMLInputElement;

        hasPasswordCheckbox.addEventListener('change', () => {
          passwordInput.style.display = hasPasswordCheckbox.checked ? 'block' : 'none';
        });
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const p = {
          ...result.value,
          createdByUserId: Number(this.userData.id),
        }

        this.chatService.CreateChat(p).subscribe({
          next: xa => {
            this.chatUserService.AddChatUser({ userId: xa.createdByUserId, chatId: xa.id }).subscribe(x => {

            })
          },
          error: () => {
            this.notification.error("Successfuly created new chat!")
          }
        })
      }
    });
  }

  quitFromChatSwal(id: number) {
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
        console.log(this.selectedChat);

        if (id == this.selectedChat?.id) {
          this.selectedChat == null
        }
        this.chatUserService.RemoveChatUser({ userId: this.tokenData.id, chatId: id }).subscribe({
          next: () => {
            this.notification.success("Successfuly quited from chat")
          },
          error: () => {
            this.notification.error("Some error happend!")
          }
        })
      }
    })
  }
}
