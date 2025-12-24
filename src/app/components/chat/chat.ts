import { Component } from '@angular/core';
import { ChatInterface } from '../../interfaces/chat.interface';

@Component({
  selector: 'app-chat',
  standalone: false,
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat {
  public fetchedUser: ChatInterface | null = null;
}
