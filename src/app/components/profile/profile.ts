import { Component, OnInit } from '@angular/core';
import { Auth } from '../../services/auth';
import { User } from '../../services/user';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs/operators';
import { UserInterface } from '../../interfaces/user.interface';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {

  public fetchedUser: UserInterface | null = null;
  public loading = true;

  constructor(
    private userService: User,
    private router: Router,
    private auth: Auth
  ) { }

  ngOnInit(): void {
    const id = localStorage.getItem("logedin_user_id");

    if (!id) {
      this.router.navigate(['/']);
      return;
    }

    this.userService.getUserById(Number(id))
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (user: UserInterface) => {
          this.fetchedUser = user,
            console.log(user);

        },
        error: () => this.router.navigate(['/'])
      });
  }

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
          id: this.fetchedUser!.id,
          password: result.value
        };

        this.userService.deleteUser(payload).subscribe({
          next: () => {
            Swal.fire(
              'Deleted!',
              'Your account has been deleted.',
              'success'
            ).then(() => {
              localStorage.removeItem('token')
              localStorage.removeItem('logedin_user_id')
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