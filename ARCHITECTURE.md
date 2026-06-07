# Architecture applicative — Diagnostic IA · Samiha Salhi-Kacher

> Document de référence pour comprendre, maintenir et modifier l'application.  
> Production : **https://ia-diagnostic.vercel.app**  
> Dépôt : **https://github.com/SalhiSamiha/IA_Diagnostic**

---

## 1. Vue d'ensemble

Application web de **diagnostic de maturité IA** pour équipes TI québécoises. L'utilisateur complète un wizard de 4 étapes, obtient un plan d'actions personnalisé généré par Claude (Anthropic), puis peut interagir avec un chatbot contextuel et exporter les actions H1 vers GitHub Issues.

---

## 2. Stack technologique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Frontend** | HTML + CSS + JavaScript vanilla | SPA statique, pas de framework |
| **Backend** | Node.js ESM (Vercel Serverless) | API REST — 3 fonctions indépendantes |
| **IA** | Claude Haiku 4.5 (Anthropic API) | Génération du plan, chatbot, structuration GitHub |
| **Hébergement** | Vercel | Hosting statique + exécution serverless |
| **CI/CD** | GitHub Actions + Playwright | Tests E2E automatisés à chaque déploiement |
| **Versioning** | Git / GitHub | Branche unique `main` → déploiement auto |

---

## 3. Structure du projet

```
IA_Diagnostic/
│
├── public/                      # Tout ce qui est servi au navigateur
│   ├── index.html               # Application complète (SPA monofichier)
│   ├── Samiha.jpg               # Photo de profil (hero)
│   ├── robots.txt               # Directives crawlers SEO
│   └── sitemap.xml              # Plan du site pour indexation
│
├── api/                         # Fonctions serverless Vercel (Node.js ESM)
│   ├── diagnose.js              # Génère le plan d'actions via Claude
│   ├── chat.js                  # Chatbot contextuel post-diagnostic
│   └── export-github.js         # Crée des issues GitHub depuis le plan H1
│
├── tests/                       # Suite de tests Playwright
│   ├── functional/
│   │   ├── hero.spec.js         # Tests : photo, liens sociaux, nav, stats
│   │   └── wizard.spec.js       # Tests : 4 étapes du diagnostic
│   ├── api/
│   │   └── endpoints.spec.js    # Tests : contrat des 3 endpoints API
│   └── ui/
│       └── responsive.spec.js   # Tests : mobile, tablette, accessibilité
│
├── .github/
│   └── workflows/
│       └── tests.yml            # Pipeline CI GitHub Actions
│
├── playwright.config.js         # Configuration Playwright (browsers, URL, retries)
├── package.json                 # Dépendances (uniquement @playwright/test)
├── package-lock.json            # Verrouillage des versions (requis par npm ci en CI)
├── vercel.json                  # Configuration Vercel : routes, CSP, fonctions
└── ARCHITECTURE.md              # Ce document
```

---

## 4. Architecture applicative

```
┌─────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR                           │
│                                                             │
│  public/index.html  (SPA vanilla — HTML + CSS + JS)        │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │    HERO     │  │  WIZARD  │  │ RÉSULTATS│  │RESSOURC│  │
│  │ Photo,liens │  │ 4 étapes │  │ Scores,  │  │Playlist│  │
│  │ LinkedIn/   │  │ Profil   │  │ Radar,   │  │YouTube │  │
│  │ GPT,YouTube │  │ Rôles    │  │ Plan H1  │  │LinkedIn│  │
│  │             │  │ SDLC     │  │ H2 H3    │  │capsules│  │
│  │             │  │ Gouvern. │  │          │  │        │  │
│  └─────────────┘  └────┬─────┘  └────┬─────┘  └────────┘  │
│                        │ fetch POST  │ fetch POST           │
└────────────────────────┼─────────────┼──────────────────────┘
                         │             │
┌────────────────────────┼─────────────┼──────────────────────┐
│              VERCEL (serverless)      │                      │
│                        │             │                       │
│  ┌─────────────────────▼──┐   ┌──────▼──────────────────┐   │
│  │   api/diagnose.js      │   │   api/chat.js           │   │
│  │   POST /api/diagnose   │   │   POST /api/chat        │   │
│  │                        │   │                         │   │
│  │  1. Valide l'input     │   │  1. Valide le message   │   │
│  │  2. Construit prompt   │   │  2. Injecte le contexte │   │
│  │  3. Appelle Claude API │   │     diagnostic          │   │
│  │  4. Parse la réponse   │   │  3. Appelle Claude API  │   │
│  │  5. Sanitise output    │   │  4. Retourne la réponse │   │
│  │  6. Retourne { plan }  │   │                         │   │
│  └────────────────────────┘   └─────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │   api/export-github.js  — POST /api/export-github     │  │
│  │                                                        │  │
│  │  1. Claude (tool_use) structure les issues GitHub      │  │
│  │     → titre, body markdown, labels par rôle           │  │
│  │  2. GitHub API crée le milestone H1                   │  │
│  │  3. GitHub API crée les labels de couleur             │  │
│  │  4. GitHub API crée les issues                        │  │
│  │  5. Retourne { issues[], milestoneUrl }               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  public/ → servi comme fichiers statiques                    │
└──────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                   SERVICES EXTERNES                          │
│                                                              │
│  ┌──────────────────────┐   ┌──────────────────────────────┐ │
│  │   Anthropic API      │   │   GitHub API                 │ │
│  │   claude-haiku-4-5   │   │   api.github.com             │ │
│  │   ANTHROPIC_API_KEY  │   │   Github_Token + Github_Repo │ │
│  └──────────────────────┘   └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Frontend — `public/index.html`

Fichier unique (~2 700 lignes). Pas de bundler, pas de framework.

### 5.1 Structure HTML (sections)

| Section | ID | Rôle |
|---------|----|------|
| Navigation | `nav` | Logo + liens ancres + responsive mobile |
| Hero | `.hero` | Photo, titre, liens sociaux, stats |
| Diagnostic Wizard | `#diagnostic` | Formulaire 4 étapes |
| Résultats | `#results` | Scores, radar, plan H1/H2/H3 |
| Services | `#services` | Grille des 6 offres |
| Ressources | `#ressources` | Playlist Coach QA + vidéo YouTube |
| Chat | `.chat-fab` + `.chat-panel` | Widget flottant |
| Footer | `footer` | Coordonnées + liens |

### 5.2 JavaScript (état global)

```javascript
// État du diagnostic
const state = {
  step: 1,                    // Étape courante du wizard (1-4)
  scores: { roles, sdlc, gov }, // Scores calculés (0-100)
  plan: { h1, h2, h3 },       // Plan d'actions généré
  rawData: { org, sector, ... } // Données brutes du formulaire
};

// État du chatbot
const chat = {
  open: false,
  history: [],       // Historique multi-tour (max 8 échanges)
  hasDiag: false,    // true après génération du plan
};

// Ressources (playlist + grille)
const PLAYLIST = [ /* 9 épisodes Coach QA & Dev */ ];
const RESOURCES = [ /* Vidéo YouTube + autres */ ];
```

### 5.3 Palette de couleurs (CSS variables)

```css
/* Fonds — forêt profonde */
--bg:  #0d1a0f        /* Fond principal */
--bg2: #111e12        /* Fond sections alternées */
--bg3: #1a2e1c        /* Fond cards, sliders */

/* Accents */
--accent:  #74c491    /* Vert sage — couleur principale */
--gold:    #c8a84b    /* Or ambré — alertes warn */
--earth:   #a07850    /* Brun terre */
--ocean:   #5ba5cc    /* Bleu océan */
--danger:  #e07878    /* Rouge muted */
```

---

## 6. Backend — Fonctions serverless (`api/`)

### 6.1 `POST /api/diagnose`

**Rôle** : Reçoit les données du wizard, appelle Claude, retourne le plan.

```
Input  → { org, sector, teamSize, methodology, tools, budget,
            scores: { roles, sdlc, gov }, noteRoles, noteSdlc, noteGov }

Output → { plan: { h1: [...], h2: [...], h3: [...] } }
         Chaque action : { role, action, impact }
```

**Modèle Claude** : `claude-haiku-4-5-20251001` — appel standard (text completion)  
**Validation** : `sanitizeString()` et `sanitizeNumber()` sur toutes les entrées  
**Erreurs** : 400 (input invalide), 401 (clé API), 405 (mauvaise méthode), 502 (Anthropic)

### 6.2 `POST /api/chat`

**Rôle** : Chatbot contextuel — répond aux questions sur le diagnostic.

```
Input  → { message, history: [...], context: { scores, plan, org, ... } }

Output → { reply: "..." }
```

**Particularité** : Le `context` est injecté dans le system prompt — Claude connaît les scores, le plan et l'organisation. Sans contexte (avant diagnostic) : mode assistant généraliste.  
**Historique** : Max 8 échanges (16 messages) pour maîtriser les coûts.

### 6.3 `POST /api/export-github`

**Rôle** : Pattern MCP (tool_use) — Claude structure les actions H1 en issues GitHub.

```
Input  → { data: { org, scores, plan } }

Output → { issues: [{ number, url, title }], milestoneUrl, milestone }
```

**Pattern MCP** : Claude reçoit un schéma d'outil strict (`create_github_issues`) et ne peut répondre qu'en remplissant ce formulaire structuré. L'appel GitHub vient ensuite.  
**GitHub API** : Crée milestone (échéance 3 mois) → labels par rôle → issues.

---

## 7. Flux de données principal

```
Utilisateur remplit le wizard (4 étapes)
        ↓
[Étape 4] Clic "Générer mon plan"
        ↓
Frontend calcule les scores localement (JS pur)
  - Score rôles  : moyenne des sliders (0-5) → %
  - Score SDLC   : niveaux des radio pills → %
  - Score gouv.  : toggles cochés / total → %
        ↓
POST /api/diagnose → Claude → { h1, h2, h3 }
        ↓
Frontend affiche résultats + active le chatbot contextuel
        ↓
[Optionnel] Clic "Créer issues GitHub H1"
        ↓
POST /api/export-github → Claude (tool_use) → GitHub API → issues créées
```

---

## 8. Routing Vercel (`vercel.json`)

Les routes sont évaluées dans l'ordre :

| Priorité | Pattern | Destination |
|----------|---------|-------------|
| 1 | `/api/diagnose` | `api/diagnose.js` |
| 2 | `/api/chat` | `api/chat.js` |
| 3 | `/api/export-github` | `api/export-github.js` |
| 4 | `/*.jpg, *.png, *.css...` | Fichier statique `/$1` |
| 5 | `/*` (catch-all) | `index.html` (SPA fallback) |

**Headers de sécurité** (sur le catch-all) : CSP strict, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy.

---

## 9. Tests et CI/CD

### 9.1 Suite Playwright

```
57 tests au total, 3 couches :

Fonctionnel (tests/functional/)
  hero.spec.js    → 11 tests : photo, liens sociaux, nav, stats, CTAs
  wizard.spec.js  → 18 tests : wizard 4 étapes, génération plan, reset

API (tests/api/)
  endpoints.spec.js → 10 tests : GET /, GET /Samiha.jpg, POST /api/diagnose,
                                  OPTIONS, méthodes invalides, sécurité

UI Responsive (tests/ui/)
  responsive.spec.js → 16 tests : mobile, tablette, accessibilité, overflow
```

### 9.2 Matrice des navigateurs

| Projet | Appareil | Tests |
|--------|---------|-------|
| `api` | Chromium (headless) | API uniquement |
| `chromium` | Desktop Chrome | functional + ui |
| `firefox` | Desktop Firefox | functional + ui |
| `webkit` | Desktop Safari | functional + ui |
| `mobile-chrome` | Pixel 5 — 393×851 | ui uniquement |
| `tablet` | iPad gen 7 — 810×1080 | ui uniquement |

> `mobile-safari` (WebKit) est exclu du CI — trop lent sur Ubuntu (20+ min). Disponible en local via `npm run test:mobile`.

### 9.3 Pipeline GitHub Actions (`tests.yml`)

```
Déclencheur : push/main + deployment_status Vercel + workflow_dispatch

  ┌─────────────────────┐
  │  resolve-url (2s)   │  → BASE_URL = https://ia-diagnostic.vercel.app
  └────────┬────────────┘
           │
     ┌─────┴──────────────────────────────────────┐
     ↓                   ↓                        ↓
┌─────────────┐   ┌────────────┐   ┌─────────────────────┐
│ Fonctionnel │   │ Tests API  │   │ UI Mobile & Tablette │
│ chromium    │   │ (10 min)   │   │ mobile-chrome +      │
│ firefox     │   │            │   │ tablet (15 min)      │
│ webkit      │   │            │   │                      │
│ (15 min)    │   │            │   │                      │
└──────┬──────┘   └─────┬──────┘   └──────────┬──────────┘
       └────────────────┴────────────────────┘
                        ↓
              ┌─────────────────┐
              │ Résumé des tests│
              └─────────────────┘
```

**Artefacts** : Rapports HTML Playwright uploadés (14 jours) — accessibles dans GitHub Actions → run → Artifacts.

---

## 10. Variables d'environnement (Vercel)

| Variable | Valeur | Utilisée par |
|----------|--------|-------------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | `diagnose.js`, `chat.js`, `export-github.js` |
| `Github_Token` | `ghp_...` | `export-github.js` |
| `Github_Repo` | `SalhiSamiha/IA_Diagnostic` | `export-github.js` |

> ⚠️ Ces variables sont configurées dans **Vercel Dashboard → Settings → Environment Variables → Production**. Elles ne sont jamais exposées au navigateur.

---

## 11. SEO & GEO

Le fichier `index.html` contient un bloc `<script type="application/ld+json">` avec :

- **`Person`** : identité Samiha (nom, titre, email, sameAs LinkedIn)
- **`WebApplication`** : description de l'outil (fonctionnalités, auteur, offre gratuite)
- **`ProfessionalService`** : services et tarification
- **`FAQPage`** : 14 questions/réponses (diagnostic IA + 8 épisodes Coach QA & Dev)
- **`ItemList`** : playlist des 9 épisodes structurée pour indexation

---

## 12. Guide de modification

### Ajouter un épisode Coach QA & Dev

Dans `public/index.html`, chercher `const PLAYLIST = [` et ajouter :
```javascript
{ ep: 9, title: 'Titre exact de l\'épisode', desc: 'Description courte.', url: 'https://linkedin.com/...' },
```

Ajouter aussi une entrée dans le `FAQPage` JSON-LD avec une question/réponse sur le thème de l'épisode.

### Modifier la palette de couleurs

Chercher `:root {` dans `index.html` — toutes les couleurs sont des variables CSS. Modifier `--accent`, `--gold`, `--earth`, `--ocean` et `--bg`.

### Ajouter un endpoint API

1. Créer `api/nouveau.js` avec `export default async function handler(req, res) { ... }`
2. Ajouter dans `vercel.json` : `{ "src": "/api/nouveau", "dest": "/api/nouveau.js" }`
3. Ajouter dans `vercel.json` `functions` : `"api/nouveau.js": { "maxDuration": 30 }`
4. Écrire les tests dans `tests/api/endpoints.spec.js`

### Modifier le system prompt du diagnostic

Dans `api/diagnose.js`, chercher `const SYSTEM_PROMPT = ` et modifier le texte.

### Modifier le chatbot

Dans `api/chat.js`, la fonction `buildSystem(ctx)` retourne le system prompt :
- Sans contexte (`!ctx?.scores`) → mode généraliste
- Avec contexte → mode expert avec scores/plan injectés

### Lancer les tests localement

```bash
npm install
npx playwright install --with-deps chromium
npm test                    # tous les tests (Chromium + API)
npm run test:functional     # Desktop seulement (3 browsers)
npm run test:api            # API uniquement
npm run test:mobile         # Mobile + tablette
npm run test:ui             # Interface graphique Playwright
```

> Variable d'environnement : `BASE_URL=https://ia-diagnostic.vercel.app` (définie automatiquement si absente dans `playwright.config.js`)

### Déployer

```bash
git add .
git commit -m "Description du changement"
git push origin main
# → Vercel déploie automatiquement (~1 min)
# → GitHub Actions lance les tests (~5 min)
```

---

## 13. Dépendances externes

| Service | Usage | Auth |
|---------|-------|------|
| **Anthropic API** | Génération plan + chatbot + structuration GitHub issues | `ANTHROPIC_API_KEY` |
| **GitHub API** | Création issues, milestone, labels | `Github_Token` |
| **Google Fonts** | DM Serif Display, DM Mono, Inter | Aucune (CDN public) |
| **YouTube** | Embed iframe de la vidéo | Aucune (embed public) |
| **Vercel** | Hosting + serverless | Connecté au dépôt GitHub |

---

*Document généré le 06/06/2026 — Architecture v1.0*
