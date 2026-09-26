# Import SQLAlchemy's base class for declarative database models.
from sqlalchemy.orm import DeclarativeBase


# Base class inherited by all database models.
# SQLAlchemy uses it to track tables and their metadata.
class Base(DeclarativeBase):
    pass