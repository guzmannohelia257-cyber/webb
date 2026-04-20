import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { DashboardTallerComponent } from './dashboards/taller/dashboard-taller.component';
import { DashboardAdminComponent } from './dashboards/admin/dashboard-admin.component';
import { UnauthorizedComponent } from './shared/pages/unauthorized.component';
import { authGuard, tipoGuard, adminGuard, publicGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard]
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    children: [
      {
        path: 'taller',
        component: DashboardTallerComponent,
        canActivate: [tipoGuard(['taller'])]
      },
      {
        path: 'admin',
        component: DashboardAdminComponent,
        canActivate: [adminGuard]
      }
    ]
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
