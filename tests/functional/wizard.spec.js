import { test, expect } from '@playwright/test';

test.describe('Wizard de diagnostic — 4 étapes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#diagnostic');
    await page.waitForSelector('#panel-1.active');
  });

  // ── ÉTAPE 1 : Profil ───────────────────────────────────────────────

  test('Étape 1 — tous les champs de profil sont présents', async ({ page }) => {
    await expect(page.locator('#org-name')).toBeVisible();
    await expect(page.locator('#sector')).toBeVisible();
    await expect(page.locator('#team-size')).toBeVisible();
    await expect(page.locator('#methodology')).toBeVisible();
    await expect(page.locator('#tools')).toBeVisible();
    await expect(page.locator('#budget')).toBeVisible();
  });

  test('Étape 1 — saisie dans les champs texte fonctionne', async ({ page }) => {
    await page.locator('#org-name').fill('Desjardins');
    await expect(page.locator('#org-name')).toHaveValue('Desjardins');

    await page.locator('#tools').fill('GitHub Copilot, ChatGPT');
    await expect(page.locator('#tools')).toHaveValue('GitHub Copilot, ChatGPT');
  });

  test('Étape 1 — sélecteurs dropdown fonctionnent', async ({ page }) => {
    await page.locator('#sector').selectOption('Banque / Finance');
    await expect(page.locator('#sector')).toHaveValue('Banque / Finance');

    await page.locator('#team-size').selectOption('100–500 personnes');
    await expect(page.locator('#team-size')).toHaveValue('100–500 personnes');
  });

  test('Étape 1 — zone note facilitateur accepte du texte', async ({ page }) => {
    await page.locator('#note-profil').fill('Contexte sensible : données bancaires.');
    await expect(page.locator('#note-profil')).toHaveValue('Contexte sensible : données bancaires.');
  });

  // ── NAVIGATION 1 → 2 ─────────────────────────────────────────────

  test('Navigation Étape 1 → 2 via bouton "Suivant"', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    await expect(page.locator('#panel-2')).toBeVisible();
    await expect(page.locator('#panel-1')).not.toBeVisible();
    await expect(page.locator('.wp-step[data-step="1"]')).toHaveClass(/done/);
    await expect(page.locator('.wp-step[data-step="2"]')).toHaveClass(/active/);
  });

  // ── ÉTAPE 2 : Rôles ───────────────────────────────────────────────

  test('Étape 2 — 4 cartes de rôles sont présentes', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    const cards = page.locator('#panel-2 .role-card');
    await expect(cards).toHaveCount(4);
  });

  test('Étape 2 — slider Dev met à jour la valeur affichée', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    const slider = page.locator('#s-dev-1');
    const display = page.locator('#v-dev-1');
    await slider.fill('5');
    await slider.dispatchEvent('input');
    await expect(display).toHaveText('5');
  });

  test('Étape 2 — slider QA met à jour la valeur affichée', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    const slider = page.locator('#s-qa-2');
    const display = page.locator('#v-qa-2');
    await slider.fill('4');
    await slider.dispatchEvent('input');
    await expect(display).toHaveText('4');
  });

  // ── NAVIGATION 2 → 3 ─────────────────────────────────────────────

  test('Navigation Étape 2 → 3 et retour 3 → 2', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    await page.locator('#panel-2 .btn-primary').click();
    await expect(page.locator('#panel-3')).toBeVisible();

    await page.locator('#panel-3 .btn-ghost').first().click();
    await expect(page.locator('#panel-2')).toBeVisible();
  });

  // ── ÉTAPE 3 : SDLC ───────────────────────────────────────────────

  test('Étape 3 — 6 pratiques SDLC sont listées', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    await page.locator('#panel-2 .btn-primary').click();
    const rows = page.locator('.sdlc-table tbody tr');
    await expect(rows).toHaveCount(6);
  });

  test('Étape 3 — radio pill "Optimisé" est sélectionnable', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    await page.locator('#panel-2 .btn-primary').click();

    const optimise = page.locator('.radio-group[data-name="cicd"] .radio-pill', { hasText: 'Optimisé' });
    await optimise.click();
    await expect(optimise).toHaveClass(/selected/);

    const partiel = page.locator('.radio-group[data-name="cicd"] .radio-pill', { hasText: 'Partiel' });
    await expect(partiel).not.toHaveClass(/selected/);
  });

  test('Étape 3 — un seul pill sélectionnable par ligne', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    await page.locator('#panel-2 .btn-primary').click();

    const group = page.locator('.radio-group[data-name="bdd"]');
    await group.locator('.radio-pill', { hasText: 'Intégré' }).click();
    const selected = await group.locator('.radio-pill.selected').count();
    expect(selected).toBe(1);
  });

  // ── NAVIGATION 3 → 4 ─────────────────────────────────────────────

  test('Navigation Étape 3 → 4', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    await page.locator('#panel-2 .btn-primary').click();
    await page.locator('#panel-3 .btn-primary').click();
    await expect(page.locator('#panel-4')).toBeVisible();
    await expect(page.locator('.wp-step[data-step="4"]')).toHaveClass(/active/);
  });

  // ── ÉTAPE 4 : Gouvernance ─────────────────────────────────────────

  test('Étape 4 — 4 cartes de gouvernance sont présentes', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    await page.locator('#panel-2 .btn-primary').click();
    await page.locator('#panel-3 .btn-primary').click();
    const cards = page.locator('#panel-4 .gov-card');
    await expect(cards).toHaveCount(4);
  });

  test('Étape 4 — toggle fonctionne (coche / décoche)', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    await page.locator('#panel-2 .btn-primary').click();
    await page.locator('#panel-3 .btn-primary').click();

    const checkbox = page.locator('#g-policy');
    const toggleLabel = page.locator('label.toggle:has(#g-policy)');
    const initial = await checkbox.isChecked();
    await toggleLabel.click();
    expect(await checkbox.isChecked()).toBe(!initial);
    await toggleLabel.click();
    expect(await checkbox.isChecked()).toBe(initial);
  });

  test('Étape 4 — bouton "Générer" est visible', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    await page.locator('#panel-2 .btn-primary').click();
    await page.locator('#panel-3 .btn-primary').click();
    await expect(page.locator('#btn-gen')).toBeVisible();
    await expect(page.locator('#btn-gen')).toBeEnabled();
  });

  // ── RETOUR COMPLET 4 → 1 ─────────────────────────────────────────

  test('Navigation retour complète : Étape 4 → 1', async ({ page }) => {
    await page.locator('#panel-1 .btn-primary').click();
    await page.locator('#panel-2 .btn-primary').click();
    await page.locator('#panel-3 .btn-primary').click();

    await page.locator('#panel-4 .btn-ghost').first().click();
    await expect(page.locator('#panel-3')).toBeVisible();

    await page.locator('#panel-3 .btn-ghost').first().click();
    await expect(page.locator('#panel-2')).toBeVisible();

    await page.locator('#panel-2 .btn-ghost').first().click();
    await expect(page.locator('#panel-1')).toBeVisible();
  });

  // ── GÉNÉRATION DU PLAN (mode démo) ───────────────────────────────

  test('Génération du plan en mode démo — résultats affichés', async ({ page }) => {
    test.setTimeout(40_000);

    await page.locator('#org-name').fill('Intact Financial');
    await page.locator('#sector').selectOption('Assurance');

    await page.locator('#panel-1 .btn-primary').click();
    await page.locator('#panel-2 .btn-primary').click();
    await page.locator('#panel-3 .btn-primary').click();

    await page.locator('#btn-gen').click();

    await expect(page.locator('#results')).toHaveClass(/visible/, { timeout: 30_000 });
    await expect(page.locator('#score-roles')).not.toHaveText('—');
    await expect(page.locator('#score-sdlc')).not.toHaveText('—');
    await expect(page.locator('#score-gov')).not.toHaveText('—');
    await expect(page.locator('#actions-h1')).not.toBeEmpty();
  });

  test('Onglets horizons temporels (H1 / H2 / H3) fonctionnent', async ({ page }) => {
    test.setTimeout(40_000);

    await page.locator('#panel-1 .btn-primary').click();
    await page.locator('#panel-2 .btn-primary').click();
    await page.locator('#panel-3 .btn-primary').click();
    await page.locator('#btn-gen').click();

    await expect(page.locator('#results')).toHaveClass(/visible/, { timeout: 30_000 });

    // H2
    await page.locator('.h-tab', { hasText: '3 – 12' }).click();
    await expect(page.locator('#actions-h2')).toHaveClass(/active/);
    await expect(page.locator('#actions-h1')).not.toHaveClass(/active/);

    // H3
    await page.locator('.h-tab', { hasText: '12 mois +' }).click();
    await expect(page.locator('#actions-h3')).toHaveClass(/active/);
  });

  test('"Nouveau diagnostic" remet le wizard à l\'étape 1', async ({ page }) => {
    test.setTimeout(40_000);

    await page.locator('#panel-1 .btn-primary').click();
    await page.locator('#panel-2 .btn-primary').click();
    await page.locator('#panel-3 .btn-primary').click();
    await page.locator('#btn-gen').click();

    await expect(page.locator('#results')).toHaveClass(/visible/, { timeout: 30_000 });

    await page.locator('button', { hasText: 'Nouveau diagnostic' }).click();
    await expect(page.locator('#results')).not.toHaveClass(/visible/);
    await expect(page.locator('#panel-1')).toBeVisible();
  });
});
