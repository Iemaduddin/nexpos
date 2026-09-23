"""NEXPOS ML service: compute-only endpoints for Laravel.

Runs on localhost:8001. Authenticated with the shared ML_API_TOKEN header.
"""

from __future__ import annotations

import os

from fastapi import FastAPI, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

import affinity
import anomalies
import forecasting
import ocr
import segmentation
import affinity
import segmentation

TOKEN = os.environ.get('ML_API_TOKEN', '')

app = FastAPI(title='NEXPOS ML')


class ForecastRequest(BaseModel):
    values: list[float] = Field(min_length=1, max_length=730)
    horizon: int = Field(default=7, ge=1, le=30)


class ForecastResponse(BaseModel):
    quantities: list[float]
    lower: list[float]
    upper: list[float]
    model: str
    confidence: str


def check_token(x_ml_token: str | None) -> None:
    if not TOKEN or x_ml_token != TOKEN:
        raise HTTPException(status_code=401, detail='unauthorized')


@app.get('/health')
def health() -> dict:
    return {'status': 'ok'}


@app.post('/forecast', response_model=ForecastResponse)
def make_forecast(body: ForecastRequest, x_ml_token: str | None = Header(default=None)) -> dict:
    check_token(x_ml_token)
    return forecasting.forecast(body.values, body.horizon)


class AnomalyPoint(BaseModel):
    date: str
    revenue: float = 0
    transactions: float = 0


class AnomalyRequest(BaseModel):
    points: list[AnomalyPoint] = Field(min_length=7, max_length=365)


class AnomalyFinding(BaseModel):
    date: str
    type: str
    severity: str
    score: float
    note: str


@app.post('/anomalies', response_model=list[AnomalyFinding])
def detect_anomalies(body: AnomalyRequest, x_ml_token: str | None = Header(default=None)) -> list:
    check_token(x_ml_token)
    return anomalies.detect([point.model_dump() for point in body.points])


class RecommendRequest(BaseModel):
    baskets: list[list[int]] = Field(min_length=1, max_length=50000)
    top: int = Field(default=50, ge=1, le=200)


class AffinityPair(BaseModel):
    product_id: int
    with_id: int
    support: float
    confidence: float


@app.post('/recommend', response_model=list[AffinityPair])
def recommend_products(body: RecommendRequest, x_ml_token: str | None = Header(default=None)) -> list:
    check_token(x_ml_token)
    return affinity.recommend(body.baskets, body.top)


class SegmentCustomer(BaseModel):
    id: int
    recency: float = 9999
    frequency: float = 0
    monetary: float = 0


class SegmentRequest(BaseModel):
    customers: list[SegmentCustomer] = Field(min_length=1, max_length=50000)


class SegmentResult(BaseModel):
    id: int
    segment: str


@app.post('/segment', response_model=list[SegmentResult])
def segment_customers(body: SegmentRequest, x_ml_token: str | None = Header(default=None)) -> list:
    check_token(x_ml_token)
    return segmentation.segment([customer.model_dump() for customer in body.customers])


class OcrResponse(BaseModel):
    supplier_name: str | None = None
    number: str | None = None
    date: str | None = None
    total: int | None = None
    items: list[dict] = []
    raw_text: str = ''
    avg_confidence: float = 0.0


@app.post('/ocr/invoice', response_model=OcrResponse)
async def ocr_invoice(file: UploadFile, x_ml_token: str | None = Header(default=None)) -> dict:
    check_token(x_ml_token)
    content = await file.read()
    if not content or len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=422, detail='invalid file')
    return ocr.extract(content)
