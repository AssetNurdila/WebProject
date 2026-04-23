import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthModalService } from '../services/auth-modal.service';

export const authGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const modalService = inject(AuthModalService);

  if (isPlatformBrowser(platformId) && !!localStorage.getItem('access_token')) {
    return true;
  }
  modalService.open();
  return false;
};
