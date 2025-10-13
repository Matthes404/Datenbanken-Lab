FROM python:3.13-slim

COPY requirements.txt .
RUN pip3 install -r requirements.txt

WORKDIR /app
COPY . .

CMD ["python","app.py"]