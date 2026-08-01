from app.core.database import SessionLocal
from app.models.user import Role

def update_role():
    db = SessionLocal()
    role = db.query(Role).filter(Role.name == 'TEAM_LEAD').first()
    if role:
        role.name = 'PROJECT_LEAD'
        db.commit()
        print("Updated role name to PROJECT_LEAD")
    else:
        print("TEAM_LEAD role not found, might be updated already.")
    db.close()

if __name__ == "__main__":
    update_role()
