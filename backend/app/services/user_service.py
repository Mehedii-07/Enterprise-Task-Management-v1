from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.user import User, Role, RoleType
from app.models.organization import Organization, Department
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from app.core.exceptions import EntityNotFoundException, ResourceAlreadyExistsException, PermissionDeniedException


class UserService:
    @staticmethod
    def get_users(
        db: Session,
        organization_id: Optional[str] = None,
        department_id: Optional[str] = None,
        role_name: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        query = db.query(User)
        if organization_id:
            query = query.filter(User.organization_id == organization_id)
        if department_id:
            query = query.filter(User.department_id == department_id)
        if role_name:
            query = query.join(Role).filter(Role.name == role_name.upper())
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise EntityNotFoundException("User", user_id)
        return user

    @staticmethod
    def create_user(db: Session, user_data: UserCreate, creator_user: User) -> User:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise ResourceAlreadyExistsException("Email already registered.")
            
        role = db.query(Role).filter(Role.id == user_data.role_id).first()
        if not role:
            role = db.query(Role).filter(Role.name == user_data.role_id.upper()).first()
        if not role:
            raise EntityNotFoundException("Role", user_data.role_id)
            
        # Role hierarchy check:
        # Admin can only create TEAM_LEAD and EMPLOYEE in their organization
        creator_role = creator_user.role.name.upper()
        target_role = role.name.upper()
        
        if creator_role == RoleType.ADMIN.value:
            if target_role in [RoleType.CEO.value, RoleType.ADMIN.value]:
                raise PermissionDeniedException("Admins cannot create CEO or Admin roles.")
            
        if not user_data.organization_id:
            user_data.organization_id = creator_user.organization_id

        new_user = User(
            email=user_data.email,
            hashed_password=get_password_hash(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone_number=user_data.phone_number,
            job_title=user_data.job_title,
            organization_id=user_data.organization_id,
            department_id=user_data.department_id,
            role_id=role.id,
            is_active=user_data.is_active,
            is_verified=user_data.is_verified
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def update_user(db: Session, user_id: str, user_data: UserUpdate, updater_user: User) -> User:
        user = UserService.get_user_by_id(db, user_id)
        updater_role = updater_user.role.name.upper()
        
        if updater_role == RoleType.ADMIN.value and user.organization_id != updater_user.organization_id:
            raise PermissionDeniedException("Cannot update users outside your organization.")
            
        if user_data.first_name is not None:
            user.first_name = user_data.first_name
        if user_data.last_name is not None:
            user.last_name = user_data.last_name
        if user_data.phone_number is not None:
            user.phone_number = user_data.phone_number
        if user_data.job_title is not None:
            user.job_title = user_data.job_title
        if user_data.avatar_url is not None:
            user.avatar_url = user_data.avatar_url
        if user_data.department_id is not None:
            user.department_id = user_data.department_id
        if user_data.is_active is not None:
            user.is_active = user_data.is_active
        if user_data.role_id is not None:
            role = db.query(Role).filter(Role.id == user_data.role_id).first()
            if role:
                user.role_id = role.id

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id: str, operator: User):
        user = UserService.get_user_by_id(db, user_id)
        if user.id == operator.id:
            raise PermissionDeniedException("Cannot delete your own account.")
        db.delete(user)
        db.commit()
