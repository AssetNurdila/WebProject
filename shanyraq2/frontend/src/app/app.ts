import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { AiChatComponent } from './components/ai-chat/ai-chat.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, AuthModalComponent, AiChatComponent],
  template: `
    <app-navbar />
    <router-outlet />
    <app-auth-modal />
    <app-ai-chat />
  `,
  styles: [],
})
export class App implements OnInit {
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.loadCurrentUser();
  }
}
