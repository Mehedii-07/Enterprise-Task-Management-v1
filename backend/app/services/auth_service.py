import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.models.user import User, Role, RoleType
from app.models.organization import Organization
from app.models.system import RefreshToken, AuthToken, ActivityLog
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, ResetPasswordRequest, ChangePasswordRequest
from app.core.exceptions import AuthenticationException, ResourceAlreadyExistsException, EntityNotFoundException


class AuthService:
    @staticmethod
    def authenticate_user(db: Session, login_data: LoginRequest, ip_address: Optional[str] = None) -> Tuple[User, str, str]:
        user = db.query(User).filter(User.email == login_data.email).first()
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise AuthenticationException(detail="Incorrect email or password.")
            
        if not user.is_active:
            raise AuthenticationException(detail="Account is suspended or inactive.")
            
        # Update last login timestamp
        user.last_login_at = datetime.utcnow()
        
        # Create Tokens
        claims = {"role": user.role.name, "org_id": user.organization_id}
        access_token = create_access_token(subject=user.id, claims=claims)
        refresh_token_str = create_refresh_token(subject=user.id)
        
        # Save refresh token in DB
        db_refresh = RefreshToken(
            user_id=user.id,
            token=refresh_token_str,
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(db_refresh)
        
        # Audit Activity Log
        activity = ActivityLog(
            organization_id=user.organization_id,
            user_id=user.id,
            action="LOGIN",
            entity_type="USER",
            entity_id=user.id,
            details=f"User {user.email} logged in successfully.",
            ip_address=ip_address
        )
        db.add(activity)
        
        db.commit()
        db.refresh(user)
        return user, access_token, refresh_token_str

    @staticmethod
    def register_user(db: Session, reg_data: RegisterRequest) -> User:
        existing_user = db.query(User).filter(User.email == reg_data.email).first()
        if existing_user:
            raise ResourceAlreadyExistsException(detail="Email address is already registered.")
            
        # Fetch target role
        role = db.query(Role).filter(Role.name == reg_data.role_name.upper()).first()
        if not role:
            role = db.query(Role).filter(Role.name == RoleType.EMPLOYEE.value).first()
            
        # Optional organization creation if specified
        org_id = None
        if reg_data.organization_name:
            slug = reg_data.organization_name.lower().replace(" ", "-")
            org = db.query(Organization).filter(Organization.slug == slug).first()
            if not org:
                org = Organization(name=reg_data.organization_name, slug=slug)
                db.add(org)
                db.flush()
            org_id = org.id

        hashed_pwd = get_password_hash(reg_data.password)
        new_user = User(
            email=reg_data.email,
            hashed_password=hashed_pwd,
            first_name=reg_data.first_name,
            last_name=reg_data.last_name,
            role_id=role.id,
            organization_id=org_id,
            is_active=True,
            is_verified=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def refresh_access_token(db: Session, refresh_token_str: str) -> Tuple[str, str]:
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise AuthenticationException(detail="Invalid refresh token.")
            
        db_token = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token_str,
            RefreshToken.is_revoked == False
        ).first()
        
        if not db_token or db_token.expires_at < datetime.utcnow():
            raise AuthenticationException(detail="Refresh token is expired or revoked.")
            
        user = db.query(User).filter(User.id == db_token.user_id).first()
        if not user or not user.is_active:
            raise AuthenticationException(detail="User inactive or missing.")
            
        # Rotate token
        db_token.is_revoked = True
        
        claims = {"role": user.role.name, "org_id": user.organization_id}
        new_access_token = create_access_token(subject=user.id, claims=claims)
        new_refresh_token = create_refresh_token(subject=user.id)
        
        new_db_token = RefreshToken(
            user_id=user.id,
            token=new_refresh_token,
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(new_db_token)
        db.commit()
        return new_access_token, new_refresh_token

    @staticmethod
    def logout(db: Session, refresh_token_str: str, current_user: User):
        db_token = db.query(RefreshToken).filter(RefreshToken.token == refresh_token_str).first()
        if db_token:
            db_token.is_revoked = True
            
        activity = ActivityLog(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="LOGOUT",
            entity_type="USER",
            entity_id=current_user.id,
            details=f"User {current_user.email} logged out."
        )
        db.add(activity)
        db.commit()

    @staticmethod
    def change_password(db: Session, user: User, data: ChangePasswordRequest):
        if not verify_password(data.old_password, user.hashed_password):
            raise AuthenticationException(detail="Incorrect current password.")
            
        user.hashed_password = get_password_hash(data.new_password)
        db.commit()
