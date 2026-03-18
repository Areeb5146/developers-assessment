import uuid
from datetime import datetime

from pydantic import field_validator
from sqlmodel import SQLModel


class PaymentCreateRequest(SQLModel):
    worklog_ids: list[uuid.UUID]
    excluded_freelancer_ids: list[uuid.UUID] = []

    @field_validator("worklog_ids")
    @classmethod
    def validate_worklog_ids(cls, value: list[uuid.UUID]) -> list[uuid.UUID]:
        if value is None:
            raise ValueError("worklog_ids is required")

        if not isinstance(value, list):
            raise ValueError("worklog_ids must be a list")

        if len(value) == 0:
            raise ValueError("worklog_ids cannot be empty")

        return value


class PaymentWorkLogItem(SQLModel):
    worklog_id: uuid.UUID
    freelancer_name: str
    task_title: str
    total_hours: float
    amount: float


class FreelancerPaymentGroup(SQLModel):
    freelancer_name: str
    freelancer_id: uuid.UUID
    worklogs: list[PaymentWorkLogItem]
    subtotal: float


class PaymentCreateResponse(SQLModel):
    id: uuid.UUID
    status: str
    total_amount: float
    worklog_count: int
    created_at: datetime


class PaymentDetailResponse(SQLModel):
    id: uuid.UUID
    status: str
    total_amount: float
    created_at: datetime
    freelancer_groups: list[FreelancerPaymentGroup]


class PaymentConfirmResponse(SQLModel):
    id: uuid.UUID
    status: str
    total_amount: float
    created_at: datetime
