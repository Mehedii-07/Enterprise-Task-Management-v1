import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1>Profile Settings</h1>
          <p>Manage your account details and preferences.</p>
        </div>
        <button class="btn-3d icon-btn" (click)="closeProfile()" style="background: rgba(0,0,0,0.2); border: none; padding: 8px; border-radius: 50%; color: var(--text-muted); cursor: pointer; transition: all 0.2s ease; display: flex;">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="profile-content">
        <div class="card glass-card">
          
          <div class="avatar-section">
            <div class="avatar-preview">
              <img *ngIf="avatarUrl" [src]="avatarUrl" alt="Avatar" (error)="avatarUrl = ''" />
              <span *ngIf="!avatarUrl" class="material-symbols-outlined">person</span>
            </div>
            <div class="avatar-info">
              <h3>Profile Picture</h3>
              <p>Drag and drop a photo here, or click to browse.</p>
              
              <div 
                class="dropzone" 
                [class.drag-over]="isDragOver"
                (dragover)="onDragOver($event)" 
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
                (click)="fileInput.click()">
                <span class="material-symbols-outlined">cloud_upload</span>
                <span class="dropzone-text">Upload Photo</span>
                <input #fileInput type="file" accept="image/*" style="display: none;" (change)="onFileSelected($event)">
              </div>
              <div *ngIf="uploadingAvatar" class="uploading-text">Uploading...</div>
            </div>
          </div>

          <form (ngSubmit)="saveProfile()" class="profile-form">
            <div class="form-row">
              <div class="form-group">
                <label>First Name</label>
                <input type="text" [(ngModel)]="firstName" name="firstName" class="input-3d" />
              </div>
              <div class="form-group">
                <label>Last Name</label>
                <input type="text" [(ngModel)]="lastName" name="lastName" class="input-3d" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Email Address</label>
                <input type="email" [(ngModel)]="email" name="email" class="input-3d" required />
              </div>
              <div class="form-group">
                <label>Phone Number</label>
                <input type="text" [(ngModel)]="phone" name="phone" class="input-3d" />
              </div>
            </div>



            <div class="form-group">
              <label>New Password (Leave blank to keep current)</label>
              <input type="password" [(ngModel)]="password" name="password" placeholder="••••••••" class="input-3d" />
            </div>

            <div *ngIf="successMsg" class="alert alert-success">{{ successMsg }}</div>
            <div *ngIf="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-3d" [disabled]="loading">
                <span class="material-symbols-outlined">save</span>
                {{ loading ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 32px;
      max-width: 900px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
      h1 { font-size: 2rem; color: #fff; margin-bottom: 8px; font-weight: 700; }
      p { color: var(--text-muted); font-size: 1rem; }
    }

    .glass-card {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      border-left: 1px solid rgba(255, 255, 255, 0.2);
      padding: 40px;
      box-shadow: 10px 10px 30px rgba(0,0,0,0.3);
    }

    .avatar-section {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 1px solid rgba(255,255,255,0.1);

      .avatar-preview {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border: 3px solid rgba(255,255,255,0.2);
        box-shadow: 0 10px 20px rgba(0,0,0,0.3);

        img { width: 100%; height: 100%; object-fit: cover; }
        span { font-size: 48px; color: #fff; }
      }

      .avatar-info {
        h3 { color: #fff; font-size: 1.2rem; margin-bottom: 4px; }
        p { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 12px; }
        
        .dropzone {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          background: rgba(0,0,0,0.2);
          cursor: pointer;
          transition: all 0.3s ease;
          
          &:hover, &.drag-over {
            border-color: var(--accent-primary);
            background: rgba(59, 130, 246, 0.1);
          }
          
          span.material-symbols-outlined { color: var(--accent-primary); font-size: 24px; }
          .dropzone-text { color: #fff; font-weight: 500; font-size: 0.9rem; }
        }
        
        .uploading-text {
          margin-top: 8px;
          color: var(--accent-primary);
          font-size: 0.85rem;
          font-weight: 500;
        }
      }
    }

    .profile-form {
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }

      .form-group {
        margin-bottom: 24px;
        
        label {
          display: block;
          margin-bottom: 8px;
          color: #D1D5DB;
          font-weight: 500;
          font-size: 0.9rem;
        }
      }

      .input-3d {
        width: 100%;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: #fff;
        font-size: 0.95rem;
        transition: all 0.3s ease;
        box-shadow: inset 2px 2px 5px rgba(0,0,0,0.3);
        outline: none;

        &:focus {
          border-color: var(--accent-primary);
          box-shadow: inset 3px 3px 6px rgba(0,0,0,0.4), 0 0 10px rgba(59, 130, 246, 0.2);
        }
      }

      .alert {
        padding: 12px 16px;
        border-radius: 10px;
        margin-bottom: 24px;
        font-size: 0.9rem;
        
        &.alert-success { background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3); }
        &.alert-danger { background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.3); }
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 10px;

        .btn-3d {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #3B82F6, #2563EB);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3), inset 1px 1px 1px rgba(255,255,255,0.3), 0 2px 0 #1D4ED8;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(37, 99, 235, 0.4), inset 1px 1px 1px rgba(255,255,255,0.4), 0 4px 0 #1D4ED8;
          }

          &:active {
            transform: translateY(2px);
            box-shadow: 0 1px 2px rgba(37, 99, 235, 0.3), 0 0 0 #1D4ED8;
          }
          
          &:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
        }
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  router = inject(Router);

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  avatarUrl = '';
  password = '';

  loading = false;
  uploadingAvatar = false;
  isDragOver = false;
  successMsg = '';
  errorMsg = '';

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.api.get<any>('/users/' + this.auth.currentUser()?.id).subscribe({
      next: (user) => {
        this.firstName = user.first_name || '';
        this.lastName = user.last_name || '';
        this.email = user.email || '';
        this.phone = user.phone_number || '';
        this.avatarUrl = user.avatar_url || '';
      },
      error: (err) => {
        this.errorMsg = 'Failed to load profile data.';
      }
    });
  }
  
  closeProfile() {
    this.router.navigate(['/dashboard']);
  }

  saveProfile() {
    this.loading = true;
    this.successMsg = '';
    this.errorMsg = '';

    const payload: any = {
      first_name: this.firstName,
      last_name: this.lastName,
      email: this.email,
      phone_number: this.phone,
      avatar_url: this.avatarUrl
    };

    if (this.password) {
      payload.password = this.password;
    }

    this.api.put<any>('/users/me/profile', payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMsg = 'Profile updated successfully!';
        this.password = '';
        this.auth.updateCurrentUser(res);
        setTimeout(() => this.successMsg = '', 2500);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.detail || 'Failed to update profile.';
      }
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.uploadFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.uploadFile(event.target.files[0]);
    }
  }

  uploadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      this.errorMsg = 'Please select an image file.';
      return;
    }

    this.uploadingAvatar = true;
    this.errorMsg = '';
    this.successMsg = '';

    const formData = new FormData();
    formData.append('file', file);

    this.api.post<any>('/users/me/avatar', formData).subscribe({
      next: (res) => {
        this.uploadingAvatar = false;
        this.avatarUrl = res.avatar_url;
        this.successMsg = 'Profile picture updated!';
        this.auth.updateCurrentUser(res);
        setTimeout(() => this.successMsg = '', 2500);
      },
      error: (err) => {
        this.uploadingAvatar = false;
        this.errorMsg = 'Failed to upload image.';
      }
    });
  }
}
