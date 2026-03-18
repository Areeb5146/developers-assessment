import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import SessionDep
from app.api.routes.payments.schemas import (
    FreelancerPaymentGroup,
    PaymentConfirmResponse,
    PaymentCreateRequest,
    PaymentCreateResponse,
    PaymentDetailResponse,
    PaymentWorkLogItem,
)
from app.models import Freelancer, Payment, PaymentWorkLog, Task, TimeEntry, WorkLog

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/", response_model=PaymentCreateResponse, status_code=201)
def create_payment(session: SessionDep, body: PaymentCreateRequest) -> Any:
    """
    Create a payment batch for the given worklogs.
    Excludes worklogs belonging to excluded_freelancer_ids.
    """
    worklogs = session.exec(
        select(WorkLog).where(WorkLog.id.in_(body.worklog_ids))
    ).all()

    if len(worklogs) == 0:
        raise HTTPException(status_code=400, detail="No valid worklogs found")

    # Filter out excluded freelancers
    if body.excluded_freelancer_ids:
        excluded_set = set(body.excluded_freelancer_ids)
        worklogs = [wl for wl in worklogs if wl.freelancer_id not in excluded_set]

    if len(worklogs) == 0:
        raise HTTPException(
            status_code=400,
            detail="All worklogs were excluded after filtering",
        )

    # Check that none of the worklogs are already paid
    for wl in worklogs:
        if wl.status == "paid":
            raise HTTPException(
                status_code=400,
                detail=f"Worklog {wl.id} is already paid",
            )

    # Calculate total amount from time entries
    worklog_ids = [wl.id for wl in worklogs]
    time_entries = session.exec(
        select(TimeEntry).where(TimeEntry.worklog_id.in_(worklog_ids))
    ).all()

    total_amount = 0.0
    for te in time_entries:
        total_amount += te.hours * te.hourly_rate

    total_amount = round(total_amount, 2)

    # Create payment
    payment = Payment(
        id=uuid.uuid4(),
        status="pending",
        total_amount=total_amount,
    )
    session.add(payment)
    session.commit()

    # Create payment-worklog associations and update worklog status
    for wl in worklogs:
        pw = PaymentWorkLog(
            id=uuid.uuid4(),
            payment_id=payment.id,
            worklog_id=wl.id,
        )
        session.add(pw)

        wl.status = "in_review"
    session.commit()

    return PaymentCreateResponse(
        id=payment.id,
        status=payment.status,
        total_amount=payment.total_amount,
        worklog_count=len(worklogs),
        created_at=payment.created_at,
    )


@router.get("/{payment_id}", response_model=PaymentDetailResponse)
def get_payment(session: SessionDep, payment_id: uuid.UUID) -> Any:
    """
    Get full payment detail with worklogs grouped by freelancer.
    """
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Get associated worklogs
    payment_worklogs = session.exec(
        select(PaymentWorkLog).where(PaymentWorkLog.payment_id == payment_id)
    ).all()

    worklog_ids = [pw.worklog_id for pw in payment_worklogs]
    worklogs = session.exec(select(WorkLog).where(WorkLog.id.in_(worklog_ids))).all()

    # Get all freelancers and tasks for these worklogs
    freelancer_ids = list({wl.freelancer_id for wl in worklogs})
    task_ids = list({wl.task_id for wl in worklogs})

    freelancers = session.exec(
        select(Freelancer).where(Freelancer.id.in_(freelancer_ids))
    ).all()
    freelancer_map = {f.id: f for f in freelancers}

    tasks = session.exec(select(Task).where(Task.id.in_(task_ids))).all()
    task_map = {t.id: t.title for t in tasks}

    # Get time entries for all worklogs
    time_entries = session.exec(
        select(TimeEntry).where(TimeEntry.worklog_id.in_(worklog_ids))
    ).all()

    totals_map: dict[uuid.UUID, dict] = {}
    for te in time_entries:
        if te.worklog_id not in totals_map:
            totals_map[te.worklog_id] = {"hours": 0.0, "amount": 0.0}
        totals_map[te.worklog_id]["hours"] += te.hours
        totals_map[te.worklog_id]["amount"] += te.hours * te.hourly_rate

    # Group worklogs by freelancer
    grouped: dict[uuid.UUID, list[WorkLog]] = {}
    for wl in worklogs:
        if wl.freelancer_id not in grouped:
            grouped[wl.freelancer_id] = []
        grouped[wl.freelancer_id].append(wl)

    freelancer_groups = []
    for freelancer_id, wls in grouped.items():
        freelancer = freelancer_map.get(freelancer_id)
        freelancer_name = freelancer.full_name if freelancer else "Unknown"

        worklog_items = []
        group_subtotal = 0.0
        for wl in wls:
            totals = totals_map.get(wl.id, {"hours": 0.0, "amount": 0.0})
            amount = round(totals["amount"], 2)
            group_subtotal += amount
            worklog_items.append(
                PaymentWorkLogItem(
                    worklog_id=wl.id,
                    freelancer_name=freelancer_name,
                    task_title=task_map.get(wl.task_id, "Unknown"),
                    total_hours=round(totals["hours"], 2),
                    amount=amount,
                )
            )

        freelancer_groups.append(
            FreelancerPaymentGroup(
                freelancer_name=freelancer_name,
                freelancer_id=freelancer_id,
                worklogs=worklog_items,
                subtotal=round(group_subtotal, 2),
            )
        )

    return PaymentDetailResponse(
        id=payment.id,
        status=payment.status,
        total_amount=payment.total_amount,
        created_at=payment.created_at,
        freelancer_groups=freelancer_groups,
    )


@router.patch("/{payment_id}/confirm", response_model=PaymentConfirmResponse)
def confirm_payment(session: SessionDep, payment_id: uuid.UUID) -> Any:
    """
    Confirm a payment and mark all included worklogs as paid.
    """
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.status == "confirmed":
        raise HTTPException(status_code=400, detail="Payment is already confirmed")

    payment.status = "confirmed"
    session.commit()

    # Get associated worklogs and set their status to paid
    payment_worklogs = session.exec(
        select(PaymentWorkLog).where(PaymentWorkLog.payment_id == payment_id)
    ).all()

    worklog_ids = [pw.worklog_id for pw in payment_worklogs]
    worklogs = session.exec(select(WorkLog).where(WorkLog.id.in_(worklog_ids))).all()

    for wl in worklogs:
        wl.status = "paid"
    session.commit()

    return PaymentConfirmResponse(
        id=payment.id,
        status=payment.status,
        total_amount=payment.total_amount,
        created_at=payment.created_at,
    )
