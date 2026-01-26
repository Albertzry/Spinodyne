from sqlmodel import Session, create_engine
from ..core.config import settings

engine = create_engine(settings.POSTGRES_URL, echo=False)

def get_session():
    with Session(engine) as session:
        yield session
