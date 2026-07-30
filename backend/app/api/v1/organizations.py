from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import require_ceo, require_admin, get_current_user
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationUpdate, OrganizationResponse, DepartmentCreate, DepartmentResponse
from app.schemas.common import MessageResponse
from app.services.organization_service import OrganizationService

router = APIRouter(prefix="/organizations", tags=["Organizations & Departments"])


@router.get("", response_model=List[OrganizationResponse])
def list_organizations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_ceo)
):
    return OrganizationService.get_organizations(db, skip, limit)


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_ceo)
):
    return OrganizationService.create_organization(db, data)


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return OrganizationService.get_organization_by_id(db, org_id)


@router.put("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: str,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_ceo)
):
    return OrganizationService.update_organization(db, org_id, data)


@router.delete("/{org_id}", response_model=MessageResponse)
def delete_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_ceo)
):
    OrganizationService.delete_organization(db, org_id)
    return MessageResponse(message="Organization removed.")


# Departments
@router.post("/{org_id}/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    org_id: str,
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    data.organization_id = org_id
    return OrganizationService.create_department(db, data)


@router.get("/{org_id}/departments", response_model=List[DepartmentResponse])
def list_departments(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return OrganizationService.get_departments(db, org_id)
