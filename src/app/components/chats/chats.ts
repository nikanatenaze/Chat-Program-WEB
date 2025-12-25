import { Component, OnInit } from '@angular/core';
import { ChatInterface } from '../../interfaces/chat.interface';
import { ChatService } from '../../services/chat.service';
import { ChatUserService } from '../../services/chat-user.service';
import { Router } from '@angular/router';
import { BehaviorSubject, finalize, firstValueFrom, map } from 'rxjs';
import { GlobalMethods } from '../../classes/global-methods';
import Swal from 'sweetalert2';
import { User } from '../../services/user';

@Component({
  selector: 'app-chats',
  standalone: false,
  templateUrl: './chats.html',
  styleUrls: ['./chats.css'],
})
export class Chats implements OnInit {

  loading: boolean = true
  private _userChats$ = new BehaviorSubject<ChatInterface[]>([]);
  public userChats$ = this._userChats$.asObservable();
  protected userId: number = 0

  constructor(private chatService: ChatService, private chatUserService: ChatUserService, private router: Router, private userService: User) {
  }

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.userService.getDataFromToken())
      this.userId = Number(data.id)
      if (!this.userId) {
        this.router.navigate(['/'])
      }

      this.chatUserService.GetChatsOfUser(Number(this.userId))
        .pipe(finalize(() => {
          this.loading = false
        }))
        .subscribe({
          next: (x) => {
            const formattedChats = x.map(c => ({
              ...c,
              createdAt: GlobalMethods.formatDate(c.createdAt)
            }));
            this._userChats$.next(formattedChats);
          },
          error: ((x) => {
            console.log(x);
            this.router.navigate(["/"])
          })
        });
    } catch (error) {
      console.error(error);
      this.router.navigate(['/']);
    }
  }

  loadUserChats(userId: number) {
    this.chatUserService.GetChatsOfUser(userId).subscribe({
      next: (chats) => this._userChats$.next(chats),
      error: (err) => console.error(err)
    });
  }

  createChat() {
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
          createdByUserId: Number(this.userId),
        }

        this.chatService.CreateChat(p).subscribe({
          next: xa => {
            this.chatUserService.AddChatUser({ userId: xa.createdByUserId, chatId: xa.id })
              .subscribe(x => {
                xa.createdAt = GlobalMethods.formatDate(xa.createdAt);
                const current = this._userChats$.getValue();
                this._userChats$.next([...current, xa]);

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

  quitFromChat(chatId: number) {
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
        this.chatUserService.RemoveChatUser({ userId: this.userId, chatId: chatId })
          .subscribe({
            next: () => {
              Swal.fire({
                title: "Quited!",
                text: "You have successfuly quited the chat.",
                icon: "success"
              }).then(() => {
                const current = this._userChats$.getValue();
                this._userChats$.next(current.filter(chat => chat.id !== chatId));
              });
            },
            error: (x) => {
              Swal.fire({
                icon: "error",
                title: "Oops...",
                text: `Something went wrong... \n Error: ${x}`,
                footer: '<a href="#">Why do I have this issue?</a>'
              });
            }
          })
      }
    });
  }

  moreInfo() {
    Swal.fire({
      icon: 'info',
      title: 'Not Implemented',
      text: 'This feature is not implemented yet.',
      confirmButtonText: 'OK'
    });
  }
}
