import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, viewChild } from '@angular/core';
import { Auth } from '../../services/auth';
import { ViewportScroller } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  standalone: false
})
export class Home implements AfterViewInit {
  @ViewChild("bgVid") bgVid!: ElementRef<HTMLVideoElement>

  constructor(private viewportScroller: ViewportScroller) { }

  ngAfterViewInit(): void {
    this.bgVid.nativeElement.playbackRate = 0.87;
    this.bgVid.nativeElement.muted = true;
    this.bgVid.nativeElement.play();
  }

  public openPage(url: string) {
    window.open(url, "_blank");
  }

  scrollToSection() {
    this.viewportScroller.scrollToAnchor('aboutHpa');
  }
}