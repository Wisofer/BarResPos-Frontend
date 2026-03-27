# Mensaje para el frontend: guardar tipo de cambio (C$ = 1 USD)

## Qué debe implementar

En la pantalla de **Configuración** (donde ya se muestra "Tipo de cambio (C$ = … = $1 USD)" y el botón Guardar):

1. **Cargar** el valor actual del tipo de cambio al abrir la pantalla.
2. **Guardar** el valor cuando el usuario pulse Guardar, llamando a la API con el número que tenga el input.

## APIs a usar

**Requerido:** cabecera `Authorization: Bearer <token>` en ambas peticiones.

### 1) Obtener configuración (cargar valor actual)

- **Método y URL:** `GET /api/settings`
- **Respuesta 200:** Objeto con la configuración de la agencia. El tipo de cambio viene en el campo **exchangeRate** (número, ej. 36.8).

Ejemplo de respuesta:

```json
{
  "id": 1,
  "companyName": "Aventours",
  "email": "info@example.com",
  "phone": "",
  "address": "",
  "currency": "NIO",
  "language": "es",
  "exchangeRate": 36.8,
  "theme": "light",
  "soundVolume": 80,
  "alertsReservacionesPendientes": true,
  "alertsFacturasVencidas": true,
  "alertsRecordatorios": true,
  "updatedAt": null
}
```

Al cargar la pantalla, el frontend debe llamar a `GET /api/settings` y rellenar el input del tipo de cambio con `response.exchangeRate`.

### 2) Guardar configuración (guardar tipo de cambio)

- **Método y URL:** `PUT /api/settings`
- **Headers:** `Content-Type: application/json` y `Authorization: Bearer <token>`
- **Body:** Objeto con la configuración. Para que el tipo de cambio se guarde correctamente, hay que enviar **exchangeRate** con el valor que tenga el input.

**Recomendación:** obtener antes la configuración con `GET /api/settings`, cambiar solo **exchangeRate** con el valor del formulario y enviar ese mismo objeto en el PUT. Así no se pisarán otros campos.

Ejemplo de body para guardar solo el tipo de cambio (si el backend acepta envío parcial, se puede enviar solo esto; si no, enviar el objeto completo como arriba):

```json
{
  "id": 1,
  "companyName": "Aventours",
  "currency": "NIO",
  "language": "es",
  "exchangeRate": 36.8,
  "theme": "light",
  "soundVolume": 80,
  "alertsReservacionesPendientes": true,
  "alertsFacturasVencidas": true,
  "alertsRecordatorios": true
}
```

(Sustituir 36.8 por el valor que haya puesto el usuario.)

- **Respuesta 200:** La configuración actualizada (mismo formato que el GET).
- **Respuesta 400:** Si el body es inválido o null.

## Resumen rápido

| Acción              | Método | URL            | Campo relevante   |
|---------------------|--------|----------------|-------------------|
| Cargar tipo cambio  | GET    | /api/settings  | Leer exchangeRate |
| Guardar tipo cambio | PUT    | /api/settings  | Enviar exchangeRate en el body |

**Base URL:** la misma del resto de la API (ej. `https://tu-backend.com` o `http://localhost:5229`). Todas las rutas bajo `/api/settings` requieren autenticación (Bearer token).

Con esto el frontend puede implementar la carga y el guardado del tipo de cambio en la pantalla de configuración.
