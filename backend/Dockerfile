FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python data/train_model.py

EXPOSE 8000

# Shell form (not exec-array form) so $PORT actually gets expanded — most
# PaaS hosts (Railway, Render, etc.) assign their own port dynamically and
# route to whatever the container listens on, not necessarily 8000.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
