import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from database.db import init_db
from exceptions import AutoTallyError, DatabaseError, StartupError
from logging_config import setup_logging
from routers import sms, merchants, categories

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    try:
        await init_db()
    except Exception as e:
        raise StartupError(f"Failed to initialize database: {e}") from e
    logger.info("AutoTally started")
    yield


app = FastAPI(title="AutoTally", lifespan=lifespan)

app.include_router(sms.router)
app.include_router(merchants.router)
app.include_router(categories.router)


@app.exception_handler(AutoTallyError)
async def autotally_error_handler(request: Request, exc: AutoTallyError) -> JSONResponse:
    if exc.status_code >= 500:
        logger.error("%s: %s", type(exc).__name__, exc)
    else:
        logger.warning("Business error: %s", exc)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": type(exc).__name__, "detail": str(exc)},
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={
            "error": "ValidationError",
            "detail": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": "InternalServerError", "detail": "An unexpected error occurred"},
    )
