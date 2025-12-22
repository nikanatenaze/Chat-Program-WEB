import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Messenger } from './components/messenger/messenger';
import { Register } from './components/register/register';
import { Login } from './components/login/login';
import { Profile } from './components/profile/profile';
import { ErrorComponent } from './components/error.component/error.component';

const routes: Routes = [
  {path: "", component: Home},
  {path: "home", component: Home},
  {path: "messenger", component: Messenger},
  {path: "register", component: Register},
  {path: "login", component: Login},
  {path: "profile", component: Profile},
  {path: "**", component: ErrorComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
