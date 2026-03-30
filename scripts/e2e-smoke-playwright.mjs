import { chromium } from "playwright";
import {
  attachPageErrorCollectors,
  clickByText,
  login,
  normalizeText,
} from "./playwright-helpers.mjs";

const baseUrl = "http://localhost:5173";
const report = {
  login: { ok: false, detail: "" },
  menu: { ok: false, detail: "" },
  createMesero: { ok: false, detail: "" },
  modules: {},
  deliveryDetail: { ok: false, detail: "" },
  createdUser: null,
  errors: [],
};

const moduleNames = [
  "Dashboard",
  "Pedidos",
  "Mesas",
  "Delivery",
  "Productos",
  "Proveedores",
  "Cocina",
  "Caja",
  "Usuarios",
  "Configuraciones",
  "Reportes",
];

async function safeStep(name, fn) {
  try {
    await fn();
  } catch (e) {
    report.errors.push(`${name}: ${e.message}`);
  }
}

async function dismissOverlays(page) {
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press("Escape").catch(() => {});
    const closeBtn = page.getByRole("button", { name: /cerrar|cancelar|close|x/i }).first();
    if ((await closeBtn.count()) > 0) await closeBtn.click().catch(() => {});
    await page.waitForTimeout(250);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

attachPageErrorCollectors(page, report.errors);

await safeStep("goto", async () => {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
});

await safeStep("login", async () => {
  await login(page, "admin", "admin");

  const content = normalizeText(await page.textContent("body"));
  const ok = content.includes("panel administrativo") || content.includes("dashboard");
  report.login.ok = ok;
  report.login.detail = ok ? "Login exitoso con admin/admin" : "No se detecto dashboard tras login";
});

await safeStep("menu", async () => {
  const content = normalizeText(await page.textContent("body"));
  const missing = moduleNames.filter((m) => !content.includes(normalizeText(m)));
  report.menu.ok = missing.length === 0;
  report.menu.detail = missing.length === 0 ? "Menu completo visible" : `Faltan: ${missing.join(", ")}`;
});

await safeStep("create mesero", async () => {
  await clickByText(page, "Usuarios");
  await page.waitForTimeout(800);

  const nuevo =
    page.getByRole("button", { name: /nuevo usuario|nuevo|crear/i }).first();
  if ((await nuevo.count()) > 0) await nuevo.click();
  await page.waitForTimeout(600);

  const username = `mesero_test_${Date.now().toString().slice(-6)}`;
  report.createdUser = username;

  const userField = page.locator('input[name*="usuario" i], input[name*="username" i], input[name*="user" i]').first();
  const nameField = page.locator('input[name*="nombre" i]').first();
  const passField = page.locator('input[type="password"]').first();

  if ((await userField.count()) > 0) await userField.fill(username);
  if ((await nameField.count()) > 0) await nameField.fill("Mesero Test");
  if ((await passField.count()) > 0) await passField.fill("123456");

  const roleSelect = page.locator('select[name*="rol" i], select[name*="role" i]').first();
  if ((await roleSelect.count()) > 0) await roleSelect.selectOption({ label: /mesero/i }).catch(() => {});

  const guardar = page.getByRole("button", { name: /guardar|crear/i }).first();
  if ((await guardar.count()) > 0) await guardar.click();
  await page.waitForTimeout(1000);
  await dismissOverlays(page);

  const body = normalizeText(await page.textContent("body"));
  const found = body.includes(normalizeText(username));
  report.createMesero.ok = found;
  report.createMesero.detail = found ? "Mesero creado y visible en lista" : "No se confirmo visualmente en lista";
});

await safeStep("visit modules", async () => {
  await dismissOverlays(page);
  for (const name of moduleNames) {
    let ok = false;
    let detail = "No se pudo abrir";
    try {
      const clicked = await clickByText(page, name, true);
      if (!clicked) {
        report.modules[name] = { ok: false, detail: "Boton/enlace no encontrado" };
        continue;
      }
      await page.waitForTimeout(700);
      const content = normalizeText(await page.textContent("body"));
      ok = content.length > 100;
      detail = ok ? "Carga visual OK" : "Contenido insuficiente";
    } catch (e) {
      detail = e.message;
    }
    report.modules[name] = { ok, detail };
  }
});

await safeStep("delivery detail", async () => {
  await clickByText(page, "Delivery");
  await page.waitForTimeout(800);

  const eyeBtn = page.locator('button[title*="detalle" i], button:has(svg)').first();
  const hasDetailButton = (await page.getByRole("button", { name: /ver detalle/i }).count()) > 0 || (await page.locator('button[title="Ver detalle"]').count()) > 0;
  if (!hasDetailButton && (await eyeBtn.count()) === 0) {
    report.deliveryDetail.ok = false;
    report.deliveryDetail.detail = "No se encontro accion Ver detalle";
    return;
  }

  const btn = (await page.locator('button[title="Ver detalle"]').count()) > 0
    ? page.locator('button[title="Ver detalle"]').first()
    : eyeBtn;
  await btn.click();
  await page.waitForTimeout(900);
  const content = normalizeText(await page.textContent("body"));
  const ok = content.includes("detalle de pedido");
  report.deliveryDetail.ok = ok;
  report.deliveryDetail.detail = ok ? "Abre vista detalle" : "No abrio vista detalle";
});

await browser.close();
console.log(JSON.stringify(report, null, 2));
