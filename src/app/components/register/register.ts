import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Auth } from '../../services/auth';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { GlobalData } from '../../classes/global-data';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  public regForm!: FormGroup;

  constructor(public auth: Auth, public router: Router) { }

  ngOnInit(): void {
    this.GetFormGroup()
  }

  Register() {
    if (this.regForm.invalid) {
      this.regForm.markAllAsTouched();
      return;
    }

    const formData = this.regForm.value;

    this.auth.register(formData).subscribe({
      next: (x) => {
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Successfuly registred",
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          this.regForm.reset();
          this.router.navigate(['/login'])
        });
      },
      error(err) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: `${err.error}`,
          footer: '<a href="https://github.com/nikanatenaze/Chat-Program-WEB" target="_blank">Why do I have this issue?</a>'
        });

      },
    })
  }

  GetFormGroup() {
    this.regForm = new FormGroup({
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
}
