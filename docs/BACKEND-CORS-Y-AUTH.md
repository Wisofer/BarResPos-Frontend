# CORS y autenticación API – Requisitos para el frontend

El frontend (React en `http://localhost:5173` o en producción) consume la API con **fetch** y **credentials: 'include'** (cookies). Para que funcione sin errores de CORS ni redirects, el backend debe cumplir lo siguiente.

---

## 1. No redirigir en peticiones a la API

**Problema actual:** Cuando el usuario no está autenticado, el backend responde con un **redirect 302** a `/api/auth/login?ReturnUrl=...`. Eso rompe el uso desde JavaScript:

- El navegador hace una petición **preflight** (OPTIONS) por CORS.
- Si el servidor responde con un **redirect**, el navegador lo bloquea: *"Redirect is not allowed for a preflight request"*.

**Solución:** En **todas las rutas bajo `/api/`** (excepto login y las que sean públicas):

- **No** devolver redirect (302/301) cuando falte la sesión.
- Devolver **401 Unauthorized** con cuerpo vacío o JSON (por ejemplo `{ "error": "No autorizado" }`).

Ejemplo en .NET: en el middleware o el filtro de autorización, para peticiones que empiecen por `/api/`, en lugar de:

```csharp
// NO hacer esto para /api/*
Context.Response.Redirect("/api/auth/login?ReturnUrl=...");
```

hacer:

```csharp
// SÍ: devolver 401 para API
Context.Response.StatusCode = 401;
// opcional: Context.Response.WriteAsJsonAsync(new { error = "No autorizado" });
return; // no seguir con redirect
```

Así el frontend puede detectar 401 y llevar al usuario al login sin que CORS bloquee nada.

---

## 2. CORS configurado correctamente

- **Orígenes permitidos:** Al menos `http://localhost:5173` (desarrollo). En producción, el origen donde se sirva el frontend (por ejemplo `https://tu-dominio.com`).
- **Credenciales:** Habilitar `AllowCredentials()` (o equivalente) para que se envíen cookies.
- **Preflight (OPTIONS):** Las peticiones OPTIONS a `/api/*` deben responder con **200** y las cabeceras CORS adecuadas, **sin redirect**.

En .NET suele ser algo así (ajustar orígenes y métodos/cabeceras según tu API):

```csharp
// Ejemplo con UseCors
app.UseCors(policy => policy
    .WithOrigins("http://localhost:5173", "https://tu-frontend.com")
    .AllowAnyMethod()
    .AllowAnyHeader()
    .AllowCredentials());
```

Asegurarse de que **no** haya un middleware que redirija las peticiones no autenticadas **antes** de que CORS haya respondido al OPTIONS.

---

## 3. No redirigir HTTPS a HTTP

Las peticiones del frontend van a `https://trippilot.cowib.es`. Si el servidor responde con un redirect a `http://trippilot.cowib.es`, el navegador puede mezclar protocolos y empeorar el problema. El backend debe:

- Mantener **HTTPS** en la URL del sitio/API.
- No devolver redirects que cambien de `https` a `http`.

---

## Resumen

| Qué | Cómo |
|-----|------|
| Rutas `/api/*` sin sesión | Devolver **401**, no redirect a login |
| Peticiones OPTIONS (preflight) | Responder **200** con cabeceras CORS, sin redirect |
| CORS | Permitir origen del frontend y `AllowCredentials()` |
| URL de la API | Mantener HTTPS, sin redirect a HTTP |

Con estos cambios, el frontend podrá llamar a la API desde `http://localhost:5173` (y desde producción) sin errores de CORS ni de redirect en preflight.
