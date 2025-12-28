import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Home } from './components/home/home';
import { Navigation } from './components/navigation/navigation';
import { Footer } from './components/footer/footer';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Register } from './components/register/register';
import { Login } from './components/login/login';
import { ReactiveFormsModule } from '@angular/forms';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { Profile } from './components/profile/profile';
import { ErrorComponent } from './components/error.component/error.component';
import { Chats } from './components/chats/chats';
import { Loader } from './components/loader/loader';
import { ChatDetails } from './components/chat-details/chat-details';
import { Chat } from './components/chat/chat';

@NgModule({
  declarations: [
    App,
    Home,
    Navigation,
    Footer,
    Register,
    Login,
    Profile,
    ErrorComponent,
    Chats,
    Loader,
    ChatDetails,
    Chat,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    SweetAlert2Module.forRoot()
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
