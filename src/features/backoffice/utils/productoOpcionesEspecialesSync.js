/** Nombre del grupo que crea el formulario «Opciones especiales» (debe coincidir con lo que espera el catálogo). */
export const OPCIONES_ESPECIALES_GRUPO_NOMBRE = "Opciones especiales";

function normalizeGruposPayload(raw) {
  if (Array.isArray(raw)) return raw;
  return raw?.items ?? raw?.Items ?? [];
}

export function parseOpcionesEspecialesFromGruposApi(gruposRaw) {
  const grupos = normalizeGruposPayload(gruposRaw);
  const key = OPCIONES_ESPECIALES_GRUPO_NOMBRE.toLowerCase();
  const g =
    grupos.find((x) => String(x?.nombre ?? x?.Nombre ?? "").trim().toLowerCase() === key) ||
    (grupos.length === 1 ? grupos[0] : null);
  if (!g) {
    return { grupoId: null, lineas: [""] };
  }
  const gid = g.id ?? g.Id;
  const rawOpts = g.opciones ?? g.Opciones ?? [];
  const lineas = [...rawOpts]
    .filter((o) => o?.activo !== false && o?.Activo !== false)
    .sort((a, b) => Number(a?.orden ?? a?.Orden ?? 0) - Number(b?.orden ?? b?.Orden ?? 0))
    .map((o) => String(o?.nombre ?? o?.Nombre ?? "").trim())
    .filter(Boolean);
  return {
    grupoId: gid != null && gid !== "" ? gid : null,
    lineas: lineas.length > 0 ? lineas : [""],
  };
}

function findGrupoById(gruposRaw, grupoId) {
  const grupos = normalizeGruposPayload(gruposRaw);
  return grupos.find((x) => String(x?.id ?? x?.Id) === String(grupoId)) ?? null;
}

export async function syncOpcionesEspecialesBackend(api, productoId, { habilitado, nombres, grupoIdConocido }) {
  const names = [...new Set(nombres.map((s) => String(s || "").trim()).filter(Boolean))];

  if (!habilitado) {
    if (grupoIdConocido == null || grupoIdConocido === "") return { ok: true, grupoId: null };
    try {
      await api.deleteProductoOpcionGrupo(productoId, grupoIdConocido);
      return { ok: true, grupoId: null };
    } catch (e) {
      if (e?.status === 404) return { ok: true, grupoId: null };
      if (e?.status === 409) {
        try {
          await api.updateProductoOpcionGrupo(productoId, grupoIdConocido, {
            nombre: OPCIONES_ESPECIALES_GRUPO_NOMBRE,
            activo: false,
          });
          return { ok: true, grupoId: grupoIdConocido };
        } catch (e2) {
          return { ok: false, error: e2?.message || e?.message || "No se pudieron desactivar las opciones." };
        }
      }
      return { ok: false, error: e?.message || "No se pudo quitar el grupo de opciones." };
    }
  }

  if (names.length === 0) {
    return { ok: false, error: "Agrega al menos una opción o desactiva «Opciones especiales»." };
  }

  try {
    let gid = grupoIdConocido;
    const grupoBody = {
      nombre: OPCIONES_ESPECIALES_GRUPO_NOMBRE,
      orden: 0,
      obligatorio: true,
      minSeleccion: 1,
      maxSeleccion: 1,
      activo: true,
    };

    if (gid == null || gid === "") {
      const created = await api.createProductoOpcionGrupo(productoId, grupoBody);
      gid = created?.id ?? created?.Id;
    } else {
      await api.updateProductoOpcionGrupo(productoId, gid, grupoBody);
    }

    if (gid == null || gid === "") {
      return { ok: false, error: "No se obtuvo el id del grupo de opciones en el servidor." };
    }

    const listado = await api.listProductoOpcionesGrupos(productoId);
    const g = findGrupoById(listado, gid);
    const existing = g ? g.opciones ?? g.Opciones ?? [] : [];
    for (const op of existing) {
      const oid = op?.id ?? op?.Id;
      if (oid == null) continue;
      try {
        await api.deleteProductoOpcionItem(productoId, gid, oid);
      } catch {
        /* continuar */
      }
    }

    let orden = 1;
    for (const nombre of names) {
      await api.createProductoOpcionItem(productoId, gid, {
        nombre,
        orden: orden++,
        precioAdicional: 0,
        activo: true,
      });
    }

    return { ok: true, grupoId: gid };
  } catch (e) {
    if (e?.status === 404) {
      return { ok: false, skipped: true, error: e?.message || "La API de opciones no está disponible." };
    }
    return { ok: false, error: e?.message || "No se pudieron guardar las opciones especiales." };
  }
}
