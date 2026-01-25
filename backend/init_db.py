import sys
import os

# Ensure the app module is found if running from backend/ directly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import SQLModel

# Import all models to register them with metadata
from app.models.patient import Patient
from app.models.task import Task, VertebraResult, DiscResult, GlobalMetric
from app.db.session import engine
from app.core.storage import init_storage


def init_db():
    print("Initializing database and storage...")

    # Initialize MinIO
    try:
        init_storage()
        print("✅ MinIO bucket ensured.")
    except Exception as e:
        print(f"❌ MinIO initialization failed: {e}")
        sys.exit(1)

    # Initialize Postgres
    try:
        print("🔄 Dropping existing tables...")
        SQLModel.metadata.drop_all(engine)
        
        print("🔨 Creating new tables...")
        SQLModel.metadata.create_all(engine)
        print("✅ Database tables created successfully.")
        
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        sys.exit(1)

    print("🚀 Spinodyne system initialized successfully.")


if __name__ == "__main__":
    init_db()
