import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './pages/auth/login.component';
import { DashboardSwitcherComponent } from './pages/dashboards/dashboard-switcher.component';
import { ProjectListComponent } from './pages/projects/project-list.component';
import { TaskBoardComponent } from './pages/tasks/task-board.component';
import { UserManagementComponent } from './pages/users/user-management.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { SubtasksComponent } from './pages/subtasks/subtasks.component';

export const routes: Routes = [
  { path: 'auth/login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardSwitcherComponent },
      { path: 'projects', component: ProjectListComponent },
      { path: 'tasks', component: TaskBoardComponent },
      { path: 'users', component: UserManagementComponent, canActivate: [roleGuard(['CEO', 'ADMIN'])] },
      { path: 'reports', component: ReportsComponent },
      { path: 'subtasks', component: SubtasksComponent }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
