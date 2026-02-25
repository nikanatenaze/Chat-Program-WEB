import { Injectable } from '@angular/core';
import { Notyf } from 'notyf';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // audios
  private receiveAudio = new Audio('notyf-sound-effect.mp3');
  private errorAudio = new Audio('notyf-error-sound-effect.mp3')

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
    this.playAudio(this.receiveAudio)
  }

  error(message: string) {
    this.notyf.error(message);
    this.playAudio(this.errorAudio, 0.3)
  }

  info(message: string) {
    this.notyf.open({
      type: 'info',
      message: message,
      background: '#3b82f6'
    });
    this.playAudio(this.receiveAudio)
  }

  warning(message: string) {
    this.notyf.open({
      type: 'warning',
      message: message,
      background: '#f59e0b'
    });
    this.playAudio(this.receiveAudio)
  }

  private playAudio(audio: HTMLAudioElement, volume = 0.4, time = 0) {
    audio.volume = volume
    audio.currentTime = time;
    audio.play()
  }
}
