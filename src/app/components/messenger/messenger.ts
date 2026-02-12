import { Component, OnInit } from '@angular/core';
import { ChatHubService } from '../../services/chat-hub.service';
import { TokenModelInterface } from '../../interfaces/token-model.interface';
import { User } from '../../services/user';
import { ChatInterface } from '../../interfaces/chat.interface';
import { UserInterface } from '../../interfaces/user.interface';
import { ChatUserService } from '../../services/chat-user.service';
import { MainHubService } from '../../services/main-hub.service';
import { BehaviorSubject } from 'rxjs';

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

  constructor(
    public hub: MainHubService,
    public userService: User,
    public chatUserService: ChatUserService
  ) { }

  ngOnInit(): void {
    this.userService.getDataFromToken().subscribe(x => {
      this.tokenData = x
      this.build();
    })

  }

  private async build() {
    await this.fetchData()
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
    });


    this.hub.onRemoveUser(data => {
      this.userChats$.next(
        this.userChats$.value.filter(x => x.id !== data.id)
      )
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
          this.userChats$.next(x)
          res()
        },
        error(err) {
          rej(err)
        }
      })
    })
  }
}
