from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.organization import Organization, Department
from app.models.user import User, Role, RoleType
from app.models.project import Project, ProjectStatus, ProjectPriority
from app.models.task import Task, TaskStatus, TaskPriority


def init_db(db: Session) -> None:
    # 1. Seed Roles
    roles = [
        (RoleType.CEO.value, "CEO Super Admin with global system control"),
        (RoleType.ADMIN.value, "Organization Admin with company-wide access"),
        (RoleType.TEAM_LEAD.value, "Team Lead managing projects and assignees"),
        (RoleType.EMPLOYEE.value, "Individual contributor employee")
    ]
    
    role_objs = {}
    for role_name, desc in roles:
        r = db.query(Role).filter(Role.name == role_name).first()
        if not r:
            r = Role(name=role_name, description=desc)
            db.add(r)
            db.flush()
        role_objs[role_name] = r

    # 2. Seed Default Organization & Department
    org = db.query(Organization).filter(Organization.slug == "enterprise-corp").first()
    if not org:
        org = Organization(
            name="Enterprise Global Corp",
            slug="enterprise-corp",
            domain="enterprise.com",
            is_active=True
        )
        db.add(org)
        db.flush()

    dept = db.query(Department).filter(Department.organization_id == org.id, Department.code == "ENG").first()
    if not dept:
        dept = Department(
            organization_id=org.id,
            name="Engineering & Technology",
            code="ENG",
            description="Core product software engineering division"
        )
        db.add(dept)
        db.flush()

    # 3. Seed Default CEO Super Admin
    ceo = db.query(User).filter(User.email == settings.SUPER_ADMIN_EMAIL).first()
    if not ceo:
        ceo = User(
            email=settings.SUPER_ADMIN_EMAIL,
            hashed_password=get_password_hash(settings.SUPER_ADMIN_PASSWORD),
            first_name=settings.SUPER_ADMIN_FIRST_NAME,
            last_name=settings.SUPER_ADMIN_LAST_NAME,
            role_id=role_objs[RoleType.CEO.value].id,
            organization_id=org.id,
            department_id=dept.id,
            job_title="Chief Executive Officer",
            is_active=True,
            is_verified=True
        )
        db.add(ceo)
        db.flush()
    else:
        ceo.hashed_password = get_password_hash(settings.SUPER_ADMIN_PASSWORD)
        db.flush()

    # 4. Seed Admin, Team Lead, and Employee accounts for quick testing
    demo_users = [
        ("admin@enterprise.com", "Admin123!", "Alice", "Admin", RoleType.ADMIN.value, "Org Admin"),
        ("lead@enterprise.com", "Lead123!", "Bob", "Leader", RoleType.TEAM_LEAD.value, "Tech Lead"),
        ("emp@enterprise.com", "Emp123!", "Charlie", "Worker", RoleType.EMPLOYEE.value, "Software Engineer"),
    ]

    created_users = {"CEO": ceo}
    for email, pwd, fname, lname, rtype, jtitle in demo_users:
        u = db.query(User).filter(User.email == email).first()
        if not u:
            u = User(
                email=email,
                hashed_password=get_password_hash(pwd),
                first_name=fname,
                last_name=lname,
                role_id=role_objs[rtype].id,
                organization_id=org.id,
                department_id=dept.id,
                job_title=jtitle,
                is_active=True,
                is_verified=True
            )
            db.add(u)
            db.flush()
        else:
            u.hashed_password = get_password_hash(pwd)
            db.flush()
        created_users[rtype] = u

    # 5. Seed Sample Project & Task
    proj = db.query(Project).filter(Project.code == "PRJ-001").first()
    if not proj:
        proj = Project(
            organization_id=org.id,
            department_id=dept.id,
            manager_id=created_users[RoleType.TEAM_LEAD.value].id,
            name="SaaS Cloud Migration & Modernization",
            code="PRJ-001",
            description="Migrate legacy infrastructure to modern microservices architecture",
            budget=150000.0,
            status=ProjectStatus.ACTIVE,
            priority=ProjectPriority.HIGH
        )
        db.add(proj)
        db.flush()

        task = Task(
            project_id=proj.id,
            assignee_id=created_users[RoleType.EMPLOYEE.value].id,
            reporter_id=created_users[RoleType.TEAM_LEAD.value].id,
            title="Implement OAuth2 & JWT Security Module",
            description="Build robust authentication token flow with access and refresh tokens.",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.CRITICAL,
            estimated_hours=16.0,
            actual_hours=4.0
        )
        db.add(task)

    db.commit()
