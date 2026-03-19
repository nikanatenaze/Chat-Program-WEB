import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { UserInterface } from '../../interfaces/user.interface';
import { User } from '../../services/user';
import { TokenModelInterface } from '../../interfaces/token-model.interface';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Auth } from '../../services/auth';
import { Router } from '@angular/router';
import { GlobalData } from '../../classes/global-data';
import { finalize } from 'rxjs';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-account-center',
  templateUrl: './account-center.html',
  standalone: false,
  styleUrls: ['./account-center.css'],
})
export class AccountCenter implements OnInit, AfterViewInit {

  public tokenData!: TokenModelInterface;
  public userData!: UserInterface;
  public updateForm!: FormGroup;

  @ViewChild('starsCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  loading = true;
  activePage = 'profile';
  minPasLen = GlobalData.PASSWORD_MIN_LENGTH;

  // ── Modal state ────────────────────────────────────────────────
  modalSaveOpen = false;
  modalPassOpen = false;
  modalDeleteOpen = false;

  // Password modal fields
  passForm = { current: '', newPass: '', confirm: '' };
  showCur = false;
  showNew = false;
  showConf = false;
  passModalError = '';

  // Delete modal fields
  deletePassword = '';
  showDelPass = false;
  deleteModalError = '';

  // ── bg props ───────────────────────────────────────────────────
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

  // Sidebar display values — only update after server confirms save
  displayName = '';
  displayEmail = '';

  // Avatar
  avatarPreview: string | null = null;
  avatarFile: File | null = null;

  readonly DEFAULT_AVATAR = 'default-user-image.jpg';

  get nameInitial(): string {
    return this.displayName ? this.displayName.charAt(0).toUpperCase() : '?';
  }

  // ── Password strength ──────────────────────────────────────────
  get passStrengthPct(): number {
    const p = this.passForm.newPass;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score += 25;
    if (p.length >= 12) score += 15;
    if (/[A-Z]/.test(p)) score += 20;
    if (/[0-9]/.test(p)) score += 20;
    if (/[^A-Za-z0-9]/.test(p)) score += 20;
    return Math.min(score, 100);
  }

  get passStrengthLabel(): string {
    const pct = this.passStrengthPct;
    if (pct <= 25) return 'weak';
    if (pct <= 50) return 'fair';
    if (pct <= 75) return 'good';
    return 'strong';
  }

  constructor(
    public userService: User,
    public auth: Auth,
    public router: Router,
    public notifi: NotificationService,
  ) { }

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.loop();
  }

  ngOnInit(): void {
    this.buildForm();

    this.userService.getDataFromToken().subscribe({
      next: token => {
        this.tokenData = token;
        this.userService.getUserById(this.tokenData.id)
          .pipe(finalize(() => (this.loading = false)))
          .subscribe({
            next: (user: UserInterface) => {
              this.updateForm.patchValue({ name: user.name, email: user.email });
              this.userData = user;
              this.displayName = user.name;
              this.displayEmail = user.email;
              if (user.profileImageUrl) this.avatarPreview = user.profileImageUrl;
            },
          });
      },
    });
  }

  setPage(page: string): void {
    this.activePage = page;
  }

  // ── Form ───────────────────────────────────────────────────────

  buildForm(): void {
    this.updateForm = new FormGroup({
      name: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
      ]),
      email: new FormControl('', [
        Validators.required,
        Validators.email,
      ]),
    });
  }

  // ── Save Changes ───────────────────────────────────────────────

  saveChanges(): void {
    if (this.updateForm.invalid) {
      this.updateForm.markAllAsTouched();
      this.notifi.error('Please fix the errors before saving.');
      return;
    }
    this.modalSaveOpen = true;
  }

  closeSaveModal(): void {
    this.modalSaveOpen = false;
  }

  confirmSave(): void {
    this.modalSaveOpen = false;
    const form = this.updateForm.getRawValue();
    this.userService.updateUser(form).subscribe({
      next: () => {
        this.displayName = this.updateForm.get('name')?.value;
        this.displayEmail = this.updateForm.get('email')?.value;
        this.notifi.success('Profile updated successfully!');
      },
      error: err => {
        this.notifi.error(`Update failed: ${err?.error?.message ?? err.error}`);
      },
    });
  }

  // ── Change Password ────────────────────────────────────────────

  changePassword(): void {
    this.passForm = { current: '', newPass: '', confirm: '' };
    this.showCur = false;
    this.showNew = false;
    this.showConf = false;
    this.passModalError = '';
    this.modalPassOpen = true;
  }

  closePassModal(): void {
    this.modalPassOpen = false;
  }

  confirmChangePassword(): void {
    this.passModalError = '';
    const { current, newPass, confirm } = this.passForm;

    if (!current) {
      this.passModalError = 'Current password is required.';
      return;
    }
    if (newPass.length < this.minPasLen) {
      this.passModalError = `New password must be at least ${this.minPasLen} characters.`;
      return;
    }
    if (newPass !== confirm) {
      this.passModalError = 'Passwords do not match.';
      return;
    }

    this.modalPassOpen = false;
    this.userService.changePassword({ currentPassword: current, newPassword: newPass }).subscribe({
      next: () => {
        this.notifi.success('Password changed successfully!');
      },
      error: (err) => {
        if (err.status === 200) {
          this.notifi.success('Password changed successfully!');
        } else {
          this.notifi.error(err?.error?.message ?? 'Failed to change password. Please try again.');
        }
      },
    });
  }

  // ── Avatar ─────────────────────────────────────────────────────

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.notifi.error('Image must be smaller than 2 MB.');
      input.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.notifi.error('Only image files are allowed.');
      input.value = '';
      return;
    }

    this.avatarFile = file;
    const reader = new FileReader();

    this.userService.updateProfileImage(file).subscribe({
      next: (res: any) => {
        this.notifi.success('Profile photo updated!');
        this.avatarPreview = res.imageUrl ?? this.avatarPreview;
        reader.onload = () => (this.avatarPreview = reader.result as string);
        reader.readAsDataURL(file);
      },
      error: err => {
        this.notifi.error(`Upload failed: ${err?.error?.message ?? 'Unknown error'}`);
        this.avatarPreview = this.userData?.profileImageUrl ?? null;
        this.avatarFile = null;
      },
    });
  }

  removeAvatar(): void {
    this.userService.removeProfileImage().subscribe({
      next: () => {
        this.notifi.success('Profile picture removed!');
        this.avatarPreview = null;
        this.avatarFile = null;
      },
      error: err => {
        this.notifi.error(`Remove failed: ${err?.error?.message ?? 'Unknown error'}`);
      },
    });
  }

  // ── Logout ─────────────────────────────────────────────────────

  logout(): void {
    this.auth.logout();
    this.notifi.success('Logged out successfully!');
    this.router.navigate(['/']);
  }

  // ── Delete Account ─────────────────────────────────────────────

  deleteUser(): void {
    this.deletePassword = '';
    this.showDelPass = false;
    this.deleteModalError = '';
    this.modalDeleteOpen = true;
  }

  closeDeleteModal(): void {
    this.modalDeleteOpen = false;
  }

  confirmDeleteUser(): void {
    this.deleteModalError = '';
    if (!this.deletePassword) {
      this.deleteModalError = 'Password is required to delete your account.';
      return;
    }

    this.modalDeleteOpen = false;
    this.userService.deleteUser(this.deletePassword).subscribe({
      next: () => {
        this.notifi.success('Account deleted.');
        this.auth.logout();
        this.router.navigate(['/']);
      },
      error: () => {
        this.notifi.error('Something went wrong. Please try again.');
      },
    });
  }

  // ── Canvas / bg ────────────────────────────────────────────────

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
}