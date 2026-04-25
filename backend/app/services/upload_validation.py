from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

settings = get_settings()


def validate_image_upload(file: UploadFile, file_bytes: bytes, *, field_name: str) -> None:
    if file.content_type not in settings.upload_allowed_mime_list:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported content type for {field_name}. "
                f"Allowed: {', '.join(settings.upload_allowed_mime_list)}"
            ),
        )

    if len(file_bytes) > settings.upload_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"{field_name} exceeds max size of {settings.upload_max_bytes // (1024 * 1024)}MB",
        )

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} is empty",
        )
