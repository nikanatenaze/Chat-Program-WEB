import { Component, OnInit } from '@angular/core';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-navigation',
  standalone: false,
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
})
export class Navigation implements OnInit {
  public userToken: string | null = null;

  constructor(public auth: Auth) {}

  ngOnInit(): void {
    this.auth.userToken$.subscribe(token => {
      this.userToken = token;
    });
  }

  public openPage(url: string) {
    window.open(url, "_blank");
  }
}
