from celery import Celery

from backend.app.core.config import settings

celery_app = Celery(
    "park",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.jobs.bulk_import"],
)
celery_app.conf.update(
    accept_content=["json"],
    task_serializer="json",
    result_serializer="json",
    result_expires=86400,
    task_ignore_result=True,
)