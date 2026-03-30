import {
  BarChart3,
  Bike,
  ClipboardList,
  Home,
  Package,
  Settings,
  ShieldUser,
  SquareTerminal,
  Table,
  Truck,
  UtensilsCrossed,
} from "lucide-react";

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "orders", label: "Pedidos", icon: ClipboardList },
  { id: "tables", label: "Mesas", icon: Table },
  { id: "delivery", label: "Delivery", icon: Bike },
  { id: "products", label: "Productos", icon: Package },
  { id: "providers", label: "Proveedores", icon: Truck },
  { id: "kitchen", label: "Cocina", icon: UtensilsCrossed },
  { id: "cashier", label: "Caja", icon: SquareTerminal },
  { id: "users", label: "Usuarios", icon: ShieldUser },
  { id: "settings", label: "Configuraciones", icon: Settings },
  { id: "reports", label: "Reportes", icon: BarChart3 },
];
