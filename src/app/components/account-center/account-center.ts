import { Component } from '@angular/core';

type Page = 'profile' | 'settings' | 'security';

@Component({
  selector: 'app-account-center',
  templateUrl: './account-center.html',
  standalone: false,
  styleUrls: ['./account-center.css'],
})
export class AccountCenter {
  activePage: string = 'profile';

  setPage(page: string) {
    this.activePage = page;
  }
}
  