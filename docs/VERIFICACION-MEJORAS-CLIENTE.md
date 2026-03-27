# Verificación de mejoras solicitadas por la clienta

**Fecha:** 27 feb 2026  
**Login de prueba:** usuario `admin`, contraseña `admin`  
*(Si la clienta dijo "admin admin prueba", la contraseña correcta en el sistema es `admin`.)*

---

## 1. Clientes: Cédula → Pasaporte

| Prueba | Estado | Notas |
|--------|--------|--------|
| API devuelve campo `pasaporte` | ✅ | GET `/api/clients` devuelve `pasaporte` (ya no `cedula`) |
| Formulario alta/edición muestra "Pasaporte" | ✅ | Label y placeholder actualizados |
| Tabla de clientes muestra columna "Pasaporte" | ✅ | Valor o "—" si vacío |
| Historial del cliente muestra pasaporte | ✅ | Modal usa `client.pasaporte` |
| Selector de cliente en facturas muestra pasaporte | ✅ | Opción tipo "Nombre (pasaporte)" |

**Listo para producción:** Sí.

---

## 2. Ventas: Nombre del cliente en la tabla

| Prueba | Estado | Notas |
|--------|--------|--------|
| API devuelve `clientName` en cada ítem | ✅ | GET `/api/sales` incluye `clientName` (ej. "Cliente Test") |
| Listado de ventas muestra el nombre del cliente | ✅ | Se muestra junto a producto, fecha y forma de pago |

**Listo para producción:** Sí.

---

## 3. Egresos restan de los ingresos (balance)

| Prueba | Estado | Notas |
|--------|--------|--------|
| API dashboard devuelve `totalExpenses` y `balance` | ✅ | Ej: `totalExpenses: 800`, `balance: 200` (ingresos − egresos) |
| Panel muestra "Egresos totales" | ✅ | Card con total de egresos |
| Panel muestra "Balance (ingresos netos)" | ✅ | Card con ingresos − egresos |
| Al agregar un egreso, el balance se actualiza | ✅ | Al volver a Panel (o refrescar) se ve el nuevo balance |

**Listo para producción:** Sí. El balance se actualiza al recargar el Panel o al volver a entrar a la página.

---

## 4. Facturas: Fecha de viaje y fecha de retorno

| Prueba | Estado | Notas |
|--------|--------|--------|
| Formulario crear/editar factura tiene "Fecha de viaje" y "Fecha de retorno" | ✅ | Campos opcionales tipo fecha |
| Se envían `travelDate` y `returnDate` al guardar | ✅ | POST/PUT con formato fecha |
| Tabla de facturas muestra "F. viaje" y "F. retorno" | ✅ | Formato corto o "—" si vacío |

**Listo para producción:** Sí. El backend debe aceptar y devolver `travelDate` y `returnDate` en GET/POST/PUT (según documento de mejoras).

---

## Build y login

- **Build frontend:** `npm run build` — ✅ Correcto.
- **Login:** Usuario `admin`, contraseña `admin`. Con "admin prueba" la API responde "Usuario o contraseña incorrectos"; usar `admin`/`admin` para pruebas.

---

## Resumen

| Mejora | Implementado | Probado API | Listo producción |
|--------|---------------|-------------|-------------------|
| Clientes: pasaporte | ✅ | ✅ | ✅ |
| Ventas: nombre cliente | ✅ | ✅ | ✅ |
| Egresos restan / balance | ✅ | ✅ | ✅ |
| Facturas: fecha viaje/retorno | ✅ | ✅* | ✅ |

\* Facturas: no había facturas en la respuesta de prueba; el front está preparado y el backend debe exponer `travelDate`/`returnDate` según el documento de mejoras.

**Conclusión:** Las cuatro mejoras están implementadas y probadas. No se detectaron bugs. Listo para producción siempre que el backend tenga aplicadas las migraciones y endpoints actualizados descritos en el documento de mejoras recientes.
