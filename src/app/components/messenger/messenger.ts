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

@Component({
  selector: 'app-messenger',
  standalone: false,
  templateUrl: './messenger.html',
  styleUrl: './messenger.css',
})
export class Messenger implements OnInit {

  public token: string = sessionStorage.getItem("token") ?? '';
  public tokenData!: TokenModelInterface
  public userData!: UserInterface
  public userChats$ = new BehaviorSubject<ChatInterface[]>([])
  public selectedChat!: ChatInterface
  public searchTerm$ = new BehaviorSubject<string>('');
  public filteredChats$ = new BehaviorSubject<ChatInterface[]>([]);


  constructor(
    public hub: MainHubService,
    public userService: User,
    public chatUserService: ChatUserService,
    public chatService: ChatService
  ) { }

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

  public send() {
    var a = {
      userId: this.userData.id,
      chatId: 17
    }
    this.chatUserService.AddChatUser(a).subscribe({
      next: x => {
        console.log("succes");

        console.log(x);

      },
      error: x => {
        console.log(x);

      }
    })
  }

  private async connection() {
    await this.hub.startConnection(this.token)
    await this.hub.joinChatUsers(this.userData.id);

    this.hub.onAddUser(data => {
      const updated = [
        ...this.userChats$.value,
        data
      ].sort((a, b) => a.id - b.id);

      this.userChats$.next(updated);
      this.applyFilter();
    });


    this.hub.onRemoveUser(data => {
      this.userChats$.next(
        this.userChats$.value.filter(x => x.id !== data.id)
      );
      this.applyFilter();
    })

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
      this.chatUserService.GetChatsOfUser(this.userData.id).subscribe({
        next: x => {
          this.userChats$.next(x);
          this.applyFilter();
          res()
        },
        error(err) {
          rej(err)
        }
      })
    })
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


  // swals
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
            this.chatUserService.AddChatUser({ userId: xa.createdByUserId, chatId: xa.id })
              .subscribe(x => {
                Swal.fire({
                  title: "Success!",
                  text: "Successfuly created new chat!",
                  icon: "success"
                });
              })

          },
          error: x => {
            Swal.fire({
              icon: "error",
              title: "Oops...",
              text: `${x}`,
              footer: '<a href="#">Why do I have this issue?</a>'
            });
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
        this.chatUserService.RemoveChatUser({ userId: this.tokenData.id, chatId: id }).subscribe({
          next: () => {
            Swal.fire({
              title: "Quited!",
              text: "You have successfuly quited the chat.",
              icon: "success"
            })
          }
        })
      }
    })
  }
}
