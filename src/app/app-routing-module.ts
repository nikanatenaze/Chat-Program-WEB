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

const routes: Routes = [
  {path: "", component: Home},
  {path: "home", component: Home},
  {path: "register", component: Register},
  {path: "login", component: Login},
  {path: "profile", component: Profile, canActivate: [RouterGuard]},
  {path: "chats", component: Chats, canActivate: [RouterGuard]},
  {path: "chat/:id", component: Chat, canActivate: [RouterGuard]},
  {path: "chat-detail/:id", component: ChatDetails, canActivate: [RouterGuard]},
  {path: "**", component: ErrorComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
