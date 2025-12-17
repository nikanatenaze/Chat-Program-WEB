import { Component } from '@angular/core';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.css'], // <- corrected
  standalone: false
})
export class Home {
  public openPage(url: string) {
    window.open(url, "_blank");
  }
}