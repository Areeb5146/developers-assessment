import uuid
from datetime import date, datetime

from sqlmodel import SQLModel


class TimeEntryResponse(SQLModel):
    id: uuid.UUID
    date: date
    hours: float
    description: str
    hourly_rate: float
    subtotal: float


class WorkLogListItem(SQLModel):
    id: uuid.UUID
    freelancer_name: str
    task_title: str
    total_hours: float
    total_amount: float
    status: str
    created_at: datetime


class WorkLogListResponse(SQLModel):
    data: list[WorkLogListItem]
    count: int


class WorkLogDetailResponse(SQLModel):
    id: uuid.UUID
    freelancer_name: str
    task_title: str
    total_hours: float
    total_amount: float
    status: str
    created_at: datetime
    time_entries: list[TimeEntryResponse]
