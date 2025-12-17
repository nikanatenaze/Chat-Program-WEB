import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Messenger } from './components/messenger/messenger';

const routes: Routes = [
  {path: "", component: Home},
  {path: "home", component: Home},
  {path: "messenger", component: Messenger},
  {path: "**", component: Error},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
