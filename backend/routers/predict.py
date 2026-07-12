from fastapi import APIRouter, HTTPException

from models.schemas import EtaRequest, EtaResponse
from services.prediction import ModelNotTrainedError, predict_eta

router = APIRouter(prefix="/predict", tags=["predict"])


@router.post("/eta", response_model=EtaResponse)
def get_eta(request: EtaRequest) -> EtaResponse:
    try:
        minutes, confidence = predict_eta(
            request.stop, request.day_of_week, request.hour, request.weather_flag
        )
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return EtaResponse(stop=request.stop, estimated_wait_minutes=minutes, confidence=confidence)
