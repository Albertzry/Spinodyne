import sys
import os

# Add the backend directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import SQLModel
from app.db.session import engine
from app.core.storage import init_storage

# Import models to register them with SQLModel.metadata
from app.models.patient import Patient
from app.models.task import Task # This also imports VertebraResult, DiscResult, GlobalMetric

def init_db():
    print("Dropping existing tables...")
    SQLModel.metadata.drop_all(engine)
    
    print("Creating tables...")
    SQLModel.metadata.create_all(engine)
    
    print("Initializing MinIO storage...")
    init_storage()
    
    print("Environment initialization complete. System is ready.")

if __name__ == "__main__":
    init_db()
