const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export interface VerifyDriverResponse {
  driver_id: string;
  name: string;
}

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function verifyDriver(phone: string, pin: string): Promise<VerifyDriverResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/drivers/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, pin }),
    });
  } catch {
    throw new ApiError('Cannot reach the verification service. Check your connection and try again.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.detail ?? 'Phone number or PIN is incorrect.', response.status);
  }

  return response.json();
}

export interface EtaRequest {
  stop: string;
  day_of_week: number;
  hour: number;
  weather_flag: boolean;
}

export interface EtaResponse {
  stop: string;
  estimated_wait_minutes: number;
  confidence: 'synthetic' | 'real_data_informed';
}

export async function predictEta(request: EtaRequest): Promise<EtaResponse> {
  const response = await fetch(`${API_BASE_URL}/predict/eta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new ApiError('Could not get an ETA prediction right now.', response.status);
  }

  return response.json();
}
