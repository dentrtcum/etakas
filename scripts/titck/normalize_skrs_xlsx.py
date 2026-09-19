#!/usr/bin/env python3
"""Normalize the official TİTCK SKRS workbook without third-party Python packages."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"m": MAIN_NS, "r": REL_NS}


def cell_column(reference: str) -> str:
    match = re.match(r"[A-Z]+", reference)
    if not match:
        raise ValueError(f"Invalid cell reference: {reference}")
    return match.group(0)


def excel_date(value: str) -> str | None:
    if not value:
        return None
    try:
        serial = float(value)
    except ValueError:
        parsed = value.strip()
        return parsed or None
    return (dt.date(1899, 12, 30) + dt.timedelta(days=int(serial))).isoformat()


def bool_value(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "evet", "var", "x"}


def load_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return [
        "".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t"))
        for item in root.findall("m:si", NS)
    ]


def read_cell(cell: ET.Element, shared: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(f"{{{MAIN_NS}}}t"))
    value_node = cell.find("m:v", NS)
    if value_node is None or value_node.text is None:
        return ""
    if cell_type == "s":
        return shared[int(value_node.text)]
    return value_node.text


def active_sheet_path(archive: zipfile.ZipFile) -> str:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    targets = {
        item.attrib["Id"]: item.attrib["Target"]
        for item in relationships.findall(f"{{{PACKAGE_REL_NS}}}Relationship")
    }
    sheets = workbook.find("m:sheets", NS)
    if sheets is None:
        raise ValueError("The workbook does not contain a sheets collection.")
    for sheet in sheets:
        if sheet.attrib.get("name", "").strip().upper().startswith("AKTİF ÜRÜNLER"):
            relationship_id = sheet.attrib[f"{{{REL_NS}}}id"]
            target = targets[relationship_id].lstrip("/")
            return target if target.startswith("xl/") else f"xl/{target}"
    raise ValueError("The workbook does not contain the active products sheet.")


def normalize(input_path: Path, published_at: str, source_url: str) -> dict[str, object]:
    dt.date.fromisoformat(published_at)
    with zipfile.ZipFile(input_path) as archive:
        shared = load_shared_strings(archive)
        root = ET.fromstring(archive.read(active_sheet_path(archive)))
        rows = root.findall(".//m:sheetData/m:row", NS)

        header_index = -1
        for index, row in enumerate(rows):
            values = {
                cell_column(cell.attrib["r"]): read_cell(cell, shared).strip()
                for cell in row.findall("m:c", NS)
            }
            if values.get("A") == "İlaç Adı" and values.get("B") == "Barkod":
                header_index = index
                break
        if header_index < 0:
            raise ValueError("Expected TİTCK columns were not found.")

        products: dict[str, dict[str, object]] = {}
        for row in rows[header_index + 1 :]:
            values = {
                cell_column(cell.attrib["r"]): read_cell(cell, shared).strip()
                for cell in row.findall("m:c", NS)
            }
            gtin = re.sub(r"\D", "", values.get("B", ""))
            name = values.get("A", "").strip()
            if not re.fullmatch(r"\d{8,14}", gtin) or not name:
                continue
            products[gtin] = {
                "gtin": gtin,
                "name": name[:240],
                "atcCode": values.get("C", "")[:32] or None,
                "atcName": values.get("D", "")[:240] or None,
                "manufacturer": values.get("E", "")[:240] or None,
                "prescriptionType": values.get("F", "")[:120] or None,
                "status": values.get("G", "")[:40] or "Aktif",
                "description": values.get("H", "") or None,
                "isEssential": bool_value(values.get("I", "")),
                "isPediatricEssential": bool_value(values.get("J", "")),
                "isNewbornEssential": bool_value(values.get("K", "")),
                "activeSince": excel_date(values.get("L", "")),
            }

    return {
        "source": "TİTCK SKRS E-Reçete İlaç ve Diğer Farmasötik Ürünler Listesi",
        "publishedAt": published_at,
        "sourceDocumentUrl": source_url,
        "products": sorted(products.values(), key=lambda product: product["gtin"]),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--published-at", required=True)
    parser.add_argument("--source-url", required=True)
    args = parser.parse_args()
    snapshot = normalize(args.input, args.published_at, args.source_url)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"Normalized {len(snapshot['products'])} active TİTCK products into {args.output}.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(f"TİTCK normalization failed: {error}", file=sys.stderr)
        raise SystemExit(1)
