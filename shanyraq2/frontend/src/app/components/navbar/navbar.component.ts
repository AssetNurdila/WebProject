import { ChangeDetectorRef, Component, inject, OnInit, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthModalService } from '../../services/auth-modal.service';
import { User } from '../../models/interfaces';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  host: { ngSkipHydration: 'true' },
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  private authService = inject(AuthService);
  private authModal = inject(AuthModalService);
  private cdr = inject(ChangeDetectorRef);

  currentUser: User | null = null;
  dropdownOpen = false;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.cdr.detectChanges();
    });
  }

  get initials(): string {
    const name = this.currentUser?.username ?? '';
    return name.slice(0, 2).toUpperCase();
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.profile-wrap')) {
      this.dropdownOpen = false;
    }
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  logout(): void {
    this.dropdownOpen = false;
    this.authService.logout();
  }

  openLogin(): void {
    this.authModal.open();
  }
}
