from typing import List, Optional
from fastapi import APIRouter, Depends, status, File, UploadFile
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import require_admin, get_current_user, require_ceo
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserProfileUpdate
from app.schemas.common import MessageResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("", response_model=List[UserResponse])
def list_users(
    organization_id: Optional[str] = None,
    department_id: Optional[str] = None,
    role_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if current_user.role.name.upper() != "CEO":
        organization_id = current_user.organization_id
    return UserService.get_users(db, organization_id, department_id, role_name, skip, limit)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return UserService.create_user(db, data, current_user)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return UserService.get_user_by_id(db, user_id)


@router.put("/me/profile", response_model=UserResponse)
def update_my_profile(
    data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return UserService.update_my_profile(db, current_user, data)


@router.post("/me/avatar", response_model=UserResponse)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import shutil
    import os
    
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"{current_user.id}.{file_ext}"
    filepath = os.path.join("app", "static", "avatars", filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Assuming frontend is on port 4200 and backend is on port 8000
    # In a real app we'd get the host from a config
    current_user.avatar_url = f"http://localhost:8000/static/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return UserService.update_user(db, user_id, data, current_user)


@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    UserService.delete_user(db, user_id, current_user)
    return MessageResponse(message="User account deleted successfully.")
