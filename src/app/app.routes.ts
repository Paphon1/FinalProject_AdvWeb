import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'rider',
    loadComponent: () => import('./rider').then((m) => m.RiderPage),
  },
  {
    path: 'rider/:code',
    loadComponent: () => import('./rider').then((m) => m.RiderPage),
  },
  {
    path: '',
    loadComponent: () => import('./layout').then((m) => m.Layout),
    children: [
      {
        path: 'customers',
        loadComponent: () => import('./customers').then((m) => m.CustomersPage),
      },
      {
        path: 'orders',
        loadComponent: () => import('./orders').then((m) => m.OrdersPage),
      },
      {
        path: 'dispatch',
        loadComponent: () => import('./dispatch').then((m) => m.DispatchPage),
      },
      { path: '', redirectTo: 'dispatch', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
