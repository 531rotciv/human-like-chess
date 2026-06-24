FROM python:3.12-slim
WORKDIR /app/backend

# install dependencies
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt

# copy source
COPY backend/ ./
COPY configurations/ ../configurations/
COPY data/ ../data/
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]