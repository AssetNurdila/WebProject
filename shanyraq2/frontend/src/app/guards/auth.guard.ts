import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthModalService } from '../services/auth-modal.service';

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    if (!exp) return false;
    return Date.now() < exp * 1000;
  } catch {
    return false;
  }
}

export const authGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const modalService = inject(AuthModalService);

  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('access_token');
    if (token && isTokenValid(token)) {
      return true;
    }
  }
  
  modalService.open();
  return false;
};
