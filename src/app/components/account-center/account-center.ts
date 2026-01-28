import { Component, OnInit } from '@angular/core';
import { UserInterface } from '../../interfaces/user.interface';
import { ChatUserService } from '../../services/chat-user.service';
import { User } from '../../services/user';
import { TokenModelInterface } from '../../interfaces/token-model.interface';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { Auth } from '../../services/auth';
import { Router } from '@angular/router';
import { GlobalData } from '../../classes/global-data';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-account-center',
  templateUrl: './account-center.html',
  standalone: false,
  styleUrls: ['./account-center.css'],
})
export class AccountCenter implements OnInit {
  // Fetch data
  public tokenData!: TokenModelInterface
  public userData!: UserInterface
  public updateForm!: FormGroup
  // Baisic data
  loading: boolean = true;
  public activePage: string = 'profile';
  public minPaslen = GlobalData.PASSWORD_MIN_LENGTH


  constructor(public userService: User, public auth: Auth, public router: Router) {

  }

  ngOnInit(): void {
    this.GetFormGroup()
    this.userService.getDataFromToken().subscribe({
      next: x => {
        this.tokenData = x
        this.userService.getUserById(this.tokenData.id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: x => {
            this.updateForm.patchValue({
              id: x.id,
              name: x.name,
              email: x.email
            })
          }
        })
      }
    })
  }

  setPage(page: string) {
    this.activePage = page;
  }

  // form grups

  GetFormGroup() {
    this.updateForm = new FormGroup({
      id: new FormControl({ disabled: true, value: '' }),
      name: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),

      ]),
      email: new FormControl('', [
        Validators.required,
        Validators.email
      ]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(GlobalData.PASSWORD_MIN_LENGTH),
        Validators.pattern(GlobalData.PASSWORD_REGEX)
      ])
    });
  }

  // details methods

  saveChanges() {
    if (this.updateForm.invalid) {
      // Show alert if form is invalid
      Swal.fire({
        icon: 'error',
        title: 'Invalid prompts!',
        text: 'Please check password or another prompts before atempting one more time.'
      });
      return;
    }

    const form = this.updateForm.getRawValue()
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, do it!"
    }).then((result) => {
      if (result.isConfirmed) {
        this.userService.updateUser(form).subscribe({
          next: x => {
            Swal.fire({
              title: "Updated successfuly!",
              text: "Your data has been patched!",
              icon: "success"
            })
          },
          error(x) {
            Swal.fire({
              icon: "error",
              title: "Oops...",
              text: `${x.error}`,
              footer: '<a href="#">Why do I have this issue?</a>'
            });
          }
        })
      }
    });
  }

  // settings methods

  logout(): void {
    Swal.fire({
      title: "Are you sure?",
      text: "After this you have to login again!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, logout!"
    }).then((result) => {
      if (result.isConfirmed) {
        this.auth.logout();
        Swal.fire({
          title: "Logged out!",
          icon: "success"
        }).then(() => this.router.navigate(['/']));
      }
    });
  }

  deleteUser(): void {
    Swal.fire({
      title: 'Confirm account deletion',
      text: 'Enter your password to delete your account',
      input: 'password',
      inputPlaceholder: 'Password',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#d33',
      inputValidator: (value) => {
        if (!value) {
          return 'Password is required';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const payload = {
          id: this.tokenData!.id,
          password: result.value
        };

        this.userService.deleteUser(payload).subscribe({
          next: () => {
            Swal.fire(
              'Deleted!',
              'Your account has been deleted.',
              'success'
            ).then(() => {
              this.auth.logout()
              this.router.navigate(["/"])
            });
          },
          error: (err) => {
            Swal.fire(
              'Error',
              err?.error?.message || 'Wrong password',
              'error'
            );
          }
        });
      }
    });
  }

}
