import { chromium } from "playwright";
import {
  attachPageErrorCollectors,
  login,
  normalizeText,
  openModule,
} from "./playwright-helpers.mjs";

const baseUrl = "http://localhost:5173";
const adminCreds = { user: "admin", pass: "admin" };
const meseroCreds = { user: "mesero_r2_11152", pass: "123456" };

const modules = ["Dashboard", "Pedidos", "Mesas", "Delivery", "Productos", "Proveedores", "Cocina", "Caja", "Usuarios", "Configuraciones", "Reportes"];

const report = {
  admin: { login: false, menu: {}, deliveryDetail: false, notes: [] },
  mesero: { login: false, menuVisible: [], notes: [] },
  errors: [],
};

const browser = await chromium.launch({ headless: true });
const adminContext = await browser.newContext();
const page = await adminContext.newPage();
attachPageErrorCollectors(page, report.errors);

try {
  // Admin pass
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await login(page, adminCreds.user, adminCreds.pass);
  const body1 = normalizeText(await page.textContent("body"));
  report.admin.login = body1.includes("panel administrativo") || body1.includes("dashboard");

  for (const m of modules) {
    const ok = await openModule(page, m);
    report.admin.menu[m] = ok;
  }

  // Delivery detail check
  if (report.admin.menu.Delivery) {
    await page.waitForTimeout(800);
    const detailBtn =
      (await page.locator('button[title*="detalle" i]').count()) > 0
        ? page.locator('button[title*="detalle" i]').first()
        : page.locator("tbody tr td:last-child button").first();
    if ((await detailBtn.count()) > 0) {
      await detailBtn.click({ force: true }).catch(async () => {
        await openModule(page, "Delivery");
      });
      await page.waitForTimeout(700);
      const b = normalizeText(await page.textContent("body"));
      report.admin.deliveryDetail = b.includes("detalle de pedido");
    } else {
      report.admin.notes.push("No se encontró botón Ver detalle (sin filas o render distinto).");
    }
  }

  // Mesero pass in clean context
  const meseroContext = await browser.newContext();
  const meseroPage = await meseroContext.newPage();
  await meseroPage.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await login(meseroPage, meseroCreds.user, meseroCreds.pass);
  const body2 = normalizeText(await meseroPage.textContent("body"));
  report.mesero.login = body2.includes("panel administrativo") || body2.includes("dashboard");
  
  for (const m of modules) {
    const has = body2.includes(normalizeText(m));
    if (has) report.mesero.menuVisible.push(m);
  }
  await meseroContext.close();
} catch (e) {
  report.errors.push(`fatal:${e.message}`);
}

await adminContext.close();
await browser.close();
console.log(JSON.stringify(report, null, 2));
