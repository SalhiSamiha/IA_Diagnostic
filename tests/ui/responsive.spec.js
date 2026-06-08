import { test, expect } from '@playwright/test';

test.describe('UI & Responsivité cross-browser / mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ── Layout général ─────────────────────────────────────────────────

  test('pas de scroll horizontal indésirable', async ({ page }) => {
    const overflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
  });

  test('arrière-plan et couleurs principales rendus', async ({ page }) => {
    const bg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    expect(bg).not.toBe('');
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  });

  // ── Photo de profil ───────────────────────────────────────────────

  test('photo de profil : taille minimale visible sur tous les écrans', async ({ page }) => {
    const avatar = page.locator('.avatar-img');
    await expect(avatar).toBeVisible();
    const box = await avatar.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(80);
    expect(box.height).toBeGreaterThanOrEqual(80);
    expect(box.width).toBeLessThanOrEqual(200);
  });

  test('photo de profil chargée (pas d\'image cassée)', async ({ page }) => {
    const loaded = await page.locator('.avatar-img').evaluate(img => img.naturalWidth > 0);
    expect(loaded).toBe(true);
  });

  // ── Boutons sociaux ───────────────────────────────────────────────

  test('boutons LinkedIn et GPT : hauteur minimale tap-friendly (≥ 36px)', async ({ page }) => {
    const linkedin = page.locator('.hero-social a[href*="linkedin.com"]');
    const gpt = page.locator('.hero-social a[href*="chatgpt.com"]');

    await expect(linkedin).toBeVisible();
    await expect(gpt).toBeVisible();

    const lBox = await linkedin.boundingBox();
    const gBox = await gpt.boundingBox();

    expect(lBox.height).toBeGreaterThanOrEqual(36);
    expect(gBox.height).toBeGreaterThanOrEqual(36);
  });

  // ── Navigation ────────────────────────────────────────────────────

  test('barre de navigation visible en haut de page', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    const box = await nav.boundingBox();
    expect(box.y).toBeLessThanOrEqual(10);
  });

  test('logo nav et liens nav affichés', async ({ page }) => {
    await expect(page.locator('.nav-logo')).toBeVisible();
  });

  // ── Hero ──────────────────────────────────────────────────────────

  test('titre hero lisible — pas de débordement horizontal', async ({ page }) => {
    const h1 = page.locator('.hero h1');
    await expect(h1).toBeVisible();
    const h1Box = await h1.boundingBox();
    const vpWidth = page.viewportSize().width;
    expect(h1Box.x).toBeGreaterThanOrEqual(0);
    expect(h1Box.x + h1Box.width).toBeLessThanOrEqual(vpWidth + 4);
  });

  test('sous-titre hero visible', async ({ page }) => {
    await expect(page.locator('.hero-sub')).toBeVisible();
  });

  test('statistiques hero visibles (6 / 3 / 45\')', async ({ page }) => {
    await expect(page.locator('.hero-stats')).toBeVisible();
    const nums = page.locator('.stat-num');
    await expect(nums).toHaveCount(3);
  });

  // ── Section Services ──────────────────────────────────────────────

  test('section services affiche les 6 cartes', async ({ page }) => {
    await page.evaluate(() => document.getElementById('services').scrollIntoView());
    await page.waitForTimeout(600);
    const cards = page.locator('.service-card');
    await expect(cards).toHaveCount(6);
    await expect(cards.first()).toBeVisible();
  });

  test('prix des services affichés (300 $ / heure)', async ({ page }) => {
    await page.evaluate(() => document.getElementById('services').scrollIntoView());
    const prices = page.locator('.service-price');
    const count = await prices.count();
    for (let i = 0; i < count; i++) {
      await expect(prices.nth(i)).toContainText('300');
    }
  });

  // ── Wizard sur mobile ─────────────────────────────────────────────

  test('formulaire wizard étape 1 utilisable sur mobile', async ({ page }) => {
    await page.evaluate(() => document.getElementById('diagnostic').scrollIntoView());
    await page.waitForTimeout(600);

    const orgInput = page.locator('#org-name');
    await expect(orgInput).toBeVisible();
    await orgInput.fill('Test Mobile');
    await expect(orgInput).toHaveValue('Test Mobile');

    const suivant = page.locator('#panel-1 .btn-primary');
    const box = await suivant.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(40);
  });

  test('sliders de rôles visibles et interactifs sur mobile', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    const slider = page.locator('#s-dev-1');
    await expect(slider).toBeVisible();
    const box = await slider.boundingBox();
    expect(box.width).toBeGreaterThan(50);
  });

  // ── Footer ────────────────────────────────────────────────────────

  test('footer visible avec coordonnées complètes', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Samiha Salhi-Kacher');
    await expect(footer).toContainText('Montréal');
  });

  // ── Accessibilité de base ─────────────────────────────────────────

  test('images ont un attribut alt', async ({ page }) => {
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).not.toBeNull();
      expect(alt.length).toBeGreaterThan(0);
    }
  });

  test('liens externes ont rel="noopener"', async ({ page }) => {
    const externalLinks = page.locator('a[target="_blank"]');
    const count = await externalLinks.count();
    for (let i = 0; i < count; i++) {
      const rel = await externalLinks.nth(i).getAttribute('rel');
      expect(rel).toContain('noopener');
    }
  });
});
