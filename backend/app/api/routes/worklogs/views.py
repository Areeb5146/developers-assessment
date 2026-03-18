import uuid
from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import SessionDep
from app.api.routes.worklogs.schemas import (
    TimeEntryResponse,
    WorkLogDetailResponse,
    WorkLogListItem,
    WorkLogListResponse,
)
from app.models import Freelancer, Task, TimeEntry, WorkLog

router = APIRouter(prefix="/worklogs", tags=["worklogs"])


@router.get("/", response_model=WorkLogListResponse)
def list_worklogs(
    session: SessionDep,
    start_date: date | None = None,
    end_date: date | None = None,
    skip: int = 0,
    limit: int = 20,
) -> Any:
    """
    List all worklogs with computed totals.
    Optionally filter by created_at date range.
    """
    statement = select(WorkLog)

    if start_date is not None:
        start_dt = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0)
        statement = statement.where(WorkLog.created_at >= start_dt)

    if end_date is not None:
        end_dt = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59)
        statement = statement.where(WorkLog.created_at <= end_dt)

    all_worklogs = session.exec(statement).all()
    count = len(all_worklogs)

    paginated = all_worklogs[skip : skip + limit]

    freelancer_ids = list({wl.freelancer_id for wl in paginated})
    task_ids = list({wl.task_id for wl in paginated})
    worklog_ids = [wl.id for wl in paginated]

    freelancers = session.exec(
        select(Freelancer).where(Freelancer.id.in_(freelancer_ids))
    ).all()
    freelancer_map = {f.id: f.full_name for f in freelancers}

    tasks = session.exec(select(Task).where(Task.id.in_(task_ids))).all()
    task_map = {t.id: t.title for t in tasks}

    time_entries = session.exec(
        select(TimeEntry).where(TimeEntry.worklog_id.in_(worklog_ids))
    ).all()

    totals_map: dict[uuid.UUID, dict] = {}
    for te in time_entries:
        if te.worklog_id not in totals_map:
            totals_map[te.worklog_id] = {"hours": 0.0, "amount": 0.0}
        totals_map[te.worklog_id]["hours"] += te.hours
        totals_map[te.worklog_id]["amount"] += te.hours * te.hourly_rate

    data = []
    for wl in paginated:
        totals = totals_map.get(wl.id, {"hours": 0.0, "amount": 0.0})
        data.append(
            WorkLogListItem(
                id=wl.id,
                freelancer_name=freelancer_map.get(wl.freelancer_id, "Unknown"),
                task_title=task_map.get(wl.task_id, "Unknown"),
                total_hours=round(totals["hours"], 2),
                total_amount=round(totals["amount"], 2),
                status=wl.status,
                created_at=wl.created_at,
            )
        )

    return WorkLogListResponse(data=data, count=count)


@router.get("/{worklog_id}", response_model=WorkLogDetailResponse)
def get_worklog(session: SessionDep, worklog_id: uuid.UUID) -> Any:
    """
    Get worklog detail with all time entries.
    """
    worklog = session.get(WorkLog, worklog_id)
    if not worklog:
        raise HTTPException(status_code=404, detail="Worklog not found")

    freelancer = session.get(Freelancer, worklog.freelancer_id)
    task = session.get(Task, worklog.task_id)

    entries = session.exec(
        select(TimeEntry).where(TimeEntry.worklog_id == worklog_id)
    ).all()

    total_hours = 0.0
    total_amount = 0.0
    entry_responses = []
    for te in entries:
        subtotal = te.hours * te.hourly_rate
        total_hours += te.hours
        total_amount += subtotal
        entry_responses.append(
            TimeEntryResponse(
                id=te.id,
                date=te.date,
                hours=te.hours,
                description=te.description,
                hourly_rate=te.hourly_rate,
                subtotal=round(subtotal, 2),
            )
        )

    return WorkLogDetailResponse(
        id=worklog.id,
        freelancer_name=freelancer.full_name if freelancer else "Unknown",
        task_title=task.title if task else "Unknown",
        total_hours=round(total_hours, 2),
        total_amount=round(total_amount, 2),
        status=worklog.status,
        created_at=worklog.created_at,
        time_entries=entry_responses,
    )
