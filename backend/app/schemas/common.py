from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

    model_config = ConfigDict(from_attributes=True)


class GlobalSearchItem(BaseModel):
    id: str
    type: str  # USER, PROJECT, TASK, ORGANIZATION, COMMENT
    title: str
    subtitle: Optional[str] = None
    link: Optional[str] = None
