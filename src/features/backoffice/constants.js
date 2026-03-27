import { BarChart3, ClipboardList, Home, Package, Settings, ShieldUser, SquareTerminal, Table, UtensilsCrossed } from "lucide-react";

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "orders", label: "Pedidos", icon: ClipboardList },
  { id: "tables", label: "Mesas", icon: Table },
  { id: "products", label: "Productos", icon: Package },
  { id: "kitchen", label: "Cocina", icon: UtensilsCrossed },
  { id: "cashier", label: "Caja", icon: SquareTerminal },
  { id: "users", label: "Usuarios", icon: ShieldUser },
  { id: "settings", label: "Configuraciones", icon: Settings },
  { id: "reports", label: "Reportes", icon: BarChart3 },
];
