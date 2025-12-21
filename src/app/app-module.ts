import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Home } from './components/home/home';
import { Messenger } from './components/messenger/messenger';
import { Error } from './components/error/error';
import { Navigation } from './components/navigation/navigation';
import { Footer } from './components/footer/footer';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Register } from './components/register/register';
import { Login } from './components/login/login';
import { ReactiveFormsModule } from '@angular/forms';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { Profile } from './components/profile/profile';

@NgModule({
  declarations: [
    App,
    Home,
    Messenger,
    Error,
    Navigation,
    Footer,
    Register,
    Login,
    Profile
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
