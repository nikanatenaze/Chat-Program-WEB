import { Component, OnInit } from '@angular/core';
import { UserInterface } from '../../interfaces/user.interface';
import { User } from '../../services/user';
import { TokenModelInterface } from '../../interfaces/token-model.interface';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { Auth } from '../../services/auth';
import { Router } from '@angular/router';
import { GlobalData } from '../../classes/global-data';
import { finalize } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { GlobalMethods } from '../../classes/global-methods';

@Component({
  selector: 'app-account-center',
  templateUrl: './account-center.html',
  standalone: false,
  styleUrls: ['./account-center.css'],
})
export class AccountCenter implements OnInit {

  public tokenData!: TokenModelInterface;
  public userData!: UserInterface;
  public updateForm!: FormGroup;

  loading = true;
  activePage = 'profile';
  minPasLen = GlobalData.PASSWORD_MIN_LENGTH;

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

  get displayAvatarSrc(): string {
    return this.avatarPreview ?? this.DEFAULT_AVATAR;
  }

  constructor(
    public userService: User,
    public auth: Auth,
    public router: Router,
    public notifi: NotificationService,
  ) { }

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

              // Set sidebar display values from server data
              this.displayName = user.name;
              this.displayEmail = user.email;

              if (user.profileImageUrl) {
                this.avatarPreview = user.profileImageUrl;
              }
            },
          });
      },
    });
  }

  setPage(page: string): void {
    this.activePage = page;
  }

  // Form

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

  saveChanges(): void {
    if (this.updateForm.invalid) {
      this.updateForm.markAllAsTouched();
      this.notifi.error('Please fix the errors before saving.');
      return;
    }

    Swal.fire({
      text: 'Your profile details will be updated.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Save it',
    }).then(result => {
      if (!result.isConfirmed) return;

      const form = this.updateForm.getRawValue();
      this.userService.updateUser(form).subscribe({
        next: () => {
          // Only update sidebar after server confirms success
          this.displayName = this.updateForm.get('name')?.value;
          this.displayEmail = this.updateForm.get('email')?.value;
          this.notifi.success('Profile updated successfully!');
        },
        error: err => {
          this.notifi.error(`Update failed: ${err?.error?.message ?? err.error}`);
        },
      });
    });
  }

  changePassword(): void {
    Swal.fire({
      title: 'Change Password',
      html: `
      <input id="swal-cur"  type="password" class="swal2-input" placeholder="Current password">
      <input id="swal-new"  type="password" class="swal2-input" placeholder="New password (min ${this.minPasLen} chars)">
      <input id="swal-conf" type="password" class="swal2-input" placeholder="Confirm new password">
    `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Update Password',
      focusConfirm: false,
      preConfirm: () => {
        const cur = (document.getElementById('swal-cur') as HTMLInputElement).value;
        const nw = (document.getElementById('swal-new') as HTMLInputElement).value;
        const conf = (document.getElementById('swal-conf') as HTMLInputElement).value;

        if (!cur) { Swal.showValidationMessage('Current password is required.'); return false; }
        if (nw.length < this.minPasLen) { Swal.showValidationMessage(`New password must be at least ${this.minPasLen} characters.`); return false; }
        if (nw !== conf) { Swal.showValidationMessage('Passwords do not match.'); return false; }

        return { currentPassword: cur, newPassword: nw };
      },
    }).then(result => {
      if (!result.isConfirmed) return;

      this.userService.changePassword(result.value).subscribe({
        next: () => {
          this.notifi.success('Password changed successfully!');
        },
        error: (err) => {
          if (err.status === 200) {
            this.notifi.success('Password changed successfully!');
          } else {
            const message = err?.error?.message || 'Failed to change password. Please try again.';
            this.notifi.error(message);
          }
        }
      });
    });
  }

  // Avatar

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
      next: (res: any) => {
        this.notifi.success("Successfuly removed profile picture!")
        this.avatarPreview = this.userData?.profileImageUrl ?? null;
        this.avatarFile = null;
      },
      error: err => {
        
        this.notifi.error(`Remove failed: ${err?.error?.message ?? 'Unknown error'}`);
      }
    })
  }

  // Settings

  logout(): void {
    this.auth.logout();
    this.notifi.success('Logged out successfully!');
    this.router.navigate(['/']);
  }

  deleteUser(): void {
    Swal.fire({
      title: 'Delete Account',
      html: `
      <p style="color:#ef4444; margin-bottom:12px;">This action is permanent and cannot be undone.</p>
      <input id="swal-del-pass" type="password" class="swal2-input" placeholder="Enter your password to confirm">
    `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete my account',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#374151',
      focusConfirm: false,
      preConfirm: () => {
        const pass = (document.getElementById('swal-del-pass') as HTMLInputElement).value;
        if (!pass) { Swal.showValidationMessage('Password is required to delete your account.'); return false; }
        return { password: pass };
      },
    }).then(result => {
      if (!result.isConfirmed || !result.value) return;

      this.userService.deleteUser(result.value.password).subscribe({
        next: () => {
          this.notifi.success('Account deleted.');
          this.auth.logout();
          this.router.navigate(['/']);
        },
        error: err => {
          this.notifi.error('Something went wrong.');
        },
      });
    });
  }
}