import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'auth/login', loadComponent: () => import('./pages/auth/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboards/dashboard-switcher.component').then(m => m.DashboardSwitcherComponent) },
      { path: 'projects', loadComponent: () => import('./pages/projects/project-list.component').then(m => m.ProjectListComponent) },
      { path: 'tasks', loadComponent: () => import('./pages/tasks/task-board.component').then(m => m.TaskBoardComponent) },
      { path: 'users', loadComponent: () => import('./pages/users/user-management.component').then(m => m.UserManagementComponent), canActivate: [roleGuard(['CEO', 'ADMIN'])] },
      { path: 'reports', loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent) },
      { path: 'subtasks', loadComponent: () => import('./pages/subtasks/subtasks.component').then(m => m.SubtasksComponent) }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
