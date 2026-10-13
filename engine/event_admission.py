"""Cancellation semantics shared by article intake and the offline publish gate.

Mirrors next/src/lib/event-occurrence.mjs:isCancelledRecord. Keep withdrawn
records for history, but never offer them as things readers can attend.
"""
import re


def is_cancelled_record(record: dict) -> bool:
    return (
        record.get("cancelled") is True
        or record.get("skipThis") is True
        or bool(re.search(r"cancell(ed|ation|ing)", str(record.get("verificationStatus") or ""), re.I))
        or bool(re.match(r"cancelled:", str(record.get("summary") or ""), re.I))
    )
