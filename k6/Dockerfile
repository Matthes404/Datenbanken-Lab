FROM golang:alpine AS builder

RUN apk update && apk add git gcc musl-dev
RUN go install go.k6.io/xk6/cmd/xk6@latest

RUN CGO_ENABLED=1 xk6 build \
    --verbose \
    --with github.com/grafana/xk6-sql@latest \
    --with github.com/grafana/xk6-sql-driver-postgres@latest \
    --output /usr/local/bin/k6_with_sql

FROM alpine:latest

COPY --from=builder /usr/local/bin/k6_with_sql /usr/bin/k6

WORKDIR /home/k6
COPY . .
