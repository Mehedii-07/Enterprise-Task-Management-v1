from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, Role, RoleType
from app.core.exceptions import AuthenticationException, PermissionDeniedException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """Validate bearer token and return active user object."""
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise AuthenticationException(detail="Could not validate credentials or invalid token type.")
    
    user_id: str = payload.get("sub")
    if not user_id:
        raise AuthenticationException(detail="Invalid token payload.")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AuthenticationException(detail="User no longer exists.")
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account."
        )
        
    return user


class RoleChecker:
    """Dependency for RBAC enforcement."""
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_role_name = current_user.role.name.upper()
        
        # CEO has unrestricted access across all endpoints
        if user_role_name == RoleType.CEO.value:
            return current_user
            
        if user_role_name not in [r.upper() for r in self.allowed_roles]:
            raise PermissionDeniedException(
                detail=f"User role '{user_role_name}' is not authorized to access this resource."
            )
            
        return current_user


# Role-specific dependency shortcuts
require_ceo = RoleChecker([RoleType.CEO.value])
require_admin = RoleChecker([RoleType.CEO.value, RoleType.ADMIN.value])
require_team_lead = RoleChecker([RoleType.CEO.value, RoleType.ADMIN.value, RoleType.TEAM_LEAD.value])
require_authenticated = RoleChecker([RoleType.CEO.value, RoleType.ADMIN.value, RoleType.TEAM_LEAD.value, RoleType.EMPLOYEE.value])
