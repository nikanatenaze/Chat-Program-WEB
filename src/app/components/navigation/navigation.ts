import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-navigation',
  standalone: false,
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
})
export class Navigation implements OnInit {
  public userToken: string | null = null;
  ngOnInit(): void {
    this.userToken = localStorage.getItem("token")
    console.log(this.userToken);
  }


  public openPage(url: string) {
    window.open(url, "_blank");
  }
}
