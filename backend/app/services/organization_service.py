from typing import List
from sqlalchemy.orm import Session
from app.models.organization import Organization, Department
from app.schemas.organization import OrganizationCreate, OrganizationUpdate, DepartmentCreate, DepartmentUpdate
from app.core.exceptions import EntityNotFoundException, ResourceAlreadyExistsException


class OrganizationService:
    @staticmethod
    def get_organizations(db: Session, skip: int = 0, limit: int = 100) -> List[Organization]:
        return db.query(Organization).offset(skip).limit(limit).all()

    @staticmethod
    def get_organization_by_id(db: Session, org_id: str) -> Organization:
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise EntityNotFoundException("Organization", org_id)
        return org

    @staticmethod
    def create_organization(db: Session, data: OrganizationCreate) -> Organization:
        existing = db.query(Organization).filter(Organization.slug == data.slug).first()
        if existing:
            raise ResourceAlreadyExistsException("Organization with this slug already exists.")
            
        org = Organization(
            name=data.name,
            slug=data.slug,
            domain=data.domain,
            is_active=data.is_active
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        return org

    @staticmethod
    def update_organization(db: Session, org_id: str, data: OrganizationUpdate) -> Organization:
        org = OrganizationService.get_organization_by_id(db, org_id)
        if data.name is not None:
            org.name = data.name
        if data.domain is not None:
            org.domain = data.domain
        if data.is_active is not None:
            org.is_active = data.is_active
        db.commit()
        db.refresh(org)
        return org

    @staticmethod
    def delete_organization(db: Session, org_id: str):
        org = OrganizationService.get_organization_by_id(db, org_id)
        db.delete(org)
        db.commit()

    # Department operations
    @staticmethod
    def create_department(db: Session, data: DepartmentCreate) -> Department:
        dept = Department(
            organization_id=data.organization_id,
            name=data.name,
            code=data.code,
            description=data.description
        )
        db.add(dept)
        db.commit()
        db.refresh(dept)
        return dept

    @staticmethod
    def get_departments(db: Session, org_id: str) -> List[Department]:
        return db.query(Department).filter(Department.organization_id == org_id).all()
