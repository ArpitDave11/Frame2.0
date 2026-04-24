import logging
from pathlib import Path
from typing import Any

from docling.datamodel.base_models import ConversionStatus, InputFormat
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
    TableFormerMode,
    RapidOcrOptions,
)
from docling.datamodel.accelerator_options import AcceleratorOptions, AcceleratorDevice
from docling.document_converter import DocumentConverter, PdfFormatOption

log = logging.getLogger(__name__)


def build_converter(artifacts_path: str, do_ocr: bool, num_threads: int) -> DocumentConverter:
    """Build a DocumentConverter once. Called in lifespan.

    Compliance note: we explicitly set enable_remote_services=False on the
    converter so any attempt to call an external VLM/LLM raises
    OperationNotAllowed — belt-and-braces guardrail that survives Docling
    version changes which might flip the default.
    """
    pdf_opts = PdfPipelineOptions(
        artifacts_path=artifacts_path,
        do_ocr=do_ocr,
        do_table_structure=True,
    )
    pdf_opts.table_structure_options.mode = TableFormerMode.ACCURATE
    if do_ocr:
        pdf_opts.ocr_options = RapidOcrOptions()
    pdf_opts.accelerator_options = AcceleratorOptions(
        num_threads=num_threads, device=AcceleratorDevice.CPU
    )
    converter = DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pdf_opts)},
    )
    # Compliance guardrail — must remain False in all environments.
    # Set on both the converter object and the pipeline options because Docling
    # has moved the attribute across versions. After the build, assert that at
    # least one surface reads back as False — if both are missing (upstream
    # rename), fail loudly rather than silently opening SSRF.
    set_on_converter = False
    set_on_options = False
    try:
        converter.enable_remote_services = False
        set_on_converter = True
    except AttributeError:
        pass
    try:
        pdf_opts.enable_remote_services = False
        set_on_options = True
    except AttributeError:
        pass
    if not (set_on_converter or set_on_options):
        raise RuntimeError(
            "Docling guardrail failure: enable_remote_services attribute not found "
            "on DocumentConverter or PdfPipelineOptions. Pin Docling version."
        )
    # Post-check: whichever surface accepted the set must still read False.
    if set_on_converter and getattr(converter, "enable_remote_services", True) is not False:
        raise RuntimeError("enable_remote_services did not persist on converter.")
    if set_on_options and getattr(pdf_opts, "enable_remote_services", True) is not False:
        raise RuntimeError("enable_remote_services did not persist on pdf_opts.")
    return converter


def convert_sync(
    converter: DocumentConverter,
    path: Path,
    original_name: str,
    max_pages: int,
    max_bytes: int,
) -> dict[str, Any]:
    """Run one conversion. Returns dict with ok/status/pages/markdown/errors.

    Passes the file path directly to Docling — avoids double-buffering the
    entire upload into RAM.
    """
    result = converter.convert(
        path,
        max_num_pages=max_pages,
        max_file_size=max_bytes,
        raises_on_error=False,
    )
    doc = result.document
    ok = result.status in (ConversionStatus.SUCCESS, ConversionStatus.PARTIAL_SUCCESS)
    status_val = result.status.value if hasattr(result.status, "value") else str(result.status)
    return {
        "ok": ok,
        "status": status_val,
        "pages": len(doc.pages) if getattr(doc, "pages", None) else 0,
        "markdown": doc.export_to_markdown() if ok else None,
        "errors": [str(getattr(e, "error_message", e) or "") for e in (result.errors or [])],
    }
