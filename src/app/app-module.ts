import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Home } from './components/home/home';
import { Messenger } from './components/messenger/messenger';
import { Error } from './components/error/error';
import { Navigation } from './components/navigation/navigation';
import { Footer } from './components/footer/footer';

@NgModule({
  declarations: [
    App,
    Home,
    Messenger,
    Error,
    Navigation,
    Footer
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
