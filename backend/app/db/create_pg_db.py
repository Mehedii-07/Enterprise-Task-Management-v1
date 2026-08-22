import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.db.init_db import init_db


def create_postgres_database():
    """Connect to PostgreSQL server and ensure enterprise_task_db exists."""
    db_name = "enterprise_task_db"
    user = "postgres"
    password = "mehedi"
    host = "localhost"
    port = "5432"

    print(f"Connecting to PostgreSQL server at {host}:{port} as user '{user}'...")
    try:
        # Connect to default postgres DB
        conn = psycopg2.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host,
            port=port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s;", (db_name,))
        exists = cursor.fetchone()

        if not exists:
            print(f"Creating PostgreSQL database '{db_name}'...")
            cursor.execute(f'CREATE DATABASE "{db_name}";')
            print(f"Database '{db_name}' created successfully!")
        else:
            print(f"Database '{db_name}' already exists.")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"PostgreSQL connection note: {e}")


def migrate_tables_and_seed():
    """Create all 19 PostgreSQL tables and seed initial data."""
    print("Creating all SQLAlchemy tables in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

    print("Seeding default roles, CEO, Admin, Team Lead, Employee, Org, Department, Projects & Tasks...")
    db = SessionLocal()
    try:
        init_db(db)
        print("Data seeding completed successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    create_postgres_database()
    migrate_tables_and_seed()
