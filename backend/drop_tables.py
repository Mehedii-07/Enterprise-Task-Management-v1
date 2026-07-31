from app.core.database import engine, Base
from app.models import project, user, task, organization, system
print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Done!")
