import { Injectable } from '@angular/core';
import { Notyf } from 'notyf';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // audios
  private receiveAudio = new Audio('notyf-sound-effect.mp3');

  private notyf = new Notyf({
    duration: 3500,
    ripple: true,
    dismissible: true,
    position: {
      x: 'center',
      y: 'bottom'
    }
  });

  success(message: string) {
    this.notyf.success(message);
    this.audioEffect()
  }

  error(message: string) {
    this.notyf.error(message);
    this.audioEffect()
  }

  info(message: string) {
    this.notyf.open({
      type: 'info',
      message: message,
      background: '#3b82f6'
    });
    this.audioEffect()
  }

  warning(message: string) {
    this.notyf.open({
      type: 'warning',
      message: message,
      background: '#f59e0b'
    });
    this.audioEffect()
  }

  private audioEffect() {
    this.receiveAudio.volume = 0.4
    this.receiveAudio.currentTime = 0;
    this.receiveAudio.play()
  }
}
