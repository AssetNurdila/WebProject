import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthModalService } from '../../services/auth-modal.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.css',
})
export class AuthModalComponent {
  private authService = inject(AuthService);
  readonly modalService = inject(AuthModalService);

  activeTab: 'login' | 'register' = 'login';
  isLoading = false;

  loginForm = { username: '', password: '' };
  loginError = '';
  showLoginPwd = false;

  regForm = { username: '', email: '', phone: '', password: '', is_agent: false };
  regError = '';
  regSuccess = '';
  showRegPwd = false;

  switchTab(tab: 'login' | 'register'): void {
    this.activeTab = tab;
    this.loginError = '';
    this.regError = '';
    this.regSuccess = '';
    this.isLoading = false;
  }

  close(): void {
    this.modalService.close();
    this.loginForm = { username: '', password: '' };
    this.regForm = { username: '', email: '', phone: '', password: '', is_agent: false };
    this.loginError = '';
    this.regError = '';
    this.regSuccess = '';
    this.isLoading = false;
  }

  onLogin(): void {
    if (!this.loginForm.username || !this.loginForm.password) {
      this.loginError = 'Введите логин и пароль';
      return;
    }
    this.isLoading = true;
    this.loginError = '';
    this.authService.login(this.loginForm.username, this.loginForm.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.close();
      },
      error: (err) => {
        this.isLoading = false;
        const msg: string = err?.error?.non_field_errors?.[0] ?? '';
        this.loginError = msg ? 'Неверный логин или пароль' : 'Ошибка входа. Попробуйте снова';
      },
    });
  }

  onRegister(): void {
    if (!this.regForm.username || !this.regForm.password || !this.regForm.email) {
      this.regError = 'Заполните все обязательные поля';
      return;
    }
    this.isLoading = true;
    this.regError = '';
    this.authService.register(this.regForm).subscribe({
      next: () => {
        this.isLoading = false;
        this.regSuccess = `Аккаунт создан! Логин: ${this.regForm.username}`;
        setTimeout(() => this.close(), 2000);
      },
      error: (err) => {
        this.isLoading = false;
        const errors = err?.error;
        if (!errors) { this.regError = 'Ошибка регистрации. Попробуйте снова'; return; }
        const fieldMap: Record<string, string> = {
          username: 'Логин', email: 'Email', password: 'Пароль', phone: 'Телефон',
        };
        const firstKey = Object.keys(errors)[0];
        const firstVal = errors[firstKey];
        const value = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
        const fieldName = fieldMap[firstKey] ?? firstKey;
        if (value.includes('already exists') || value.includes('unique')) {
          this.regError = `${fieldName}: уже занят. Попробуйте другой`;
        } else {
          this.regError = `${fieldName}: ${value}`;
        }
      },
    });
  }
}
