import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

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
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        const backendMsg: string = err?.error?.non_field_errors?.[0] ?? '';
        this.loginError = backendMsg ? 'Неверный логин или пароль' : 'Ошибка входа. Попробуйте снова';
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
        setTimeout(() => {
          this.regSuccess = '';
          this.router.navigate(['/dashboard']);
        }, 2500);
      },
      error: (err) => {
        this.isLoading = false;
        const errors = err?.error;
        if (!errors) { this.regError = 'Ошибка регистрации. Попробуйте снова'; return; }
        const fieldMap: Record<string, string> = {
          username: 'Логин',
          email: 'Email',
          password: 'Пароль',
          phone: 'Телефон',
        };
        const firstKey = Object.keys(errors)[0];
        const firstVal = errors[firstKey];
        const value = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
        const fieldName = fieldMap[firstKey] ?? firstKey;
        if (value.includes('already exists') || value.includes('unique')) {
          this.regError = `${fieldName}: уже занят. Попробуйте другой`;
        } else if (value.includes('too short') || value.includes('min_length')) {
          this.regError = `${fieldName}: слишком короткий`;
        } else {
          this.regError = `${fieldName}: ${value}`;
        }
      },
    });
  }
}
