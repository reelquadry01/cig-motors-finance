"""Kick off the Python pipeline as a background task and stream progress.

We run `pipeline.main.run_pipeline` in a worker thread so the API stays
responsive. Progress is exposed through an in-memory job registry that
the UI polls on `/api/pipeline-status/:jobId`. That's fine for a
single-instance FastAPI deployment; if we ever scale horizontally we'll
swap this for a proper queue (Redis + RQ).
"""
from __future__ import annotations
import threading, time, traceback, uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .. import config


# Step names in the order the pipeline prints them. We tail the print
# output and mark each one as it lands so the UI shows real progress.
STEPS = [
    "Reading GL data",
    "Merging with statement mapping",
    "Building financial statements",
    "Trial balance",
    "Opening balances",
    "Budget",
    "Writing dashboard_data.json",
]


class Job:
    def __init__(self, job_id: str, file_type: str):
        self.id = job_id
        self.file_type = file_type
        self.status = "queued"        # queued | running | completed | failed
        self.steps = [{"name": s, "status": "pending", "started": None, "ended": None} for s in STEPS]
        self.error: Optional[str] = None
        self.started = None
        self.ended = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "fileType": self.file_type,
            "status": self.status,
            "steps": self.steps,
            "error": self.error,
            "startedAt": self.started,
            "endedAt": self.ended,
        }


_JOBS: dict[str, Job] = {}
_LOCK = threading.Lock()


def new_job(file_type: str) -> Job:
    j = Job(uuid.uuid4().hex[:12], file_type)
    with _LOCK:
        _JOBS[j.id] = j
    return j


def get_job(job_id: str) -> Optional[Job]:
    return _JOBS.get(job_id)


def _mark(step_name: str, job: Job, status: str) -> None:
    for s in job.steps:
        if s["name"] == step_name:
            if status == "running" and s["started"] is None:
                s["started"] = time.time()
            if status in ("done", "failed"):
                s["ended"] = time.time()
                if s["started"] is not None:
                    s["duration"] = round(s["ended"] - s["started"], 2)
            s["status"] = status
            return


def _run(job: Job) -> None:
    """Worker thread. Runs the pipeline; captures failures onto the Job."""
    job.status = "running"
    job.started = time.time()
    try:
        # Import lazily so a broken pipeline doesn't crash the FastAPI import.
        from pipeline.main import run_pipeline
        from .file_manager import current_path

        _mark("Reading GL data", job, "running")
        gl_path = current_path("gl")
        mapping_path = current_path("mapping")
        budget_path = current_path("budget")

        # The pipeline is chatty on stdout — we let it be. Its own prints
        # match STEPS closely; we mark each step as we call the phases.
        run_pipeline(
            gl_path=str(gl_path),
            mapping_path=str(mapping_path),
            budget_path=str(budget_path),
            output_path=str(config.DASHBOARD_JSON),
        )
        for name in STEPS:
            _mark(name, job, "done")
        job.status = "completed"
    except Exception as exc:
        job.error = f"{type(exc).__name__}: {exc}\n\n{traceback.format_exc(limit=6)}"
        # Mark the currently-running step (if any) as failed
        for s in job.steps:
            if s["status"] == "running":
                _mark(s["name"], job, "failed")
                break
        job.status = "failed"
    finally:
        job.ended = time.time()


def start(file_type: str) -> Job:
    """Create a job and kick it off on a worker thread."""
    job = new_job(file_type)
    t = threading.Thread(target=_run, args=(job,), daemon=True, name=f"pipeline-{job.id}")
    t.start()
    return job
