# Especificación Backend – Documento legado (OptiControl)

Este documento describe **todos los módulos, endpoints, estructuras de datos y reglas de negocio** que el frontend espera del backend para integrar correctamente el sistema de gestión para ópticas.

---

## Contenido

1. [Autenticación](#1-autenticación)
2. [Dashboard](#2-dashboard)
3. [Inventario (Productos)](#3-inventario-productos)
4. [Ventas (registro de venta/cotización)](#4-ventas-registro-de-ventacotización)
5. [Servicios](#5-servicios)
6. [Clientes](#6-clientes)
7. [Historial de ventas](#7-historial-de-ventas)
8. [Egresos](#8-egresos)
9. [Reportes](#9-reportes)
10. [Configuración](#10-configuración)
11. [Actividad reciente](#11-actividad-reciente)
12. [Convenciones generales](#12-convenciones-generales)

---

## 1. Autenticación

El frontend envía todas las peticiones (excepto login) con el header:

```
Authorization: Bearer <token>
```

Si el backend responde **401**, el frontend limpia el token y redirige a `/login`.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/auth/me` | Obtener usuario actual (validar token) |

### POST `/api/auth/login`

**Body (JSON):**
```json
{
  "nombreUsuario": "admin",
  "contrasena": "********"
}
```

**Respuesta exitosa (200):**
```json
{
  "token": "jwt-o-string-token",
  "user": {
    "id": 1,
    "usuario": "admin",
    "nombreCompleto": "Administrador",
    "rol": "Administrador",
    "estado": "Activo"
  }
}
```

- El frontend también acepta que la respuesta sea un objeto con `id` (y otros campos de usuario) sin `user` anidado; en ese caso usa ese objeto como usuario.
- Si hay `data.token`, lo guarda y lo envía en `Authorization: Bearer ...` en todas las peticiones siguientes.

### POST `/api/auth/logout`

- Puede devolver 200/204 o vacío. El frontend limpia el token local en cualquier caso.

### GET `/api/auth/me`

**Headers:** `Authorization: Bearer <token>`

**Respuesta exitosa (200):** Objeto usuario, por ejemplo:
```json
{
  "id": 1,
  "usuario": "admin",
  "nombreCompleto": "Administrador",
  "rol": "Administrador",
  "estado": "Activo"
}
```

---

## 2. Dashboard

El dashboard consume varios endpoints para mostrar resumen, actividad, ingresos mensuales y productos más vendidos.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard/summary` | Resumen general |
| GET | `/api/dashboard/recent-activity` | Actividad reciente (lista) |
| GET | `/api/dashboard/monthly-income` | Ingresos por mes (gráfica) |
| GET | `/api/dashboard/top-products` | Productos/servicios más vendidos |
| GET | `/api/dashboard/alerts` | Alertas (opcional) |

### GET `/api/dashboard/summary`

**Respuesta (200):**
```json
{
  "totalRevenue": 45000,
  "salesToday": 1200,
  "salesMonth": 8500,
  "productsCount": 587,
  "clientsCount": 15,
  "productsTotal": 20
}
```

- **totalRevenue**: Suma de ingresos reales (ventas Pagada + monto pagado de ventas pendientes; sin cotizaciones ni canceladas).
- **salesToday**: Ingresos del día (misma regla de ingresos reales).
- **salesMonth**: Ingresos del mes en curso (misma regla).
- **productsCount**: Suma de `stock` de todos los productos (unidades totales en inventario).
- **clientsCount**: Cantidad de clientes registrados.
- **productsTotal**: Cantidad de productos (registros), no unidades.

### GET `/api/dashboard/recent-activity`

**Respuesta (200):** Array de actividades, ordenadas de más reciente a más antigua (por ejemplo, las últimas 50–100):

```json
[
  {
    "id": "A1",
    "type": "sale",
    "description": "Venta registrada - María García · C$1,800",
    "time": "2026-03-10 14:30"
  },
  {
    "id": "A2",
    "type": "client",
    "description": "Cliente agregado: Roberto Morales",
    "time": "2026-03-10 11:20"
  }
]
```

- **type**: `sale` | `client` | `product` | `inventory` | `service`.
- **time**: Formato legible, por ejemplo `"YYYY-MM-DD HH:mm"`.

El frontend puede enviar query opcional `limit`; el backend puede usarlo para limitar la cantidad de registros.

### GET `/api/dashboard/monthly-income`

**Query opcional:** `months` (número de meses hacia atrás).

**Respuesta (200):**
```json
[
  { "month": "Ene", "monthName": "Ene", "amount": 12000 },
  { "month": "Feb", "monthName": "Feb", "amount": 15000 },
  { "month": "Mar", "monthName": "Mar", "amount": 8500 }
]
```

- **amount**: Ingreso del mes (misma regla que en summary: solo ventas reales, sin cotizaciones ni canceladas; para pendientes solo cuenta `amountPaid`).

### GET `/api/dashboard/top-products`

**Respuesta (200):**
```json
[
  { "name": "Fundas para lentes", "quantity": 22 },
  { "name": "Examen visual", "quantity": 10 },
  { "name": "Ajuste de lentes", "quantity": 8 }
]
```

- Incluir tanto **productos** como **servicios** (por nombre). **quantity** = unidades/cantidad vendida (solo ventas reales: Pagada o pendiente; no cotizaciones ni canceladas).

### GET `/api/dashboard/alerts`

Opcional. Respuesta puede ser `null` o un array de alertas; el frontend lo usa si está implementado.

---

## 3. Inventario (Productos)

CRUD de productos de la óptica (monturas, lentes, accesorios).

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/products` | Listar (paginado y búsqueda) |
| GET | `/api/products/:id` | Obtener uno |
| POST | `/api/products` | Crear |
| PUT | `/api/products/:id` | Actualizar |
| DELETE | `/api/products/:id` | Eliminar |

### Query params (GET list)

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| page | number | Página (default 1) |
| pageSize | number | Tamaño de página (default 20) |
| search | string | Búsqueda por nombre o marca |

### Respuesta listado GET `/api/products`

```json
{
  "items": [
    {
      "id": 1,
      "nombre_producto": "Montura clásica negra",
      "tipo_producto": "montura",
      "marca": "Ray-Ban",
      "precio": 850,
      "stock": 12,
      "stock_minimo": 5,
      "fecha_creacion": "2025-12-05"
    }
  ],
  "totalCount": 20,
  "totalPages": 1,
  "page": 1,
  "pageSize": 20
}
```

### Estructura de producto

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | number/string | Identificador único |
| nombre_producto | string | Nombre del producto |
| tipo_producto | string | Ej: "montura", "lente", "accesorio" |
| marca | string | Marca |
| precio | number | Precio unitario |
| stock | number | Cantidad en inventario |
| stock_minimo | number | Opcional. Umbral mínimo; cuando `stock` ≤ `stock_minimo` el frontend muestra aviso "Stock bajo". 0 = no definido. |
| fecha_creacion | string | Fecha ISO o "YYYY-MM-DD" |

### POST `/api/products` – Body

```json
{
  "nombre_producto": "Montura clásica negra",
  "tipo_producto": "montura",
  "marca": "Ray-Ban",
  "precio": 850,
  "stock": 12,
  "stock_minimo": 5,
  "fecha_creacion": "2025-12-05"
}
```

- **fecha_creacion** es opcional; si no se envía, el backend puede asignar la fecha actual.
- **stock_minimo** es opcional; el frontend lo usa para mostrar aviso cuando el stock está en o por debajo de este valor (0 = sin aviso).

### PUT `/api/products/:id` – Body

Mismos campos que el producto; el frontend puede enviar `id` en el body (se debe ignorar o validar que coincida con `:id`).

### Reglas de negocio

- Al **registrar una venta** (no cotización), el backend debe **descontar stock** de cada producto en `items` según `productId` y `quantity`.
- Al **cancelar una venta** que fue real (Pagada o pendiente), el backend debe **devolver el stock** de los productos de esa venta.
- Las **cotizaciones** no modifican stock.

---

## 4. Ventas (registro de venta/cotización)

El módulo **Ventas** en el frontend es un POS: el usuario arma un carrito (productos y/o servicios), elige cliente y puede:

1. **Guardar cotización**: no se cobra, no se descuenta stock. `status: "cotizacion"`.
2. **Procesar venta**: se cobra (total o parcial). Si el monto recibido es menor que el total, la venta queda **pendiente**; si es >= total, **Pagada**.

Solo se usa **POST** para crear ventas; no hay list/update de “ventas” desde el módulo Ventas (eso va a Historial).

### Endpoint

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/sales` | Registrar venta o cotización |

### POST `/api/sales` – Body

Ejemplo **venta** (no cotización):

```json
{
  "clientId": "1",
  "clientName": "María García",
  "items": [
    {
      "type": "product",
      "productId": 1,
      "productName": "Montura clásica negra",
      "quantity": 1,
      "unitPrice": 850,
      "subtotal": 850
    },
    {
      "type": "service",
      "serviceId": 1,
      "serviceName": "Examen visual",
      "quantity": 1,
      "unitPrice": 200,
      "subtotal": 200
    }
  ],
  "total": 1050,
  "amountPaid": 1050,
  "paymentMethod": "Efectivo",
  "currency": "NIO"
}
```

Ejemplo **cotización**:

- Mismo cuerpo pero con **`"status": "cotizacion"`**.
- No se envía `amountPaid` o se puede enviar 0; no se debe descontar stock.

Campos:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| clientId | string/number | ID del cliente |
| clientName | string | Nombre del cliente (para mostrar e imprimir) |
| items | array | Líneas del carrito (productos y/o servicios) |
| total | number | Total a pagar |
| amountPaid | number | Monto recibido en esta transacción (para venta) |
| paymentMethod | string | Ej: "Efectivo", "Tarjeta" |
| currency | string | Ej: "NIO", "USD" |
| status | string | Solo para cotización: `"cotizacion"`. Si no viene o es venta, no enviar o no usar. |

Cada elemento de **items** puede ser:

- **Producto:** `productId`, `productName`, `quantity`, `unitPrice`, `subtotal`. Opcionalmente `type: "product"`.
- **Servicio:** `serviceId`, `serviceName`, `quantity`, `unitPrice`, `subtotal`. Opcionalmente `type: "service"`.

### Respuesta esperada (200)

El backend debe devolver el objeto de la venta creada, por ejemplo:

```json
{
  "id": "V36",
  "date": "2026-03-12T10:00:00.000Z",
  "clientId": "1",
  "clientName": "María García",
  "items": [ ... ],
  "total": 1050,
  "amountPaid": 1050,
  "paymentMethod": "Efectivo",
  "currency": "NIO",
  "status": "Pagada"
}
```

- **status**: `"Pagada"` | `"pendiente"` | `"cotizacion"`.
- **amountPaid**: Para cotización puede ser 0; para venta, el monto recibido (si es menor que total → `status: "pendiente"`).

### Reglas de negocio

- Si **no** es cotización (`status !== "cotizacion"`):
  - Descontar **stock** de cada producto en `items` por `productId` y `quantity`.
  - Si `amountPaid >= total` → `status: "Pagada"`.
  - Si `amountPaid < total` y `amountPaid > 0` → `status: "pendiente"`.
- Si **es** cotización: no descontar stock; `status: "cotizacion"`; `amountPaid` 0 o no aplica.
- Registrar esta acción en **actividad reciente** (ej. “Venta registrada - María García · C$1,050” o “Cotización guardada - …”).

---

## 5. Servicios

CRUD de servicios de la óptica (examen visual, ajuste de lentes, etc.). No tienen stock; solo nombre, precio y descripción.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/services` | Listar (paginado y búsqueda) |
| GET | `/api/services/:id` | Obtener uno |
| POST | `/api/services` | Crear |
| PUT | `/api/services/:id` | Actualizar |
| DELETE | `/api/services/:id` | Eliminar |

### Query params (GET list)

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| page | number | Página (default 1) |
| pageSize | number | Tamaño de página (default 20) |
| search | string | Búsqueda por nombre o descripción |

### Respuesta listado GET `/api/services`

```json
{
  "items": [
    {
      "id": 1,
      "nombre_servicio": "Examen visual",
      "precio": 200,
      "descripcion": "Evaluación de la vista",
      "fecha_creacion": "2026-01-10"
    }
  ],
  "totalCount": 20,
  "totalPages": 1,
  "page": 1,
  "pageSize": 20
}
```

### Estructura de servicio

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | number/string | Identificador único |
| nombre_servicio | string | Nombre del servicio |
| precio | number | Precio |
| descripcion | string | Descripción (opcional) |
| fecha_creacion | string | Fecha ISO o "YYYY-MM-DD" |

### POST `/api/services` – Body

```json
{
  "nombre_servicio": "Examen visual",
  "precio": 200,
  "descripcion": "Evaluación de la vista",
  "fecha_creacion": "2026-01-10"
}
```

### PUT `/api/services/:id` – Body

Mismos campos; el frontend puede enviar `id` en el body.

---

## 6. Clientes

CRUD de clientes/pacientes de la óptica.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/clients` | Listar (paginado y búsqueda) |
| GET | `/api/clients/:id` | Obtener uno |
| GET | `/api/clients/:id/history` | Historial del cliente (ventas, actividad, etc.) |
| POST | `/api/clients` | Crear |
| PUT | `/api/clients/:id` | Actualizar |
| DELETE | `/api/clients/:id` | Eliminar |

### Query params (GET list)

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| page | number | Página (default 1) |
| pageSize | number | Tamaño de página (default 20) |
| search | string | Búsqueda por nombre o teléfono |

### Respuesta listado GET `/api/clients`

```json
{
  "items": [
    {
      "id": "1",
      "name": "María García",
      "phone": "505 8123 4567",
      "address": "Managua, Barrio San Judas",
      "graduacion_od": "-1.50",
      "graduacion_oi": "-1.25",
      "fecha_registro": "2025-12-01",
      "email": "",
      "descripcion": "Cliente frecuente, prefiere lentes antirreflejo."
    }
  ],
  "totalCount": 15,
  "totalPages": 1,
  "page": 1,
  "pageSize": 20
}
```

### Estructura de cliente

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string/number | Identificador único |
| name | string | Nombre completo |
| phone | string | Teléfono |
| address | string | Dirección |
| graduacion_od | string | Graduación ojo derecho (opcional) |
| graduacion_oi | string | Graduación ojo izquierdo (opcional) |
| fecha_registro | string | Fecha de registro "YYYY-MM-DD" |
| email | string | Email (opcional) |
| descripcion | string | Notas/descripción del cliente (opcional) |

### POST `/api/clients` – Body

Todos los campos anteriores excepto `id` (el backend lo genera). **fecha_registro** puede ser opcional (backend asigna hoy si no se envía).

### PUT `/api/clients/:id` – Body

Mismos campos; el frontend puede enviar `id` en el body.

### GET `/api/clients/:id/history`

Usado para la ficha del cliente (si el frontend la tiene). Respuesta sugerida:

```json
{
  "client": { ...objeto cliente... },
  "reservations": { "items": [], "totalCount": 0, "totalPages": 1, "page": 1, "pageSize": 10 },
  "sales": {
    "items": [ ...ventas del cliente... ],
    "totalCount": 5,
    "totalPages": 1,
    "page": 1,
    "pageSize": 10
  },
  "invoices": { "items": [], "totalCount": 0, "totalPages": 1, "page": 1, "pageSize": 10 },
  "activity": [
    { "id": "h-1", "time": "2026-03-10 14:30", "description": "Venta V1 · C$1800" }
  ]
}
```

---

## 7. Historial de ventas

Listado de todas las ventas y cotizaciones, con acciones: ver detalle, imprimir, agregar pago (si está pendiente), cancelar venta.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/sales-history` | Listar ventas/cotizaciones (paginado) |
| GET | `/api/sales-history/:id` | Obtener una venta (detalle) |
| PUT | `/api/sales-history/:id` | Actualizar: cancelar o agregar pago |

### Query params (GET list)

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| page | number | Página (default 1) |
| pageSize | number | Tamaño de página (default 20) |

### Respuesta listado GET `/api/sales-history`

```json
{
  "items": [
    {
      "id": "V1",
      "date": "2026-03-10T14:30:00",
      "clientId": "1",
      "clientName": "María García",
      "status": "Pagada",
      "total": 1800,
      "amountPaid": 1800,
      "paymentMethod": "Efectivo",
      "currency": "NIO",
      "items": [
        {
          "productId": 1,
          "productName": "Montura clásica negra",
          "quantity": 1,
          "unitPrice": 850,
          "subtotal": 850
        },
        {
          "productId": 5,
          "productName": "Lentes antirreflejo",
          "quantity": 1,
          "unitPrice": 950,
          "subtotal": 950
        }
      ]
    }
  ],
  "totalCount": 35,
  "totalPages": 2,
  "page": 1,
  "pageSize": 20
}
```

### Estructura de venta (historial)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Identificador (ej. "V1", "V36") |
| date | string | Fecha/hora ISO |
| clientId | string/number | ID del cliente |
| clientName | string | Nombre del cliente |
| status | string | "Pagada" \| "pendiente" \| "cotizacion" \| "Cancelada" |
| total | number | Total de la venta |
| amountPaid | number | Monto pagado hasta la fecha |
| paymentMethod | string | "Efectivo", "Tarjeta", etc. |
| currency | string | "NIO", "USD" |
| items | array | Líneas (productId/productName o serviceId/serviceName, quantity, unitPrice, subtotal) |

Cálculos en frontend:

- **Pendiente** = `total - amountPaid` (cuando status es "pendiente").
- **Pagado** = `amountPaid`.

### PUT `/api/sales-history/:id` – Cancelar venta

**Body:**
```json
{
  "status": "Cancelada"
}
```

- Solo se puede cancelar si la venta **no** está ya cancelada.
- Si la venta fue **real** (Pagada o pendiente), el backend debe **devolver el stock** de los productos de esa venta.
- Las cotizaciones se pueden “cancelar” (cambiar estado) pero no devuelven stock porque nunca se descontó.
- Registrar en actividad, ej.: "Venta cancelada - María García · C$1800".

### PUT `/api/sales-history/:id` – Agregar pago (abono)

**Body:**
```json
{
  "addPayment": 500
}
```

- Solo aplicable a ventas con **status "pendiente"**.
- **addPayment** debe ser > 0.
- Actualizar: `amountPaid = amountPaid + addPayment`.
- Si `amountPaid >= total`, cambiar **status** a **"Pagada"**.
- Registrar en actividad, ej.: "Abono registrado - María García · +C$500".

### Errores esperados (4xx)

- "Venta no encontrada"
- "La venta ya está cancelada"
- "El monto a abonar debe ser mayor a 0"
- "Solo se puede abonar en ventas con estado Pendiente"

---

## 8. Egresos

CRUD de gastos/egresos del negocio.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/expenses` | Listar (paginado, filtros por fecha y categoría) |
| GET | `/api/expenses/:id` | Obtener uno |
| POST | `/api/expenses` | Crear |
| PUT | `/api/expenses/:id` | Actualizar |
| DELETE | `/api/expenses/:id` | Eliminar |

### Query params (GET list)

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| page | number | Página (default 1) |
| pageSize | number | Tamaño de página (default 20) |
| dateFrom | string | Filtro desde fecha "YYYY-MM-DD" |
| dateTo | string | Filtro hasta fecha "YYYY-MM-DD" |
| category | string | Filtro por categoría (ej. "Fijo", "Marketing", "Operativo") |

### Respuesta listado GET `/api/expenses`

```json
{
  "items": [
    {
      "id": "E1",
      "date": "2025-12-02",
      "concept": "Alquiler local",
      "amount": 800,
      "category": "Fijo"
    }
  ],
  "totalCount": 22,
  "totalPages": 2,
  "page": 1,
  "pageSize": 20
}
```

### Estructura de egreso

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string/number | Identificador único |
| date | string | Fecha "YYYY-MM-DD" |
| concept | string | Concepto/descripción |
| amount | number | Monto |
| category | string | Ej. "Fijo", "Marketing", "Operativo" |

### POST `/api/expenses` – Body

```json
{
  "date": "2026-03-12",
  "concept": "Alquiler local",
  "amount": 800,
  "category": "Fijo"
}
```

### PUT `/api/expenses/:id` – Body

Mismos campos; el frontend puede enviar `id` en el body.

---

## 9. Reportes

Endpoints usados por el módulo **Reportes** del frontend (ingresos totales, ventas por día, ventas por mes, productos más vendidos).

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/reports/ingresos-totales` | Resumen ingresos (total, hoy, mes) |
| GET | `/api/reports/ventas-dia` | Ventas en rango de fechas (paginado) |
| GET | `/api/reports/ventas-mes` | Ventas por mes (paginado) |
| GET | `/api/reports/productos-mas-vendidos` | Ranking productos/servicios más vendidos |
| GET | `/api/reports/sales` | Listado ventas (usado en export/otras vistas) |

### GET `/api/reports/ingresos-totales`

**Query:** opcionalmente mismos que otros reportes (el frontend puede no enviar).

**Respuesta (200):**
```json
{
  "totalIncome": 45000,
  "salesToday": 1200,
  "salesMonth": 8500
}
```

- Misma regla de “ingreso real”: solo ventas Pagada + amountPaid de pendientes; excluir cotizaciones y canceladas.

### GET `/api/reports/ventas-dia`

**Query params:**

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| dateFrom | string | "YYYY-MM-DD" |
| dateTo | string | "YYYY-MM-DD" |
| page | number | Página |
| pageSize | number | Tamaño de página |

**Respuesta (200):**
```json
{
  "items": [ ... array de ventas en el rango ... ],
  "totalCount": 50,
  "totalPages": 3,
  "page": 1,
  "pageSize": 20,
  "totalAmount": 25000
}
```

- **totalAmount**: Suma de ingresos reales de las ventas en el rango (misma regla que dashboard).
- **items**: Ventas filtradas por fecha (solo ventas reales o todas según criterio; el frontend muestra lista y totalAmount).

### GET `/api/reports/ventas-mes`

**Query params:** `page`, `pageSize` (opcionales).

**Respuesta (200):** Misma estructura que ventas-dia (items, totalCount, totalPages, page, pageSize, **totalAmount**). Lista de ventas para “ventas por mes”.

### GET `/api/reports/productos-mas-vendidos`

**Respuesta (200):**
```json
[
  { "name": "Fundas para lentes", "quantity": 22 },
  { "name": "Examen visual", "quantity": 10 }
]
```

- Igual que dashboard top-products: productos y servicios por nombre, cantidad vendida (solo ventas reales).

### GET `/api/reports/sales`

**Query:** `page`, `pageSize`, `dateFrom`, `dateTo` (opcionales).

**Respuesta (200):**
```json
{
  "items": [ ... ventas ... ],
  "totalCount": 35,
  "totalPages": 2,
  "page": 1,
  "pageSize": 20,
  "totalAmountInCordobas": 45000
}
```

---

## 10. Configuración

Configuración global de la aplicación (empresa, moneda, tema, etc.). El frontend usa **GET** para cargar y **PUT** para guardar.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/settings` | Obtener configuración |
| PUT | `/api/settings` | Actualizar configuración |

### GET `/api/settings`

**Respuesta (200):**
```json
{
  "companyName": "Mi Óptica",
  "email": "contacto@mioptica.com",
  "phone": "505 8123 4567",
  "address": "Managua, Nicaragua",
  "currency": "NIO",
  "language": "es",
  "exchangeRate": 36.8,
  "theme": "light",
  "soundVolume": 30,
  "alertsFacturasVencidas": true,
  "alertsRecordatorios": false,
  "updatedAt": "2026-03-12T10:00:00.000Z"
}
```

### PUT `/api/settings` – Body

El frontend envía solo los campos que cambian (o todos). Ejemplo:

```json
{
  "companyName": "Mi Óptica",
  "email": "contacto@mioptica.com",
  "phone": "505 8123 4567",
  "address": "Managua, Nicaragua",
  "currency": "NIO",
  "exchangeRate": 36.8,
  "theme": "light",
  "soundVolume": 30,
  "alertsFacturasVencidas": true,
  "alertsRecordatorios": false
}
```

- **exchangeRate**: Tipo de cambio (ej. C$/USD). Usado en ventas para mostrar equivalentes en dólares.
- **theme**: "light" | "dark".
- Respuesta: devolver el objeto de configuración actualizado (200).

### Endpoints relacionados (opcionales)

El frontend también puede usar:

- **GET/PUT** `/api/agency`: datos de la agencia (name, email, phone, address); pueden ser un alias de settings o un recurso separado.
- **GET/PUT** `/api/exchange-rate`: solo `{ "exchangeRate": 36.8 }`; puede ser parte de settings.

Si no se implementan, el frontend puede depender solo de `/api/settings`.

---

## 11. Actividad reciente

La actividad se usa en el **Dashboard** (y opcionalmente en cliente/historial). Puede ser un subconjunto del endpoint de dashboard o un recurso propio.

### Endpoint

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/activity` | Lista de actividad reciente |

**Query opcional:** `limit`, `from` (fecha desde).

**Respuesta (200):** Array como en [Dashboard – recent-activity](#get-apidashboardrecent-activity):

```json
[
  { "id": "A1", "type": "sale", "description": "Venta registrada - María García · C$1,800", "time": "2026-03-10 14:30" },
  { "id": "A2", "type": "client", "description": "Cliente agregado: Roberto Morales", "time": "2026-03-10 11:20" }
]
```

**Tipos (type):** `sale`, `client`, `product`, `inventory`, `service`.

El backend debe registrar actividad cuando:

- Se crea/actualiza un cliente → tipo `client`.
- Se crea/actualiza un producto → tipo `product` o `inventory`.
- Se crea/actualiza un servicio → tipo `service`.
- Se registra venta/cotización, abono o cancelación → tipo `sale`.

---

## 12. Convenciones generales

### Paginación

- Todas las listas paginadas deben devolver:
  - **items**: array de elementos de la página actual.
  - **totalCount**: total de registros que cumplen el filtro.
  - **totalPages**: número total de páginas.
  - **page**: página actual (1-based).
  - **pageSize**: tamaño de página usado.

### Búsqueda y filtros

- **search**: búsqueda por texto (nombre, teléfono, etc.) según el recurso.
- **dateFrom / dateTo**: fechas en formato **YYYY-MM-DD**.
- Parámetros no enviados o vacíos se consideran “sin filtro”.

### Códigos HTTP y errores

- **200**: OK con body JSON (o 204 sin body para DELETE si se prefiere).
- **401**: No autorizado → el frontend limpia token y redirige a login.
- **4xx**: Body con mensaje de error; el frontend muestra `error.message` o `error` si viene en JSON.

### Resumen de ingresos (revenue)

En todo el sistema, “ingreso” o “revenue” debe calcularse así:

- **Venta Pagada**: ingresar `total`.
- **Venta pendiente**: ingresar solo `amountPaid`.
- **Cotización**: no cuenta (0).
- **Venta Cancelada**: no cuenta (0).

Solo las ventas con status **Pagada** o **pendiente** se consideran “ventas reales” para stock (descuento al vender, devolución al cancelar).

### IDs

- **Ventas**: string (ej. "V1", "V36").
- **Egresos**: string o number (ej. "E1").
- **Clientes**: string o number (ej. "1").
- **Productos / Servicios**: number o string según implementación; el frontend compara con `String(id)`.

---

## Resumen de módulos y rutas

| Módulo frontend | Endpoints principales |
|-----------------|------------------------|
| **Login** | POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/me` |
| **Dashboard** | GET `/api/dashboard/summary`, `recent-activity`, `monthly-income`, `top-products`, `alerts` |
| **Inventario** | GET/POST/PUT/DELETE `/api/products` |
| **Ventas** | POST `/api/sales` (venta o cotización) |
| **Servicios** | GET/POST/PUT/DELETE `/api/services` |
| **Clientes** | GET/POST/PUT/DELETE `/api/clients`, GET `/api/clients/:id/history` |
| **Historial** | GET `/api/sales-history`, GET `/api/sales-history/:id`, PUT `/api/sales-history/:id` (cancelar / addPayment) |
| **Egresos** | GET/POST/PUT/DELETE `/api/expenses` |
| **Reportes** | GET `/api/reports/ingresos-totales`, `ventas-dia`, `ventas-mes`, `productos-mas-vendidos`, `sales` |
| **Configuración** | GET/PUT `/api/settings` |
| **Actividad** | GET `/api/activity` (o vía dashboard) |

Con esta especificación el backend puede implementar todos los módulos que el frontend utiliza, sin omitir endpoints ni reglas de negocio.
