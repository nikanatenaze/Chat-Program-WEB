import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Register } from './components/register/register';
import { Login } from './components/login/login';
import { Profile } from './components/profile/profile';
import { ErrorComponent } from './components/error.component/error.component';
import { Chats } from './components/chats/chats';
import { ChatDetails } from './components/chat-details/chat-details';
import { Chat } from './components/chat/chat';
import { RouterGuard } from './classes/router-guard';
import { AuthGuard } from './classes/auth-guard';
import { AddUser } from './components/add-user/add-user';
import { AccountCenter } from './components/account-center/account-center';

const routes: Routes = [
  {path: "", component: Home},
  {path: "home", component: Home},
  {path: "register", component: Register, canActivate: [AuthGuard]},
  {path: "login", component: Login, canActivate: [AuthGuard]},
  {path: "account-center", component: AccountCenter, canActivate: [RouterGuard]},
  {path: "profile/:id", component: Profile},
  {path: "chats", component: Chats, canActivate: [RouterGuard]},
  {path: "chat/:id", component: Chat, canActivate: [RouterGuard]},
  {path: "chat-detail/:id", component: ChatDetails, canActivate: [RouterGuard]},
  {path: "chat/:id/add-user", component: AddUser, canActivate: [RouterGuard]},
  {path: "**", component: ErrorComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
