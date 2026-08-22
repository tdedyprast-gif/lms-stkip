"""
Reverse proxy: forwards all /api/* requests from the sanctioned FastAPI backend
(port 8001, managed by supervisor) to the Go OBE-LMS microservice on port 9000.

The Go backend is the real application server. This thin proxy exists only so the
platform ingress (which routes /api -> 8001) can reach the Go service unchanged.
"""
import os
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import Response
from dotenv import load_dotenv

load_dotenv()

GO_BACKEND_URL = os.environ.get("GO_BACKEND_URL", "http://127.0.0.1:9000")

app = FastAPI(title="OBE-LMS Proxy")

client = httpx.AsyncClient(base_url=GO_BACKEND_URL, timeout=120.0)

HOP_BY_HOP = {
    "content-length", "transfer-encoding", "connection", "keep-alive",
    "proxy-authenticate", "proxy-authorization", "te", "trailers", "upgrade",
}


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy(path: str, request: Request):
    body = await request.body()
    headers = {k: v for k, v in request.headers.items() if k.lower() != "host"}
    url = "/api/" + path
    try:
        upstream = await client.request(
            request.method,
            url,
            params=dict(request.query_params),
            content=body,
            headers=headers,
        )
    except httpx.ConnectError:
        return Response(content=b'{"detail":"Backend belum siap, coba lagi sesaat."}',
                        status_code=503, media_type="application/json")

    resp_headers = {k: v for k, v in upstream.headers.items() if k.lower() not in HOP_BY_HOP}
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=upstream.headers.get("content-type"),
    )


@app.get("/")
async def root():
    return {"service": "OBE-LMS proxy", "upstream": GO_BACKEND_URL}
