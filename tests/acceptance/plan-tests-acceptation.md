# Plan de tests d'acceptation — Diagnostic IA

**URL de prod :** https://ia-diagnostic.vercel.app  
**Navigateurs cibles :** Chrome desktop · Firefox desktop · Chrome mobile (390px)  
**Durée estimée :** ~30 minutes

---

## 1. Page d'accueil — Hero & Navigation

| # | Action | Résultat attendu | OK / KO |
|---|--------|-----------------|---------|
| 1.1 | Charger la page | Titre de page contient "Diagnostic IA", photo de Samiha visible et circulaire | |
| 1.2 | Vérifier le texte hero | Eyebrow, H1, sous-titre et les 3 stats (6 / 3 / 45') sont lisibles | |
| 1.3 | Cliquer "Démarrer le diagnostic" | La page scrolle vers la section wizard | |
| 1.4 | Cliquer "Voir les services" | La page scrolle vers la section services | |
| 1.5 | Cliquer LinkedIn | Nouvel onglet, URL linkedin.com/in/samiha-salhi-kacher | |
| 1.6 | Cliquer "Coach QA · GPT" | Nouvel onglet, URL chatgpt.com | |
| 1.7 | Cliquer "Contact" dans la nav | Le client mail s'ouvre (mailto:) | |
| 1.8 | Passer en vue mobile (390px) | Aucun scroll horizontal, les liens nav disparaissent | |

---

## 2. Wizard — Étape 1 : Profil

| # | Action | Résultat attendu | OK / KO |
|---|--------|-----------------|---------|
| 2.1 | Observer le panel actif | Panel 1 visible, dot "1" actif dans la barre de progression | |
| 2.2 | Saisir "Desjardins" dans Nom | Le champ conserve la valeur | |
| 2.3 | Sélectionner "Assurance" dans Secteur | Dropdown fonctionne | |
| 2.4 | Sélectionner "100–500 personnes" dans Taille | Dropdown fonctionne | |
| 2.5 | Remplir la zone "Note facilitateur" | Le textarea accepte du texte | |
| 2.6 | Cliquer "Suivant →" | Passage au panel 2, dot "1" passe en vert ✓ | |

---

## 3. Wizard — Étape 2 : Rôles

| # | Action | Résultat attendu | OK / KO |
|---|--------|-----------------|---------|
| 3.1 | Observer le panel | 4 cartes de rôles visibles (Dev, QA, PM, Lead) | |
| 3.2 | Déplacer le slider "Dev" vers 5 | La valeur affichée passe à 5 en temps réel | |
| 3.3 | Déplacer le slider "QA" vers 4 | La valeur affichée passe à 4 en temps réel | |
| 3.4 | Cliquer "Suivant →" | Passage au panel 3 | |
| 3.5 | Cliquer "← Retour" depuis le panel 3 | Retour au panel 2, valeurs des sliders conservées | |
| 3.6 | Cliquer "Suivant →" à nouveau | Repasse au panel 3 | |

---

## 4. Wizard — Étape 3 : SDLC

| # | Action | Résultat attendu | OK / KO |
|---|--------|-----------------|---------|
| 4.1 | Observer le tableau | 6 lignes de pratiques (CI/CD, Code review, BDD, Doc, Planning, Monitoring) | |
| 4.2 | Cliquer "Optimisé" sur CI/CD | La pill "Optimisé" se colore, les autres se déselectionne | |
| 4.3 | Cliquer "Intégré" sur Tests BDD | Une seule pill sélectionnée par ligne | |
| 4.4 | Cliquer "Partiel" puis "Absent" sur la même ligne | Seul "Absent" reste sélectionné | |
| 4.5 | Cliquer "Suivant →" | Passage au panel 4 | |

---

## 5. Wizard — Étape 4 : Gouvernance

| # | Action | Résultat attendu | OK / KO |
|---|--------|-----------------|---------|
| 5.1 | Observer le panel | 4 cartes de gouvernance avec toggles | |
| 5.2 | Activer un toggle (ex. Politique IA) | Le toggle passe à l'état coché | |
| 5.3 | Désactiver le même toggle | Le toggle repasse à l'état décoché | |
| 5.4 | Vérifier le bouton "Générer" | Bouton visible et actif | |
| 5.5 | Tester retour complet 4 → 1 via "← Retour" | Chaque panel s'affiche correctement jusqu'au panel 1 | |

---

## 6. Génération du plan IA

| # | Action | Résultat attendu | OK / KO |
|---|--------|-----------------|---------|
| 6.1 | Remplir les 4 étapes avec des données réalistes | Toutes les étapes complétées | |
| 6.2 | Cliquer "Générer le plan" | Spinner ou état de chargement visible | |
| 6.3 | Attendre la réponse (10–30 s) | Section résultats apparaît avec les 3 scores (pas "—") | |
| 6.4 | Vérifier les actions H1 (0–3 mois) | Au moins 1 action avec Rôle, Action, Impact renseignés | |
| 6.5 | Vérifier l'absence de balises HTML dans les actions | Aucun `<script>`, `<div>` etc. visible dans le texte | |
| 6.6 | Cliquer onglet "3 – 12 mois" | Onglet H2 devient actif, liste H2 s'affiche | |
| 6.7 | Cliquer onglet "12 mois +" | Onglet H3 devient actif | |
| 6.8 | Cliquer "Nouveau diagnostic" | Wizard revient à l'étape 1, section résultats masquée | |

---

## 7. Section Services

| # | Action | Résultat attendu | OK / KO |
|---|--------|-----------------|---------|
| 7.1 | Scroller jusqu'à la section services | 6 cartes de services visibles | |
| 7.2 | Vérifier les prix | Chaque carte affiche "300 $" | |

---

## 8. API — Vérifications rapides (onglet Réseau ou curl)

| # | Requête | Résultat attendu | OK / KO |
|---|---------|-----------------|---------|
| 8.1 | `GET /api/diagnose` | Statut **405**, body JSON `{ "error": "..." }` | |
| 8.2 | `POST /api/diagnose` avec corps vide | Statut **400**, body JSON avec `error` | |
| 8.3 | `GET /page-qui-nexiste-pas` | Statut **200**, retourne index.html (SPA fallback) | |

---

## 9. Responsive mobile (390px)

Ouvrir Chrome DevTools → basculer en vue Pixel 5 (390 × 844).

| # | Vérification | Résultat attendu | OK / KO |
|---|-------------|-----------------|---------|
| 9.1 | Scroll horizontal sur la page d'accueil | **Aucun** scroll horizontal (barre de défilement absente) | |
| 9.2 | Photo de profil | Visible, circulaire, ≥ 80px | |
| 9.3 | Boutons LinkedIn et GPT | Tappables, hauteur ≥ 36px | |
| 9.4 | Navigation | Liens nav masqués, logo seul visible | |
| 9.5 | Wizard étape 1 | Formulaire accessible, bouton "Suivant" visible et cliquable | |
| 9.6 | Footer | Nom, ville et email visibles en bas de page | |

---

## 10. Accessibilité de base

| # | Vérification | Résultat attendu | OK / KO |
|---|-------------|-----------------|---------|
| 10.1 | Inspecter toutes les `<img>` | Chaque image a un attribut `alt` non vide | |
| 10.2 | Inspecter les liens `target="_blank"` | Chaque lien externe a `rel="noopener"` | |

---

## Bugs connus

| Bug | Environnement | Statut |
|-----|--------------|--------|
| Scroll horizontal sur mobile (service-cards débordent) | Production (main) | Fix prêt sur `develop`, non déployé |

---

## Notes

- **Test 6.3** : si la clé Anthropic n'est pas configurée en prod, l'API retourne 500 — les scores resteront à "—". C'est un problème de configuration, pas un bug applicatif.
- **Test 9.1** : connu KO en production actuelle. À re-tester après le prochain déploiement de `develop` → `main`.
