import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CEODashboardComponent } from './ceo-dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { TeamLeadDashboardComponent } from './team-lead-dashboard.component';
import { EmployeeDashboardComponent } from './employee-dashboard.component';

@Component({
  selector: 'app-dashboard-switcher',
  standalone: true,
  imports: [
    CommonModule,
    CEODashboardComponent,
    AdminDashboardComponent,
    TeamLeadDashboardComponent,
    EmployeeDashboardComponent
  ],
  template: `
    <ng-container [ngSwitch]="auth.userRole()">
      <app-ceo-dashboard *ngSwitchCase="'CEO'"></app-ceo-dashboard>
      <app-admin-dashboard *ngSwitchCase="'ADMIN'"></app-admin-dashboard>
      <app-team-lead-dashboard *ngSwitchCase="'TEAM_LEAD'"></app-team-lead-dashboard>
      <app-employee-dashboard *ngSwitchDefault></app-employee-dashboard>
    </ng-container>
  `
})
export class DashboardSwitcherComponent {
  auth = inject(AuthService);
}
