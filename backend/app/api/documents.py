from pathlib import PurePath

from fastapi import APIRouter, File, HTTPException, UploadFile, status


router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", status_code=status.HTTP_200_OK)
async def upload_document(file: UploadFile = File(...)):
    # Validate both the MIME type and extension before accepting the upload.
    if file.content_type != "application/pdf" or PurePath(file.filename or "").suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "status": "accepted",
    }
