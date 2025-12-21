import { Component, OnInit } from '@angular/core';
import { Auth } from '../../services/auth';
import { User } from '../../services/user';
import { UserClass } from '../../classes/user.class';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {

  public fetchedUser: UserClass | null = null;
  public loading = true;

  constructor(
    private userService: User,
    private router: Router,
    private auth: Auth
  ) {}

  ngOnInit(): void {
    const id = localStorage.getItem("logedin_user_id");

    if (!id) {
      this.router.navigate(['/']);
      return;
    }

    this.userService.getUserById(Number(id))
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (user: UserClass) => {
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
    Swal.fire('Not implemented yet', '', 'info');
  }
}
