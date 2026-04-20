import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../shared/services/auth.service';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-admin.component.html',
  styleUrl: './dashboard-admin.component.scss'
})
export class DashboardAdminComponent implements OnInit {
  currentUser: User | null = null;

  quickActions = [
    { icon: '👥', label: 'Gestionar Usuarios', action: 'users' },
    { icon: '🏢', label: 'Gestionar Talleres', action: 'workshops' },
    { icon: '📊', label: 'Reportes Globales', action: 'reports' },
  ];

  stats = [
    { label: 'Usuarios Activos', value: '156', icon: '👥' },
    { label: 'Talleres', value: '23', icon: '🏢' },
    { label: 'Incidentes Totales', value: '1,847', icon: '🚨' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {}

  handleAction(action: string): void {
    console.log('Action:', action);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
