import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'Шанырак — Элитная недвижимость',
  },
  {
    path: 'catalog',
    loadComponent: () =>
      import('./pages/catalog/catalog.component').then((m) => m.CatalogComponent),
    title: 'Каталог объектов',
  },
  {
    path: 'listing/:id',
    loadComponent: () =>
      import('./pages/listing-detail/listing-detail.component').then(
        (m) => m.ListingDetailComponent
      ),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
    title: 'Личный кабинет',
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./pages/auth/auth.component').then((m) => m.AuthComponent),
    title: 'Вход и регистрация',
  },
  { path: '**', redirectTo: '' },
];
