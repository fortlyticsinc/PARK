"""
PARK — Tabular File Parser
================================
Turns an uploaded CSV or XLSX file into a list of plain dicts, so the
rest of the app (user bulk-import, pairing bulk-import) doesn't care
which format the coordinator/admin uploaded. One code path, two inputs.
"""

import csv
import io
import re
from app.core.error_handler import ValidationAppError

# Coordinators/admins on low-end machines often have Excel, not a CSV
# editor — supporting .xlsx removes a real friction point.
ALLOWED_EXTENSIONS = (".csv", ".xlsx")


def _normalize_header(value: object) -> str:
    text = str(value or "").strip().lstrip("\ufeff").lower()
    return re.sub(r"[^a-z0-9]+", "_", text).strip("_")


def _normalize_value(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def parse_tabular_file(filename: str, file_bytes: bytes) -> list[dict]:
    """
    Reads a .csv or .xlsx file and returns a list of row-dicts, each
    keyed by the header row. Every value is coerced to a stripped
    string (or None if the cell was empty) so downstream code doesn't
    need to know whether the value came from CSV text or an Excel cell.
    """
    lower_name = filename.lower()

    if lower_name.endswith(".csv"):
        return _parse_csv(file_bytes)

    if lower_name.endswith(".xlsx"):
        return _parse_xlsx(file_bytes)

    raise ValidationAppError(
        f"File must be a .csv or .xlsx (got '{filename}')", field="file"
    )


def _parse_csv(file_bytes: bytes) -> list[dict]:
    try:
        # utf-8-sig quietly strips a BOM if Excel added one on save —
        # a common source of "why is my first column header broken".
        text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise ValidationAppError("CSV file must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise ValidationAppError("CSV file has no header row")

    rows = []
    for row in reader:
        rows.append({_normalize_header(k): _normalize_value(v) for k, v in row.items() if k})
    return rows


def _parse_xlsx(file_bytes: bytes) -> list[dict]:
    try:
        # Imported lazily so the app doesn't hard-crash on startup if
        # openpyxl isn't installed yet — only bulk-import needs it.
        from openpyxl import load_workbook
    except ImportError:
        raise ValidationAppError(
            "Server is missing the 'openpyxl' package needed to read .xlsx files"
        )

    try:
        workbook = load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    except Exception:
        raise ValidationAppError("Could not read this .xlsx file — it may be corrupted")

    sheet = workbook.active
    rows_iter = sheet.iter_rows(values_only=True)

    try:
        header = next(rows_iter)
    except StopIteration:
        raise ValidationAppError("XLSX file has no header row")

    # Header cells come back as None for blank columns — skip those.
    headers = [_normalize_header(h) for h in header]

    rows = []
    for raw_row in rows_iter:
        # Skip fully blank rows (common at the end of an Excel sheet)
        if raw_row is None or all(cell is None for cell in raw_row):
            continue
        row_dict = {}
        for col_index, header_name in enumerate(headers):
            if not header_name:
                continue
            value = raw_row[col_index] if col_index < len(raw_row) else None
            value = _normalize_value(value)
            row_dict[header_name] = value
        rows.append(row_dict)

    return rows
