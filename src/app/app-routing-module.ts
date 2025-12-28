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

const routes: Routes = [
  {path: "", component: Home},
  {path: "home", component: Home},
  {path: "register", component: Register},
  {path: "login", component: Login},
  {path: "profile", component: Profile},
  {path: "chats", component: Chats},
  {path: "chat/:id", component: Chat},
  {path: "chat-detail/:id", component: ChatDetails},
  {path: "**", component: ErrorComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
