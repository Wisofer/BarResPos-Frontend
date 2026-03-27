# Configuración: Tipo de cambio y Datos de la agencia

Endpoints separados para la pantalla de **Tipo de cambio (C$ = 1 USD)** y la pantalla de **Datos de la Agencia**.

- **Autenticación:** Todas las rutas requieren `Authorization: Bearer <token>` (el mismo JWT del login).
- **Content-Type:** En PUT enviar `Content-Type: application/json`.
- **Base URL:** La misma del resto de la API (ej. `http://localhost:5229` en desarrollo).

---

## 1. Tipo de cambio (C$ = 1 USD)

Se usa para convertir ventas/pagos en dólares a córdobas en totales y reportes. Es independiente del formulario de datos de la agencia.

### 1.1 Obtener tipo de cambio

**GET** `/api/exchange-rate`

**Respuesta 200:**
```json
{
  "exchangeRate": 36.8
}
```

- `exchangeRate`: número (decimal). Cuántos córdobas equivalen a 1 USD.
- Si no hay configuración guardada, el backend devuelve `36.8` por defecto.

### 1.2 Guardar tipo de cambio

**PUT** `/api/exchange-rate`

**Body:**
```json
{
  "exchangeRate": 36.8
}
```

- `exchangeRate`: obligatorio, debe ser un número **mayor que 0**.

**Respuesta 200:** El mismo objeto guardado:
```json
{
  "exchangeRate": 36.8
}
```

**Respuesta 400:** Si `exchangeRate` falta o no es positivo:
```json
{
  "error": "exchangeRate debe ser un número positivo."
}
```

---

## 2. Datos de la Agencia

Formulario: **Nombre de la empresa**, **Moneda**, **Correo electrónico**, **Teléfono**, **Dirección**, botón **"Guardar datos de la agencia"**. El campo **"Última actualización"** se puede mostrar con `updatedAt`.

### 2.1 Obtener datos de la agencia

**GET** `/api/agency`

**Respuesta 200:**
```json
{
  "id": 1,
  "companyName": "Aventours",
  "email": "contacto@agencia.com",
  "phone": "505 8123 4567",
  "address": "Ciudad, dirección",
  "currency": "NIO",
  "updatedAt": "2026-02-27T12:00:00Z"
}
```

- Si no hay registro, el backend puede devolver valores por defecto (ej. `companyName`: `"Aventours"`, `currency`: `"NIO"`, `id`: `0`, resto null).

### 2.2 Guardar datos de la agencia

**PUT** `/api/agency`

**Body:**
```json
{
  "companyName": "Aventours",
  "email": "contacto@agencia.com",
  "phone": "505 8123 4567",
  "address": "Ciudad, dirección",
  "currency": "NIO"
}
```

- `companyName`: **obligatorio**.
- Los demás campos son opcionales. Para moneda se puede enviar `"NIO"` (Córdobas).
- Este endpoint **no modifica el tipo de cambio**; solo actualiza nombre, correo, teléfono, dirección y moneda.

**Respuesta 200:** Objeto actualizado (incluye `id` y `updatedAt`):
```json
{
  "id": 1,
  "companyName": "Aventours",
  "email": "contacto@agencia.com",
  "phone": "505 8123 4567",
  "address": "Ciudad, dirección",
  "currency": "NIO",
  "updatedAt": "2026-02-27T14:30:00Z"
}
```

**Respuesta 400:** Si falta el nombre de la empresa:
```json
{
  "error": "companyName es requerido."
}
```

---

## Resumen de rutas

| Pantalla / Uso              | GET                    | PUT                    |
|----------------------------|------------------------|------------------------|
| Tipo de cambio (C$ = 1 USD)| `GET /api/exchange-rate` | `PUT /api/exchange-rate` |
| Datos de la Agencia        | `GET /api/agency`      | `PUT /api/agency`      |

Ambos usan el mismo registro interno de configuración; el backend separa:
- **Tipo de cambio:** solo lee/escribe `exchangeRate`.
- **Datos de la agencia:** solo lee/escribe `companyName`, `email`, `phone`, `address`, `currency` y `updatedAt`.
