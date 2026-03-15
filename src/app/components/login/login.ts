import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Auth } from '../../services/auth';
import { Router } from '@angular/router';
import { GlobalData } from '../../classes/global-data';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('starsCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  public regForm!: FormGroup;

  private ctx!: CanvasRenderingContext2D;
  private raf = 0;

  private readonly stars = (() => {
    const s = (n: number) => { const x = Math.sin(n) * 43758.5453; return x - Math.floor(x); };
    return Array.from({ length: 260 }, (_, i) => ({
      x: s(i * 1.3),
      y: s(i * 2.7),
      r: s(i * 5.1) * 1.1 + 0.25,
      a: s(i * 7.3) * 0.6 + 0.25,
      spd: s(i * 4.1) * 2 + 0.4,
      ph: s(i * 6.9) * Math.PI * 2,
      rgb: s(i * 3.7) > 0.85 ? '255,210,180'
        : s(i * 2.1) > 0.88 ? '180,200,255'
          : '255,255,255',
    }));
  })();

  constructor(public auth: Auth, public router: Router, public notifi: NotificationService) { }

  ngOnInit(): void {
    this.GetFormGroup();
  }

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.loop();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    const canvas = this.canvasRef.nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    this.ctx.scale(dpr, dpr);
  };

  private loop = (): void => {
    this.drawStars();
    this.raf = requestAnimationFrame(this.loop);
  };

  private drawStars(): void {
    const { ctx } = this;
    const W = window.innerWidth;
    const H = window.innerHeight;
    ctx.clearRect(0, 0, W, H);
    const t = Date.now() * 0.001;
    for (const s of this.stars) {
      const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.spd + s.ph));
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.rgb},${(tw * s.a).toFixed(2)})`;
      ctx.fill();
    }
  }

  Login() {
    if (this.regForm.invalid) {
      this.regForm.markAllAsTouched();
      return;
    }

    const formData = this.regForm.value;

    this.auth.login(formData).subscribe({
      next: (x) => {
        sessionStorage.setItem('token', x.token);
        this.regForm.reset();
        this.notifi.success('Logged in successfully!');
        this.router.navigate(['/account-center']);
      },
      error: (err) => {
        console.log(err);
        this.notifi.error(`Error while login: ${err.error}`);
      },
    });
  }

  GetFormGroup() {
    this.regForm = new FormGroup({
      email: new FormControl('', [
        Validators.required,
        Validators.email,
      ]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(GlobalData.PASSWORD_MIN_LENGTH),
        Validators.pattern(GlobalData.PASSWORD_REGEX),
      ]),
    });
  }
}