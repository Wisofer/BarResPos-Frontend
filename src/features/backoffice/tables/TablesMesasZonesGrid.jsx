import { TablesMesaCard } from "./TablesMesaCard.jsx";

export function TablesMesasZonesGrid({
  zones,
  cajaAbierta,
  isAdmin,
  tableIllustration,
  activeTableMenu,
  setActiveTableMenu,
  onOpenPos,
  onOpenEdit,
  onRequestDelete,
}) {
  if (zones.length === 0) {
    return <p className="text-sm text-slate-500">No hay mesas registradas.</p>;
  }

  return (
    <div className="space-y-4">
      {zones.map((zone) => (
        <div key={zone.name}>
          <div className="mb-2 rounded-md bg-amber-200/70 py-1 text-center text-[11px] font-bold uppercase tracking-widest text-amber-900">
            {zone.name}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {zone.items.map((table) => (
              <TablesMesaCard
                key={table.id}
                table={table}
                cajaAbierta={cajaAbierta}
                isAdmin={isAdmin}
                tableIllustration={tableIllustration}
                activeTableMenu={activeTableMenu}
                setActiveTableMenu={setActiveTableMenu}
                onOpenPos={onOpenPos}
                onOpenEdit={onOpenEdit}
                onRequestDelete={onRequestDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
