import { Component, ElementRef, OnInit, ViewChild, viewChild } from '@angular/core';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-navigation',
  standalone: false,
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
})
export class Navigation implements OnInit {
  public userToken: string | null = null;
  @ViewChild('navContent') navigation!: ElementRef
  @ViewChild('toggleHideButton') hiddeButton!: ElementRef

  constructor(public auth: Auth) {}

  ngOnInit(): void {
    this.auth.userToken$.subscribe(token => {
      this.userToken = token;
    });
  }

  toggleHiddeNav() {
    this.navigation.nativeElement.classList.toggle('hidden-nav-content')
    this.hiddeButton.nativeElement.classList.toggle('fa-chevron-up')
    this.hiddeButton.nativeElement.classList.toggle('fa-chevron-down')
  }

  public openPage(url: string) {
    window.open(url, "_blank");
  }
}
