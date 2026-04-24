import io
import logging
from pathlib import Path
from typing import Any

from docling.datamodel.base_models import ConversionStatus, DocumentStream, InputFormat
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
    # Explicit compliance guardrail — must remain False in all environments.
    # Some Docling versions accept this as a converter property; if the attribute
    # isn't present on this version, set it in PdfPipelineOptions instead.
    try:
        converter.enable_remote_services = False
    except AttributeError:
        pdf_opts.enable_remote_services = False
    return converter


def convert_sync(
    converter: DocumentConverter,
    path: Path,
    original_name: str,
    max_pages: int,
    max_bytes: int,
) -> dict[str, Any]:
    """Run one conversion. Returns dict with status/pages/markdown/errors."""
    with path.open("rb") as fh:
        stream = DocumentStream(name=original_name, stream=io.BytesIO(fh.read()))
    result = converter.convert(
        stream,
        max_num_pages=max_pages,
        max_file_size=max_bytes,
        raises_on_error=False,
    )
    doc = result.document
    ok = result.status in (ConversionStatus.SUCCESS, ConversionStatus.PARTIAL_SUCCESS)
    status_val = result.status.value if hasattr(result.status, "value") else str(result.status)
    return {
        "status": status_val,
        "pages": len(doc.pages) if getattr(doc, "pages", None) else 0,
        "markdown": doc.export_to_markdown() if ok else None,
        "errors": [e.error_message for e in (result.errors or [])],
    }
