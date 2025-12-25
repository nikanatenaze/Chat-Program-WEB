import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Auth } from '../../services/auth';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  public regForm!: FormGroup;

  constructor(public auth: Auth, public router: Router) { }

  ngOnInit(): void {
    this.GetFormGroup()
  }

  Login() {
    if (this.regForm.invalid) {
      this.regForm.markAllAsTouched();
      return;
    }

    const formData = this.regForm.value;

    this.auth.login(formData).subscribe({
      next: (x) => {
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Successfuly loged in",
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          sessionStorage.setItem('token', x.token);
          this.regForm.reset();
          this.router.navigate(["/"])
        });
      },
      error(err) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: `${err.error}`,
          footer: '<a href="https://github.com/nikanatenaze/Chat-Program-WEB" target="_blank">Do you want visit project repository?</a>'
        });

      },
    })
  }

  GetFormGroup() {
    this.regForm = new FormGroup({
      email: new FormControl('', [
        Validators.required,
        Validators.email
      ]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern('^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$')
      ])
    });
  }
}
