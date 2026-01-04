import { Component, ElementRef, OnInit, ViewChild, viewChild } from '@angular/core';
import { Auth } from '../../services/auth';
import { filter } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-navigation',
  standalone: false,
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
})
export class Navigation implements OnInit {
  public userToken: string | null = null;

  @ViewChild('navigation') navigation!: ElementRef;
  @ViewChild('navContent') navContent!: ElementRef;
  @ViewChild('toggleHideButton') hiddeButton!: ElementRef;

  private readonly STORAGE_KEY = 'navHidden';

  constructor(
    public auth: Auth,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.auth.userToken$.subscribe(token => {
      this.userToken = token;
    });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects;
        const shouldHide = url.startsWith('/chat/');
        sessionStorage.setItem(this.STORAGE_KEY, String(shouldHide));
        this.restoreNavState();
      });
  }

  toggleHiddeNav() {
    const isHidden = this.navigation.nativeElement.classList.toggle('hidden-nav-content');
    this.navContent.nativeElement.classList.toggle('navigaton-content-shadow');
    this.hiddeButton.nativeElement.classList.toggle('fa-chevron-up');
    this.hiddeButton.nativeElement.classList.toggle('fa-chevron-down');
    sessionStorage.setItem(this.STORAGE_KEY, String(isHidden));
  }

  private restoreNavState() {
    const isHidden = sessionStorage.getItem(this.STORAGE_KEY) === 'true';
    this.navigation.nativeElement.classList.toggle('hidden-nav-content', isHidden);
    this.navContent.nativeElement.classList.toggle('navigaton-content-shadow', !isHidden);
    this.hiddeButton.nativeElement.classList.toggle('fa-chevron-up', !isHidden);
    this.hiddeButton.nativeElement.classList.toggle('fa-chevron-down', isHidden);
  }

  public openPage(url: string) {
    window.open(url, "_blank");
  }
}
