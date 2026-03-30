export function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export async function clickByText(page, text, force = false) {
  const matcher = new RegExp(text, "i");
  const button = page.getByRole("button", { name: matcher }).first();
  if ((await button.count()) > 0) {
    await button.click(force ? { force: true } : undefined);
    return true;
  }
  const link = page.getByRole("link", { name: matcher }).first();
  if ((await link.count()) > 0) {
    await link.click(force ? { force: true } : undefined);
    return true;
  }
  return false;
}

export async function login(page, username, password) {
  for (let i = 0; i < 20; i += 1) {
    const body = normalizeText(await page.textContent("body").catch(() => ""));
    if (body.includes("panel administrativo") || body.includes("dashboard")) {
      return;
    }
    const hasPassword = (await page.locator('input[type="password"]').count()) > 0;
    if (hasPassword) break;
    await page.waitForTimeout(250);
  }

  const userCandidates = [
    page.getByPlaceholder(/usuario|username|correo|email/i).first(),
    page.locator('input[name*="user" i], input[name*="usuario" i], input[name*="email" i]').first(),
    page.locator('input[type="text"], input[type="email"], input:not([type])').first(),
  ];
  const passCandidates = [
    page.getByPlaceholder(/contrasena|contraseña|password/i).first(),
    page.locator('input[name*="pass" i], input[name*="contras" i], input[type="password"]').first(),
    page.locator('input[type="password"]').first(),
  ];

  let userInput = null;
  for (const c of userCandidates) {
    if ((await c.count()) > 0) {
      userInput = c;
      break;
    }
  }
  let passInput = null;
  for (const c of passCandidates) {
    if ((await c.count()) > 0) {
      passInput = c;
      break;
    }
  }
  if (!userInput || !passInput) {
    const body = normalizeText(await page.textContent("body").catch(() => ""));
    if (body.includes("panel administrativo") || body.includes("dashboard")) return;
    throw new Error("No se encontraron campos de login");
  }

  await userInput.fill(username);
  await passInput.fill(password);

  const clicked =
    (await clickByText(page, "Iniciar sesion")) ||
    (await clickByText(page, "Iniciar sesión")) ||
    (await clickByText(page, "Entrar")) ||
    (await clickByText(page, "Login"));
  if (!clicked) await passInput.press("Enter");
  await page.waitForTimeout(1200);
}

export async function openModule(page, moduleName) {
  const clicked = await clickByText(page, moduleName, true);
  if (clicked) await page.waitForTimeout(500);
  return clicked;
}

export function attachPageErrorCollectors(page, errors) {
  page.on("pageerror", (err) => {
    errors.push(`pageerror:${err.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console:${msg.text()}`);
  });
}

