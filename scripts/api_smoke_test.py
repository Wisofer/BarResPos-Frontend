#!/usr/bin/env python3
"""
Smoke / QA contra la API V1 (mismo contrato que el frontend: Success/Data o success/data).
Por defecto usa solo lecturas (GET). Opcional: --with-write prueba POST/PATCH seguros de demo.

Uso:
  export API_URL=https://bar.encuentrame.org
  python3 scripts/api_smoke_test.py
  python3 scripts/api_smoke_test.py --user admin --password admin
  python3 scripts/api_smoke_test.py --curl-snippets   # imprime ejemplos curl
"""

from __future__ import annotations

import argparse
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from typing import Any, Optional

DEFAULT_BASE = os.environ.get("API_URL", "https://bar.encuentrame.org").rstrip("/")


def unwrap(payload: Any) -> Any:
    if not isinstance(payload, dict):
        return payload
    if "success" in payload:
        if not payload.get("success"):
            raise RuntimeError(payload.get("message") or "Error de API (success=false)")
        return payload.get("data")
    if "Success" in payload:
        if not payload.get("Success"):
            raise RuntimeError(
                payload.get("Message") or payload.get("message") or "Error de API (Success=false)"
            )
        return payload.get("Data")
    return payload


def pick_token(data: Any) -> Optional[str]:
    if not isinstance(data, dict):
        return None
    for k in ("accessToken", "AccessToken", "token", "Token"):
        v = data.get(k)
        if isinstance(v, str) and v:
            return v
    return None


UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)


def http_json(
    method: str,
    url: str,
    body: Any = None,
    token: Optional[str] = None,
    timeout: float = 60.0,
) -> tuple[int, Any]:
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": UA,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw = resp.read().decode("utf-8")
            status = resp.status
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        status = e.code
        try:
            j = json.loads(raw) if raw.strip() else None
            raise RuntimeError(f"HTTP {status}: {j}") from None
        except json.JSONDecodeError:
            pass
        snippet = raw.strip().replace("\n", " ")
        if "<html" in snippet.lower() or len(snippet) > 400:
            snippet = snippet[:400] + "… [HTML truncado]"
        raise RuntimeError(f"HTTP {status}: {snippet}") from None
    if status == 204 or not raw.strip():
        return status, None
    try:
        return status, json.loads(raw)
    except json.JSONDecodeError:
        snippet = raw.strip().replace("\n", " ")
        if len(snippet) > 250:
            snippet = snippet[:250] + "..."
        raise RuntimeError(f"Respuesta no JSON en {url}: {snippet}")


def pick_first_id(payload: Any) -> Optional[int]:
    if isinstance(payload, list) and payload:
        c = payload[0]
    elif isinstance(payload, dict):
        items = payload.get("items") or payload.get("Items")
        if isinstance(items, list) and items:
            c = items[0]
        else:
            c = payload
    else:
        return None

    if not isinstance(c, dict):
        return None
    raw = c.get("id") or c.get("Id")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def pick_first_product_id_with_fallback(base: str, token: str) -> Optional[int]:
    try:
        prods = get_unwrap(base, "/api/v1/productos?pageSize=1", token)
        pid = pick_first_id(prods)
        if pid:
            return pid
    except Exception:
        pass

    # Fallback: si listado de productos falla, intentar movimientos.
    try:
        movs = get_unwrap(base, "/api/v1/productos/movimientos?pageSize=1", token)
        items = None
        if isinstance(movs, dict):
            items = movs.get("items") or movs.get("Items")
        elif isinstance(movs, list):
            items = movs
        if isinstance(items, list) and items:
            p = items[0].get("productoId") if isinstance(items[0], dict) else None
            return int(p) if p is not None else None
    except Exception:
        pass
    return None


def login(base: str, user: str, password: str) -> str:
    url = f"{base}/api/v1/auth/login"
    _, raw = http_json("POST", url, {"nombreUsuario": user, "contrasena": password})
    data = unwrap(raw)
    tok = pick_token(data)
    if not tok and isinstance(data, dict):
        # a veces el token viene anidado
        inner = data.get("user") or data.get("User")
        tok = pick_token(inner) if isinstance(inner, dict) else None
    if not tok:
        raise RuntimeError(f"No se obtuvo accessToken en login: {data!r}")
    return tok


def get_unwrap(base: str, path: str, token: str) -> Any:
    url = f"{base}{path}" if path.startswith("/") else f"{base}/{path}"
    _, raw = http_json("GET", url, token=token)
    return unwrap(raw)


class Case:
    def __init__(self, name: str, method: str, path: str, body: Any = None, ok_if: Any = None):
        self.name = name
        self.method = method
        self.path = path
        self.body = body
        self.ok_if = ok_if  # callable(status, unwrapped) -> bool


def run_cases(base: str, token: str, cases: list[Case]) -> list[tuple[str, bool, str]]:
    results: list[tuple[str, bool, str]] = []
    for c in cases:
        url = f"{base}{c.path}" if c.path.startswith("/") else f"{base}/{c.path}"
        try:
            if c.method == "GET":
                _, raw = http_json("GET", url, token=token)
                unwrapped = unwrap(raw)
            else:
                _, raw = http_json(c.method, url, body=c.body, token=token)
                unwrapped = unwrap(raw)
            ok = True
            if c.ok_if is not None:
                ok = bool(c.ok_if(unwrapped))
            elif unwrapped is None and c.method != "GET":
                ok = False
            elif isinstance(unwrapped, str):
                ok = False
            note = "OK"
            if isinstance(unwrapped, list):
                note = f"OK ({len(unwrapped)} items)"
            elif isinstance(unwrapped, dict):
                note = f"OK (keys: {list(unwrapped.keys())[:8]}{'...' if len(unwrapped) > 8 else ''})"
            results.append((c.name, ok, note))
        except Exception as e:
            results.append((c.name, False, str(e)))
    return results


def main() -> int:
    ap = argparse.ArgumentParser(description="Smoke test API bar/restaurante")
    ap.add_argument("--base", default=DEFAULT_BASE, help="URL base sin barra final")
    ap.add_argument("--user", default=os.environ.get("API_USER", "admin"))
    ap.add_argument("--password", default=os.environ.get("API_PASSWORD", "admin"))
    ap.add_argument(
        "--with-write",
        action="store_true",
        help="Incluye llamadas que modifican datos (cancelar orden de prueba, etc.) — usar con cuidado",
    )
    ap.add_argument("--curl-snippets", action="store_true", help="Solo imprime ejemplos curl y sale")
    args = ap.parse_args()
    base = args.base.rstrip("/")

    if args.curl_snippets:
        print(
            f"""
# Login (guarda el token)
curl -sS -X POST '{base}/api/v1/auth/login' \\
  -H 'Content-Type: application/json' \\
  -d '{{"nombreUsuario":"admin","contrasena":"admin"}}'

# Luego:
export TOKEN='...pegar accessToken...'
curl -sS '{base}/api/v1/auth/me' -H "Authorization: Bearer $TOKEN"
curl -sS '{base}/api/v1/mesas?pageSize=3' -H "Authorization: Bearer $TOKEN"
curl -sS '{base}/api/v1/productos?pageSize=3' -H "Authorization: Bearer $TOKEN"
curl -sS '{base}/api/v1/cocina/ordenes' -H "Authorization: Bearer $TOKEN"
"""
        )
        return 0

    print(f"Base: {base}")
    print(f"Usuario: {args.user}")
    try:
        token = login(base, args.user, args.password)
    except Exception as e:
        print(f"FAIL login: {e}")
        return 1
    print("PASS login (token obtenido)\n")

    read_cases = [
        Case("GET /auth/me", "GET", "/api/v1/auth/me"),
        Case("GET /mesas", "GET", "/api/v1/mesas?pageSize=5"),
        Case("GET /productos", "GET", "/api/v1/productos?pageSize=5"),
        Case("GET /pedidos", "GET", "/api/v1/pedidos?pageSize=5"),
        Case("GET /cocina/ordenes", "GET", "/api/v1/cocina/ordenes"),
        Case("GET /cocina/ordenes?estado=Pendiente", "GET", "/api/v1/cocina/ordenes?estadoCocina=Pendiente"),
        Case("GET /caja/estado", "GET", "/api/v1/caja/estado"),
        Case("GET /dashboard/resumen", "GET", "/api/v1/dashboard/resumen"),
        Case("GET /configuraciones", "GET", "/api/v1/configuraciones"),
        Case("GET /usuarios", "GET", "/api/v1/usuarios?pageSize=5"),
        Case("GET /catalogos/ubicaciones", "GET", "/api/v1/catalogos/ubicaciones"),
        Case("GET /catalogos/categorias-producto", "GET", "/api/v1/catalogos/categorias-producto"),
        Case("GET /plantillas-whatsapp", "GET", "/api/v1/configuraciones/plantillas-whatsapp?pageSize=5"),
        Case("GET /productos/movimientos", "GET", "/api/v1/productos/movimientos?pageSize=5"),
        Case("GET /reportes/resumen-ventas", "GET", "/api/v1/reportes/resumen-ventas"),
        Case("GET /reportes/productos-top", "GET", "/api/v1/reportes/productos-top"),
        Case("GET /pedidos/resumen", "GET", "/api/v1/pedidos/resumen"),
    ]

    results = run_cases(base, token, read_cases)
    for name, ok, note in results:
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {name}: {note}")

    failed = sum(1 for _, ok, _ in results if not ok)
    print(f"\nResumen lecturas: {len(results) - failed}/{len(results)} OK")

    if args.with_write:
        print("\n--with-write: pruebas de escritura (pueden fallar por reglas de negocio)")
        # Obtener primera mesa y producto para un POST pos mínimo opcional
        try:
            mesas = get_unwrap(base, "/api/v1/mesas?pageSize=1", token)
            mid = pick_first_id(mesas)
            pid = pick_first_product_id_with_fallback(base, token)
            if mid and pid:
                body = {
                    "mesaId": int(mid),
                    "productos": [{"productoId": int(pid), "cantidad": 1, "notas": "smoke-test-api"}],
                }
                url = f"{base}/api/v1/pos/ordenes"
                try:
                    _, raw = http_json("POST", url, body=body, token=token)
                    data = unwrap(raw)
                    oid = None
                    if isinstance(data, dict):
                        oid = data.get("id") or data.get("Id") or data.get("ordenId") or data.get("OrdenId")
                    print(f"  [INFO] POST /pos/ordenes -> orden id={oid}")
                    if oid:
                        try:
                            _, raw2 = http_json(
                                "POST",
                                f"{base}/api/v1/pos/ordenes/{oid}/cancelar",
                                body={},
                                token=token,
                            )
                            unwrap(raw2)
                            print(f"  [PASS] cancelada orden de prueba {oid}")
                        except Exception as ce:
                            print(f"  [WARN] no se pudo cancelar orden {oid}: {ce}")
                except Exception as pe:
                    print(f"  [SKIP/FAIL] POST pos/ordenes: {pe}")
            else:
                print("  [SKIP] Sin mesa o producto para prueba POS")
        except Exception as e:
            print(f"  [FAIL] with-write setup: {e}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
