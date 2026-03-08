import { Component, OnInit } from '@angular/core';
import { Auth } from '../../services/auth';
import { User } from '../../services/user';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { finalize, map } from 'rxjs/operators';
import { UserInterface } from '../../interfaces/user.interface';
import { GlobalMethods } from '../../classes/global-methods';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {

  public fetchedUser: UserInterface | null = null;
  public routerId!:  number
  public loading = true;

  constructor(
    private actRouter: ActivatedRoute,
    private userService: User,
    private router: Router,
    private auth: Auth,
    private notify: NotificationService
  ) { }

  async ngOnInit(): Promise<void> {
    try {
      this.actRouter.params.subscribe(x => {
        this.routerId = +x['id']
      })
      console.log(this.routerId);

      this.userService.getUserById(Number(this.routerId))
        .pipe(
          map(x => {
            return {
              ...x,
              createdAt: GlobalMethods.formatDate(x.createdAt)
            };
          }),
          finalize(() => this.loading = false)
        )
        .subscribe({
          next: (x) => {
            this.fetchedUser = x;
          },
          error: () => {
            this.router.navigate(['/']);
          }
        });
    } catch (err) {
      console.error(err);
      this.router.navigate(['/']);
      this.loading = false;
    }
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
        this.notify.success("Loged out successfuly!")
      }
    });
  }

  deleteUser(): void {
    
  }

}