# Especificación Backend – Aventours (TripPilot)

Documento para implementar el backend en **.NET** que consumirá el frontend React. La **autenticación ya existe**; aquí se describe todo lo que debe crear o exponer el backend para que el sistema quede completo.

---

## 1. Resumen

- **Stack backend:** .NET (Web API).
- **Autenticación:** Ya implementada por ti; el front envía usuario/contraseña y espera un token (o sesión) para las peticiones subsiguientes.
- **Moneda principal:** Córdobas (NIO). Formato de fechas: ISO o `yyyy-MM-dd`; locale `es-NI`.
- **Relaciones clave:** Clientes son el eje: reservaciones, ventas y facturas se asocian a un **cliente** (por `clientId`).

---

## 2. Clientes (Clients)

### 2.1 Modelo de datos

| Campo       | Tipo   | Requerido | Descripción                                      |
|------------|--------|-----------|--------------------------------------------------|
| Id         | Guid/int | Sí      | Identificador único                              |
| Cedula     | string | No        | Cédula (ej: 001-250185-0001A)                    |
| Name       | string | Sí        | Nombre completo                                  |
| Email      | string | Sí        | Correo electrónico                               |
| Phone      | string | No        | Teléfono (ej: 505 8123 4567)                     |
| Status     | string | Sí        | "Pendiente" \| "Viajó"                           |
| LastTrip   | date?  | No        | Fecha del último viaje (null si nunca ha viajado)|

### 2.2 Endpoints

- **GET** `/api/clients` – Listar todos. Soporte opcional: `?search=texto` (buscar por nombre, cédula, email, teléfono).
- **GET** `/api/clients/{id}` – Obtener uno por Id.
- **POST** `/api/clients` – Crear cliente (body: Cedula, Name, Email, Phone; Status por defecto "Pendiente", LastTrip null).
- **PUT** `/api/clients/{id}` – Actualizar cliente.
- **DELETE** `/api/clients/{id}` – Eliminar (opcional; definir si es soft delete).

### 2.3 Historial del cliente (importante para el front)

Al hacer clic en un cliente, el front abrirá un **modal con todo su historial**. El backend debe exponer:

- **GET** `/api/clients/{id}/history` – Historial completo del cliente.

**Respuesta sugerida (objeto o DTO):**

- **Cliente:** datos actuales (id, cedula, name, email, phone, status, lastTrip).
- **Reservaciones:** lista de reservaciones del cliente (id, destination, startDate, endDate, amount, paymentStatus).
- **Ventas:** lista de ventas (id, date, product, amount, status).
- **Facturas:** lista de facturas (id, date, dueDate, amount, status, concept).
- **Actividad:** lista de eventos recientes relacionados al cliente (tipo: reservación, factura, pago, etc.; descripción; fecha/hora).

Todo ordenado por fecha descendente donde aplique. Así el front puede mostrar en un solo modal: datos del cliente + reservaciones + ventas + facturas + línea de tiempo de actividad.

---

## 3. Reservaciones (Reservations)

### 3.1 Modelo de datos

| Campo          | Tipo     | Requerido | Descripción                          |
|---------------|----------|-----------|--------------------------------------|
| Id            | Guid/int | Sí        | Identificador único                  |
| ClientId      | Guid/int | Sí        | FK al cliente                        |
| ClientName    | string   | Opcional  | Redundante para listados (o derivado)|
| Destination   | string   | Sí        | Destino (ej: París, Roma)            |
| StartDate     | date     | Sí        | Inicio del viaje                    |
| EndDate       | date     | Sí        | Fin del viaje                        |
| Amount        | decimal  | Sí        | Monto en C$                          |
| PaymentStatus | string   | Sí        | "Pagado" \| "Pendiente" \| "Parcial" |

### 3.2 Endpoints

- **GET** `/api/reservations` – Listar. Opcional: filtro por `clientId`, `paymentStatus`, rango de fechas.
- **GET** `/api/reservations/{id}` – Obtener una.
- **POST** `/api/reservations` – Crear (incluir ClientId o ClientName según diseño).
- **PUT** `/api/reservations/{id}` – Actualizar.
- **DELETE** `/api/reservations/{id}` – Eliminar (opcional).

Al crear/actualizar una reservación, conviene registrar un evento en **Actividad** (y actualizar `LastTrip` del cliente si corresponde).

---

## 4. Ventas (Sales)

### 4.1 Modelo de datos

| Campo      | Tipo     | Requerido | Descripción           |
|-----------|----------|-----------|-----------------------|
| Id        | Guid/int | Sí        | Identificador único   |
| ClientId  | Guid/int | Sí        | FK al cliente         |
| ClientName| string   | Opcional  | Para listados         |
| Date      | date     | Sí        | Fecha de la venta     |
| Product   | string   | Sí        | Descripción/producto  |
| Amount    | decimal  | Sí        | Monto en C$           |
| Status    | string   | Sí        | "Completado" \| "Pendiente" |

### 4.2 Endpoints

- **GET** `/api/sales` – Listar. Filtros opcionales: `clientId`, `status`, `dateFrom`, `dateTo`.
- **GET** `/api/sales/{id}` – Obtener una.
- **POST** `/api/sales` – Crear venta (y opcionalmente registrar en actividad/caja).
- **PUT** `/api/sales/{id}` – Actualizar.
- **DELETE** `/api/sales/{id}` – Opcional.

---

## 5. Facturas (Invoices)

### 5.1 Modelo de datos

| Campo      | Tipo     | Requerido | Descripción                                |
|-----------|----------|-----------|--------------------------------------------|
| Id        | string   | Sí        | Código legible (ej: INV-001)              |
| ClientId  | Guid/int | Sí        | FK al cliente                             |
| ClientName| string   | Opcional  | Para listados                              |
| Date      | date     | Sí        | Fecha de emisión                           |
| DueDate   | date     | No        | Fecha de vencimiento                       |
| Amount    | decimal  | Sí        | Monto en C$                                |
| Status    | string   | Sí        | "Pagado" \| "Pendiente" \| "Vencida"       |
| Concept   | string   | No        | Descripción (ej: Paquete París)           |

### 5.2 Endpoints

- **GET** `/api/invoices` – Listar. Filtros opcionales: `clientId`, `status`, `dateFrom`, `dateTo`.
- **GET** `/api/invoices/{id}` – Obtener una (id numérico o código INV-xxx).
- **POST** `/api/invoices` – Crear. Generar código secuencial (INV-001, INV-002…). Opcional: marcar “enviar por WhatsApp” (el front puede solo abrir el enlace; el backend podría guardar un flag o log).
- **PUT** `/api/invoices/{id}` – Actualizar (estado, monto, etc.).
- **DELETE** `/api/invoices/{id}` – Opcional.

Al crear/actualizar factura, registrar evento en **Actividad** (ej: “Factura INV-002 enviada a Carlos López”).

---

## 6. Actividad (Activity / Notificaciones)

Feed de eventos para el dashboard y el panel de notificaciones del app bar.

### 6.1 Modelo de datos

| Campo       | Tipo     | Requerido | Descripción                                      |
|------------|----------|-----------|--------------------------------------------------|
| Id         | Guid/int | Sí        | Identificador único                              |
| Type       | string   | Sí        | "reservation" \| "invoice" \| "payment" \| "client" |
| Description| string   | Sí        | Texto para mostrar (ej: "Nueva reservación de María García - París") |
| Time       | datetime | Sí        | Fecha y hora del evento                          |
| EntityId   | string   | No        | Id de la reservación/factura/etc.                |
| ClientId   | Guid/int?| No        | Cliente relacionado (para historial)             |

### 6.2 Endpoints

- **GET** `/api/activity` – Listar actividad reciente. Parámetros: `limit` (ej: 20), `from` (datetime opcional). Orden: más reciente primero.
- Opcional: **POST** `/api/activity` – Para que otros servicios registren eventos (o hacerlo internamente al crear reservación, factura, pago, cliente).

Las notificaciones del navbar pueden usar el mismo endpoint: últimas N actividades.

---

## 7. Dashboard

El panel principal muestra resumen sin filtros de fecha (o “hoy / mes actual” según criterio).

### 7.1 Endpoints sugeridos

- **GET** `/api/dashboard/summary`  
  Respuesta:
  - `totalRevenue` (decimal) – Suma de ventas (o facturas pagadas, según regla de negocio).
  - `clientsCount` (int).
  - `reservationsCount` (int).
  - `paidReservationsCount` (int) – Reservaciones con PaymentStatus = Pagado.

- **GET** `/api/dashboard/recent-activity`  
  Igual que `/api/activity?limit=10` (o 5–10 ítems).

- **GET** `/api/dashboard/monthly-income`  
  Respuesta: lista de `{ month: "Aug", year: 2025, amount: 4200 }` para los últimos N meses (ej: 7–12). Mes en español o código corto (Jan, Feb…) según lo que use el front.

- **GET** `/api/dashboard/reservations-status`  
  Opcional si el front puede derivarlo: total reservaciones y cuántas pagadas (para el gráfico circular).

---

## 8. Reportes (Reports)

Todos los reportes deben soportar filtro por fechas: **dateFrom** y **dateTo** (opcionales). Si no se envían, devolver según criterio (ej: último año).

### 8.1 Endpoints por tipo de reporte

- **GET** `/api/reports/sales?dateFrom=yyyy-MM-dd&dateTo=yyyy-MM-dd`  
  Lista de ventas en el rango (mismos campos que listar ventas). Total calculable en front o incluir `totalAmount` en la respuesta.

- **GET** `/api/reports/invoices?dateFrom=...&dateTo=...`  
  Lista de facturas en el rango. Opcional: `totalInvoiced`.

- **GET** `/api/reports/reservations?dateFrom=...&dateTo=...`  
  Lista de reservaciones (por fecha de viaje StartDate o por fecha de creación, según regla).

- **GET** `/api/reports/clients`  
  Lista de clientes con estado; puede incluir conteos: “ya viajaron” (status Viajó) y “en espera” (Pendiente). Filtro por fecha opcional (ej: clientes creados en el rango).

- **GET** `/api/reports/income-vs-expenses?dateFrom=...&dateTo=...`  
  Respuesta: `totalIncome` (ventas o ingresos), `totalExpenses` (egresos), `balance`.

- **GET** `/api/reports/expenses?dateFrom=...&dateTo=...`  
  Lista de egresos (ver sección Egresos). Incluir `totalAmount`.

- **GET** `/api/reports/caja?dateFrom=...&dateTo=...`  
  Lista de registros de caja diaria (apertura, ventas, egresos, cierre).

- **GET** `/api/reports/monthly-income?dateFrom=...&dateTo=...`  
  Ingresos agregados por mes (para gráfico de barras).

Implementación en .NET: puede ser un controlador `ReportsController` con una acción por reporte o un único endpoint con query param `type=ventas|facturas|...`.

---

## 9. Egresos (Expenses)

### 9.1 Modelo de datos

| Campo    | Tipo     | Requerido | Descripción                    |
|----------|----------|-----------|--------------------------------|
| Id       | Guid/int | Sí        | Identificador único            |
| Date     | date     | Sí        | Fecha del gasto                |
| Concept  | string   | Sí        | Concepto (ej: Pago proveedor)  |
| Amount   | decimal  | Sí        | Monto en C$                    |
| Category | string   | Sí        | "Operativo" \| "Fijo" \| "Marketing" (o enum) |

### 9.2 Endpoints

- **GET** `/api/expenses` – Listar. Filtros: `dateFrom`, `dateTo`, `category`.
- **GET** `/api/expenses/{id}` – Obtener uno.
- **POST** `/api/expenses` – Crear.
- **PUT** `/api/expenses/{id}` – Actualizar.
- **DELETE** `/api/expenses/{id}` – Opcional.

---

## 10. Caja (Daily cash register)

### 10.1 Modelo de datos

| Campo    | Tipo    | Requerido | Descripción                |
|----------|---------|-----------|----------------------------|
| Date     | date    | Sí        | Fecha del día (único por día si aplica) |
| Opening  | decimal | Sí        | Monto apertura             |
| Sales    | decimal | Sí        | Ventas del día             |
| Expenses | decimal | Sí        | Egresos del día           |
| Closing  | decimal | Sí        | Monto cierre               |

### 10.2 Endpoints

- **GET** `/api/caja?dateFrom=...&dateTo=...` – Listar registros de caja en el rango.
- **GET** `/api/caja/{date}` – Obtener caja de una fecha (ej: `2025-02-20`).
- **POST** `/api/caja` – Crear/registrar caja del día.
- **PUT** `/api/caja/{date}` – Actualizar (ej: al cerrar caja).

---

## 11. Configuración (Settings)

La configuración puede ser por **tenant/agencia** si en el futuro hay varias agencias; por ahora puede ser global (un solo registro).

### 11.1 Modelo de datos (AgencySettings o similar)

| Campo                    | Tipo   | Descripción                                      |
|--------------------------|--------|--------------------------------------------------|
| CompanyName              | string | Nombre de la agencia (login, sidebar)            |
| Email                    | string | Correo de contacto                               |
| Phone                    | string | Teléfono                                         |
| Address                  | string | Dirección (Chinandega, Nicaragua)                |
| Currency                 | string | "NIO" \| "USD"                                   |
| Language                 | string | "es"                                             |
| ExchangeRate             | decimal| Tipo de cambio dólar (ej: 36.8)                  |
| Theme                    | string | "light" \| "dark"                                |
| SoundVolume              | int    | 0–100                                            |
| AlertsReservacionesPendientes | bool | Alertas reservaciones pendientes          |
| AlertsFacturasVencidas   | bool   | Alertas facturas vencidas                        |
| AlertsRecordatorios     | bool   | Recordatorios de viajes próximos                |
| UpdatedAt                | datetime? | Última actualización                          |

### 11.2 Endpoints

- **GET** `/api/settings` – Obtener configuración actual (protegido por rol si aplica).
- **PUT** `/api/settings` – Actualizar configuración (parcial o completo).

El front hoy guarda esto en `localStorage`; al tener backend, puede cargar con GET y persistir con PUT.

---

## 12. Usuarios (Users) – Gestión en Configuración

El front tiene una tabla “Gestión de usuarios” (usuario, nombre completo, rol, estado, Editar).

### 12.1 Modelo (complementario a tu auth)

| Campo          | Tipo   | Descripción              |
|----------------|--------|--------------------------|
| Id             | Guid   | Id del usuario           |
| Usuario        | string | Login (username)         |
| NombreCompleto | string | Nombre a mostrar         |
| Rol            | string | "Administrador" \| "Usuario" |
| Estado         | string | "Activo" \| "Inactivo"   |

### 12.2 Endpoints

- **GET** `/api/users` – Listar usuarios (solo para rol Administrador si aplica).
- **GET** `/api/users/{id}` – Detalle de un usuario.
- **PUT** `/api/users/{id}` – Actualizar (nombre, rol, estado). No exponer contraseña; cambio de contraseña en otro endpoint si lo tienes.

Crear usuario suele ir con tu flujo de registro/auth; aquí solo listar y editar para la pantalla de configuración.

---

## 13. Resumen de entidades a crear en .NET

- **Client** (Clientes)  
- **Reservation** (Reservaciones)  
- **Sale** (Ventas)  
- **Invoice** (Facturas)  
- **Activity** (Actividad / notificaciones)  
- **Expense** (Egresos)  
- **Caja** (Caja diaria)  
- **AgencySettings** (Configuración)  
- **User** (si no lo tienes ya; integrado con tu auth)

Relaciones:

- Reservation, Sale, Invoice → **Client** (ClientId).
- Activity puede tener ClientId y EntityId para enlazar a reservación/factura/etc.

---

## 14. Historial del cliente – Resumen

No olvidar:

- **GET** `/api/clients/{id}/history` que devuelva:
  - Datos del cliente.
  - Lista de reservaciones del cliente.
  - Lista de ventas del cliente.
  - Lista de facturas del cliente.
  - Lista de actividad donde ClientId = id (o relacionada a sus reservaciones/facturas).

El front mostrará todo esto en un **modal** al hacer clic en un cliente (por ejemplo en la tabla de Clientes o desde un nombre en otra pantalla).

---

## 15. CORS y consumo desde el front

- Habilitar CORS para el origen del front (ej: `http://localhost:5173` en desarrollo).
- Las peticiones llevarán el token (o cookie) de autenticación que ya manejas; proteger todos los endpoints excepto login (y quizá salud/version).

---

## 16. Checklist rápido

- [ ] Clientes: CRUD + **GET** `/api/clients/{id}/history`
- [ ] Reservaciones: CRUD
- [ ] Ventas: CRUD + filtros
- [ ] Facturas: CRUD + código INV-xxx
- [ ] Actividad: GET (listar) + registro al crear/actualizar reservación, factura, pago, cliente
- [ ] Dashboard: summary, recent-activity, monthly-income (y opcional reservations-status)
- [ ] Reportes: todos con dateFrom/dateTo (ventas, facturas, reservaciones, clientes, ingresos vs egresos, egresos, caja, ingresos mensuales)
- [ ] Egresos: CRUD
- [ ] Caja: CRUD o GET por rango + POST/PUT por fecha
- [ ] Configuración: GET + PUT
- [ ] Usuarios: GET list + GET one + PUT (editar rol/estado/nombre)
- [ ] CORS y auth en todos los endpoints

Si algo no coincide con tu modelo de negocio (por ejemplo si facturas y ventas son lo mismo), adapta nombres y relaciones; esta especificación está alineada con lo que el frontend ya muestra y espera consumir.
