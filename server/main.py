from contextlib import asynccontextmanager

from fastapi import FastAPI

from database.db import init_db
from routers import sms


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="AutoTally", lifespan=lifespan)

app.include_router(sms.router)
