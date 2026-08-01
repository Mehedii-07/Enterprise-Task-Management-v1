import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CEODashboardComponent } from './ceo-dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { ProjectLeadDashboardComponent } from './project-lead-dashboard.component';
import { EmployeeDashboardComponent } from './employee-dashboard.component';

@Component({
  selector: 'app-dashboard-switcher',
  standalone: true,
  imports: [
    CommonModule,
    CEODashboardComponent,
    AdminDashboardComponent,
    ProjectLeadDashboardComponent,
    EmployeeDashboardComponent
  ],
  template: `
    <ng-container [ngSwitch]="auth.userRole()">
      <app-ceo-dashboard *ngSwitchCase="'CEO'"></app-ceo-dashboard>
      <app-admin-dashboard *ngSwitchCase="'ADMIN'"></app-admin-dashboard>
      <app-project-lead-dashboard *ngSwitchCase="'PROJECT_LEAD'"></app-project-lead-dashboard>
      <app-employee-dashboard *ngSwitchDefault></app-employee-dashboard>
    </ng-container>
  `
})
export class DashboardSwitcherComponent {
  auth = inject(AuthService);
}
