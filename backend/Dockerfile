# DIPERBAIKI: Menurunkan versi ke 1.24 alpine karena versi 1.25 belum tersedia secara stabil
FROM golang:1.25-alpine AS builder
RUN apk add --no-cache curl



WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o obelms-server main.go

FROM alpine:latest
WORKDIR /app

RUN apk add --no-cache tzdata

COPY --from=builder /app/obelms-server .
RUN mkdir -p /app/backend/uploads

EXPOSE 9000
CMD ["./obelms-server"]
