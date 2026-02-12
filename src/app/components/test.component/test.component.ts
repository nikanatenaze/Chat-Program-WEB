import { Component, OnInit } from '@angular/core';
import { MainHubService } from '../../services/main-hub.service';
import { ChatUserService } from '../../services/chat-user.service';

@Component({
  selector: 'app-test.component',
  standalone: false,
  templateUrl: './test.component.html',
  styleUrl: './test.component.css',
})
export class TestComponent implements OnInit {

  constructor(private chatHub: MainHubService, private uhm: ChatUserService) {

  }
  ngOnInit(): void {
    this.connection()
  }
  private async connection() {
    await this.chatHub.startConnection(sessionStorage.getItem("token") ?? '');

    await this.chatHub.joinChatUsers(24);

    this.chatHub.onTest(data => {
      console.log(data);
    })
  }

  // sendRequest() {
  //   this.uhm.test(24).subscribe(d =>{
  //     console.log(d);
      
  //   })
  // }
}
