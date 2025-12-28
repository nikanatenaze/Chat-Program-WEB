import { Component, OnInit } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { ChatUserService } from '../../services/chat-user.service';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { User } from '../../services/user';
import { TokenModelInterface } from '../../interfaces/token-model.interface';
import { Token } from '@angular/compiler';
import { MessageService } from '../../services/message.service';
import { MessageInterface } from '../../interfaces/message.interface';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: false,
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit {
  private socket$!: WebSocketSubject<any>;
  public routerId!: number;
  public tokenData!: TokenModelInterface;
  public messagesData!: Array<MessageInterface>
  public loading = true;


  constructor(
    private userService: User,
    private chatService: ChatService,
    private chatUserService: ChatUserService,
    private messagesService: MessageService,
    private actRouter: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.getStaticData()
    this.fetchMessages()
  }

  getStaticData() {
    this.actRouter.params.subscribe((params: any) => {
      this.routerId = +params['id'];
      this.userService.getDataFromToken().subscribe((data: TokenModelInterface) => {
        this.tokenData = data;
        this.checkMembership();
      });
    });
    this.loading = false
  }

  checkMembership() {
    this.chatUserService.CheckUserInChat(this.routerId, this.tokenData.id).subscribe({
      next: (x) => {
        if (!x) {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        console.error(err);
        this.router.navigate(['/']);
      }
    });
  }

  fetchMessages() {
    this.chatService.GetChatMessages(this.routerId).subscribe(x => {
      this.messagesData = x
      console.log(x); 
    })
  }

  connect(chatId: number): Observable<MessageInterface> {
    this.socket$ = webSocket(`ws://localhost:5000/chat/${chatId}`); // change URL to your backend
    return this.socket$;
  }

  createMessage(input: string) {
    this.messagesService.CreateMessage({content: input, userId: this.tokenData.id, chatId: this.routerId}).subscribe({
      next: x => {
        console.log(x);
        
      },
      error(err) {
        console.log(err);
        
      },
    })
  }
}
