import { Component, OnInit, OnDestroy, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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

}
