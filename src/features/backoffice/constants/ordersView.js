export const ORDERS_QUICK_STATES = ["", "Pendiente", "Pagado"];
/** Origen: solo salón (mesa) y delivery; el backend puede seguir devolviendo otros tipos en filas puntuales. */
export const ORDERS_TIPO_FILTERS = [
  { value: "", label: "Todos" },
  { value: "mesa", label: "Mesa" },
  { value: "delivery", label: "Delivery" },
];
