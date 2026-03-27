/**
 * Forma de pago – valores de la API y etiquetas para la UI.
 * API acepta: "Cordobas" | "Dolares" | "Transferencia" | "TransferenciaCordobas" | "TransferenciaDolares" | null
 */

import { Landmark, DollarSign, ArrowRightLeft, Banknote } from "lucide-react";

export const PAYMENT_METHOD_API = {
  CORDOBAS: "Cordobas",
  DOLARES: "Dolares",
  TRANSFERENCIA: "Transferencia",
  TRANSFERENCIA_CORDOBAS: "TransferenciaCordobas",
  TRANSFERENCIA_DOLARES: "TransferenciaDolares",
};

const LABELS = {
  [PAYMENT_METHOD_API.CORDOBAS]: "Córdobas",
  [PAYMENT_METHOD_API.DOLARES]: "Dólares",
  [PAYMENT_METHOD_API.TRANSFERENCIA]: "Transferencia (C$)",
  [PAYMENT_METHOD_API.TRANSFERENCIA_CORDOBAS]: "Transferencia (C$)",
  [PAYMENT_METHOD_API.TRANSFERENCIA_DOLARES]: "Transferencia (USD)",
};

/**
 * Opciones para selectores (formularios).
 * value "" = No especificado (enviar null al backend).
 */
export const PAYMENT_METHOD_OPTIONS = [
  { value: PAYMENT_METHOD_API.CORDOBAS, label: "Córdobas (C$)" },
  { value: PAYMENT_METHOD_API.DOLARES, label: "Dólares (USD)" },
  { value: PAYMENT_METHOD_API.TRANSFERENCIA_CORDOBAS, label: "Transferencia (C$)" },
  { value: PAYMENT_METHOD_API.TRANSFERENCIA_DOLARES, label: "Transferencia (USD)" },
  { value: "", label: "No especificado" },
];

/**
 * Opciones para filtros (listados): Todas + cada valor de la API.
 */
export const PAYMENT_METHOD_FILTER_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: PAYMENT_METHOD_API.CORDOBAS, label: "Córdobas" },
  { value: PAYMENT_METHOD_API.DOLARES, label: "Dólares" },
  { value: PAYMENT_METHOD_API.TRANSFERENCIA_CORDOBAS, label: "Transferencia (C$)" },
  { value: PAYMENT_METHOD_API.TRANSFERENCIA_DOLARES, label: "Transferencia (USD)" },
  { value: PAYMENT_METHOD_API.TRANSFERENCIA, label: "Transferencia (legacy)" },
];

/**
 * Opciones para formularios con icono (ventas, reservaciones, facturas).
 */
export const PAYMENT_METHODS_WITH_ICONS = [
  { value: PAYMENT_METHOD_API.CORDOBAS, label: "Córdobas (C$)", icon: Landmark },
  { value: PAYMENT_METHOD_API.DOLARES, label: "Dólares (USD)", icon: DollarSign },
  { value: PAYMENT_METHOD_API.TRANSFERENCIA_CORDOBAS, label: "Transferencia (C$)", icon: ArrowRightLeft },
  { value: PAYMENT_METHOD_API.TRANSFERENCIA_DOLARES, label: "Transferencia (USD)", icon: Banknote },
  { value: "", label: "No especificado", icon: null },
];

/**
 * Devuelve la etiqueta para mostrar en UI o "—" si es null/undefined/vacío.
 * Acepta valor de la API (Cordobas, Dolares, Transferencia, TransferenciaCordobas, TransferenciaDolares).
 */
export function formatPaymentMethod(value) {
  if (value == null || value === "") return "—";
  const normalized =
    value === "Córdobas" || value === "Cordobas"
      ? PAYMENT_METHOD_API.CORDOBAS
      : value === "Dólares" || value === "Dolares"
        ? PAYMENT_METHOD_API.DOLARES
        : value === "TransferenciaCordobas"
          ? PAYMENT_METHOD_API.TRANSFERENCIA_CORDOBAS
          : value === "TransferenciaDolares"
            ? PAYMENT_METHOD_API.TRANSFERENCIA_DOLARES
            : value === "Transferencia"
              ? PAYMENT_METHOD_API.TRANSFERENCIA
              : value;
  return LABELS[normalized] ?? value;
}

/**
 * Valor a enviar al backend: null si está vacío o "No especificado", sino el valor de la API.
 */
export function toPaymentMethodApiValue(value) {
  if (value == null || value === "") return null;
  if (value === "Córdobas") return PAYMENT_METHOD_API.CORDOBAS;
  if (value === "Dólares") return PAYMENT_METHOD_API.DOLARES;
  if (value === "TransferenciaCordobas") return PAYMENT_METHOD_API.TRANSFERENCIA_CORDOBAS;
  if (value === "TransferenciaDolares") return PAYMENT_METHOD_API.TRANSFERENCIA_DOLARES;
  if (value === "Transferencia") return PAYMENT_METHOD_API.TRANSFERENCIA;
  return value;
}

/**
 * Normaliza el valor que viene de la API para usarlo en el formulario (debe coincidir con value de los botones).
 * "Transferencia" (legacy) se mapea a TransferenciaCordobas para mostrar "Transferencia (C$)" en el form.
 */
export function normalizePaymentMethodForForm(apiValue) {
  if (apiValue == null || apiValue === "") return "";
  if (apiValue === "Córdobas" || apiValue === "Cordobas") return PAYMENT_METHOD_API.CORDOBAS;
  if (apiValue === "Dólares" || apiValue === "Dolares") return PAYMENT_METHOD_API.DOLARES;
  if (apiValue === "TransferenciaCordobas") return PAYMENT_METHOD_API.TRANSFERENCIA_CORDOBAS;
  if (apiValue === "TransferenciaDolares") return PAYMENT_METHOD_API.TRANSFERENCIA_DOLARES;
  if (apiValue === "Transferencia") return PAYMENT_METHOD_API.TRANSFERENCIA_CORDOBAS; // legacy → mostrar como Transferencia (C$)
  return "";
}
