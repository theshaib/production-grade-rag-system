# Import Path for safe file path handling.
from pathlib import Path

# Import PdfReader to extract text from PDF files.
from pypdf import PdfReader


# Extract text from a PDF document.
def load_pdf(file_path: str) -> str:
    # Convert the provided path into a Path object.
    path = Path(file_path)

    # Validate that the file exists before processing it.
    if not path.exists():
        raise FileNotFoundError(f"PDF file not found: {file_path}")

    # Open and parse the PDF document.
    reader = PdfReader(path)

    # Store extracted text from every page.
    pages: list[str] = []

    for page in reader.pages:
        # Some PDF pages may not contain extractable text.
        text = page.extract_text()

        if text:
            pages.append(text)

    # Combine all extracted pages into one document string.
    return "\n\n".join(pages)