FROM golang:1.25-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o obelms-server main.go

FROM alpine:latest
WORKDIR /app

# Install tzdata agar zona waktu Asia/Jakarta dikenali oleh Go
RUN apk add --no-cache tzdata

COPY --from=builder /app/obelms-server .
RUN mkdir -p /app/backend/uploads

EXPOSE 9000
CMD ["./obelms-server"]