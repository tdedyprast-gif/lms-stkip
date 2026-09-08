import os

import httpx

from fastapi import FastAPI, Request
from fastapi.responses import Response
from dotenv import load_dotenv

load_dotenv()

GO_BACKEND_URL = os.environ.get(
    "GO_BACKEND_URL",
    "http://127.0.0.1:9000"
)

app = FastAPI(title="OBE-LMS Proxy")

client = httpx.AsyncClient(
    base_url=GO_BACKEND_URL,
    timeout=120.0
)

HOP_BY_HOP = {
    "content-length",
    "transfer-encoding",
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "upgrade",
}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.api_route(
    "/api/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
)
async def proxy(path: str, request: Request):
    body = await request.body()

    headers = {
        k: v
        for k, v in request.headers.items()
        if k.lower() != "host"
    }

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
        return Response(
            content=b'{"detail":"Backend belum siap, coba lagi sesaat."}',
            status_code=503,
            media_type="application/json"
        )

    resp_headers = {
        k: v
        for k, v in upstream.headers.items()
        if k.lower() not in HOP_BY_HOP
    }

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=upstream.headers.get("content-type"),
    )


@app.get("/")
async def root():
    return {
        "service": "OBE-LMS proxy",
        "upstream": GO_BACKEND_URL
    }