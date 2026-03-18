import logging
import random
import uuid
from datetime import date, datetime, timedelta

from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.models import (
    Freelancer,
    Task,
    TimeEntry,
    User,
    UserCreate,
    WorkLog,
)

logger = logging.getLogger(__name__)

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


# make sure all SQLModel models are imported (app.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28


def init_db(session: Session) -> None:
    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
        )
        user = crud.create_user(session=session, user_create=user_in)

    try:
        existing = session.exec(select(Freelancer)).first()
        if existing:
            return
        seed_worklog_domain(session)
    except Exception:
        logger.warning("Freelancer table not yet available, skipping seed")


def seed_worklog_domain(session: Session) -> None:
    """Seed freelancers, tasks, worklogs, and time entries."""
    random.seed(42)

    freelancers_data = [
        {
            "full_name": "Alice Johnson",
            "email": "alice@freelance.io",
            "hourly_rate": 75.0,
        },
        {"full_name": "Bob Martinez", "email": "bob@freelance.io", "hourly_rate": 95.0},
        {"full_name": "Carol Wei", "email": "carol@freelance.io", "hourly_rate": 110.0},
        {
            "full_name": "David Okafor",
            "email": "david@freelance.io",
            "hourly_rate": 85.0,
        },
    ]

    freelancers = []
    for fd in freelancers_data:
        f = Freelancer(id=uuid.uuid4(), **fd)
        session.add(f)
        freelancers.append(f)
    session.commit()

    tasks_data = [
        {
            "title": "Landing Page Redesign",
            "description": "Redesign the main marketing landing page with new brand guidelines",
        },
        {
            "title": "API Integration",
            "description": "Integrate third-party payment gateway API into the backend",
        },
        {
            "title": "Mobile App Bug Fixes",
            "description": "Fix critical bugs reported in the iOS and Android apps",
        },
        {
            "title": "Database Migration",
            "description": "Migrate legacy MySQL database to PostgreSQL with zero downtime",
        },
        {
            "title": "User Analytics Dashboard",
            "description": "Build real-time analytics dashboard for user engagement metrics",
        },
        {
            "title": "Security Audit",
            "description": "Conduct comprehensive security audit and patch identified vulnerabilities",
        },
    ]

    tasks = []
    for td in tasks_data:
        t = Task(id=uuid.uuid4(), **td)
        session.add(t)
        tasks.append(t)
    session.commit()

    today = date(2026, 3, 18)

    worklog_assignments = [
        (freelancers[0], tasks[0]),
        (freelancers[0], tasks[4]),
        (freelancers[0], tasks[2]),
        (freelancers[1], tasks[1]),
        (freelancers[1], tasks[3]),
        (freelancers[2], tasks[4]),
        (freelancers[2], tasks[5]),
        (freelancers[2], tasks[0]),
        (freelancers[3], tasks[2]),
        (freelancers[3], tasks[1]),
    ]

    time_entry_descs = [
        "Initial setup and configuration",
        "Implementation of core feature",
        "Code review and refactoring",
        "Bug investigation and fix",
        "Writing unit tests",
        "Documentation update",
        "Client feedback integration",
        "Performance optimization",
        "UI polish and responsive fixes",
        "Deployment and smoke testing",
    ]

    for fl, tsk in worklog_assignments:
        wl = WorkLog(
            id=uuid.uuid4(),
            freelancer_id=fl.id,
            task_id=tsk.id,
            status="pending",
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 55)),
        )
        session.add(wl)
        session.commit()

        num_entries = random.randint(3, 5)
        start_offset = random.randint(10, 55)
        for i in range(num_entries):
            entry_date = today - timedelta(days=start_offset - i * random.randint(1, 5))
            hrs = round(random.uniform(1.0, 8.0), 1)
            te = TimeEntry(
                id=uuid.uuid4(),
                worklog_id=wl.id,
                date=entry_date,
                hours=hrs,
                description=random.choice(time_entry_descs),
                hourly_rate=fl.hourly_rate,
            )
            session.add(te)
        session.commit()
