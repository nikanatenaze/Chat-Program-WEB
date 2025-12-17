import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Auth } from '../../services/auth';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  public regForm!: FormGroup;

  constructor(public auth: Auth) { }

  ngOnInit(): void {
    this.GetFormGroup()
  }

  Register() {
    if (this.regForm.invalid) {
      this.regForm.markAllAsTouched();
      return;
    }

    const formData = this.regForm.value;

    console.log(formData);

    this.auth.register(formData).subscribe({
      next: (x) => {
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Successfuly registred",
          showConfirmButton: false,
          timer: 1500
        });
        this.regForm.reset();
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
        Validators.minLength(6),
        Validators.pattern('^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$') 
      ])
    });
  }
}
