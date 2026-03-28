export function normalizeMesaEstado(status) {
  const s = String(status ?? "Libre").trim();
  const low = s.toLowerCase();
  if (low === "ocupada") return "Ocupada";
  if (low === "reservada") return "Reservada";
  return "Libre";
}

export function mesaEsReservada(table) {
  return normalizeMesaEstado(table?.status) === "Reservada";
}

/** Tarjeta en listado: ocupada (pedido / estado) gana sobre reservada. */
export function mesaEsOcupadaVisual(table) {
  return Boolean(table?.hasActiveOrder);
}

/** Morado sólido reservada (misma idea que rojo ocupada); blanco libre. */
export function mesaCardShellClass(table) {
  if (mesaEsOcupadaVisual(table)) {
    return { shell: "border-red-600 bg-red-600 text-white", onDark: true };
  }
  if (mesaEsReservada(table)) {
    return {
      shell: "border-2 border-violet-800 bg-violet-600 text-white shadow-md",
      onDark: true,
    };
  }
  return { shell: "border-slate-200 bg-white text-slate-900", onDark: false };
}
