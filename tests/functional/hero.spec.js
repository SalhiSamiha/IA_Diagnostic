import { test, expect } from '@playwright/test';

test.describe('Page d\'accueil — Hero & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('titre de page correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Diagnostic.*IA|Samiha Salhi/);
  });

  test('photo de profil visible et chargée', async ({ page }) => {
    const avatar = page.locator('.avatar-img');
    await expect(avatar).toBeVisible();
    const loaded = await avatar.evaluate(img => img.naturalWidth > 0);
    expect(loaded).toBe(true);
  });

  test('photo de profil est circulaire (border-radius appliqué)', async ({ page }) => {
    const radius = await page.locator('.avatar-img').evaluate(img =>
      window.getComputedStyle(img).borderRadius
    );
    expect(radius).toBe('50%');
  });

  test('lien LinkedIn visible avec bon href et target="_blank"', async ({ page }) => {
    const link = page.locator('.hero-social a[href*="linkedin.com"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /samiha-salhi-kacher/);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });

  test('lien Coach QA GPT visible avec bon href et target="_blank"', async ({ page }) => {
    const link = page.locator('.hero-social a[href*="chatgpt.com"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /g-6849784ed24c8191/);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });

  test('les 3 statistiques hero sont affichées (6 / 3 / 45\')', async ({ page }) => {
    const stats = page.locator('.stat-num');
    await expect(stats.nth(0)).toContainText('6');
    await expect(stats.nth(1)).toContainText('3');
    await expect(stats.nth(2)).toContainText("45'");
  });

  test('CTA "Démarrer le diagnostic" scrolle vers la section wizard', async ({ page }) => {
    await page.locator('a.btn-primary', { hasText: 'Démarrer' }).click();
    await page.waitForTimeout(600);
    const section = page.locator('#diagnostic');
    await expect(section).toBeInViewport();
  });

  test('lien "Voir les services" scrolle vers la section services', async ({ page }) => {
    await page.locator('a.btn-ghost', { hasText: 'services' }).click();
    await page.waitForTimeout(600);
    await expect(page.locator('#services')).toBeInViewport();
  });

  test('nav : lien Contact scrolle vers le formulaire de contact', async ({ page }) => {
    const contactLink = page.locator('nav a[href="#contact"]');
    await expect(contactLink).toBeVisible();
    await contactLink.click();
    await expect(page.locator('#contact-form')).toBeVisible();
  });

  test('footer contient LinkedIn, GPT et email', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = page.locator('footer');
    await expect(footer.locator('a[href*="linkedin.com"]')).toBeVisible();
    await expect(footer.locator('a[href*="chatgpt.com"]')).toBeVisible();
    await expect(footer.locator('a[href^="mailto"]')).toBeVisible();
  });
});
