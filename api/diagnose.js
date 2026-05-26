/**
 * api/diagnose.js — Vercel Serverless Function
 *
 * Reçoit les données du diagnostic depuis le frontend,
 * appelle l'API Anthropic côté serveur, retourne le plan d'actions.
 *
 * La clé ANTHROPIC_API_KEY est définie dans :
 *   Vercel Dashboard → Project → Settings → Environment Variables
 * Elle n'est jamais exposée au navigateur.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1800;

const SYSTEM_PROMPT = `Tu es Samiha, conseillère principale en IA générative avec une expertise profonde en transformation organisationnelle, SDLC et gouvernance IA. Tu travailles avec des organisations québécoises — institutions financières, assureurs, entreprises technologiques et organismes publics — pour les aider à mesurer et accélérer leur maturité dans l'utilisation de l'IA.

Ton approche est pragmatique, ancrée dans la réalité terrain des équipes TI québécoises : tu connais les contraintes réglementaires (AMF, Loi 25, LPRPDE), les enjeux de souveraineté des données, et les dynamiques culturelles particulières du marché québécois.

Tu génères des plans d'actions sur 3 horizons temporels :
- Horizon 1 — 0 à 3 mois : actions d'activation rapide, gains immédiats, fondations essentielles
- Horizon 2 — 3 à 12 mois : ancrage des pratiques, transformation des processus SDLC, gouvernance formalisée
- Horizon 3 — 12 mois et plus : transformation organisationnelle profonde, leadership IA, avantage concurrentiel durable

Chaque action doit être :
- Concrète, réalisable et mesurable dans le contexte québécois
- Attribuée à un rôle spécifique (Dev, QA, PO, Architecte, DevOps, RSSI, Management, Direction TI, Tous)
- Assortie d'un indicateur d'impact court (ex: "Réduction 40% du temps de revue", "Conformité Loi 25", "ROI mesurable sous 90 jours")
- Rédigée en français professionnel québécois, directe et sans jargon inutile

Tu réponds UNIQUEMENT avec du JSON valide, sans markdown, sans balises, sans explication.`;

/* ── Validation et sanitisation de l'input ── */
function sanitizeString(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return value
    .slice(0, maxLength)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // ctrl chars
    .trim();
}

function sanitizeNumber(value, min = 0, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function validateBody(body) {
  if (!body || typeof body !== 'object') {
    throw new Error('Corps de requête invalide');
  }

  const scores = body.scores || {};
  return {
    org:        sanitizeString(body.org, 200),
    sector:     sanitizeString(body.sector, 100),
    teamSize:   sanitizeString(body.teamSize, 50),
    methodology:sanitizeString(body.methodology, 50),
    tools:      sanitizeString(body.tools, 300),
    budget:     sanitizeString(body.budget, 50),
    noteRoles:  sanitizeString(body.noteRoles, 1000),
    noteSdlc:   sanitizeString(body.noteSdlc, 1000),
    noteGov:    sanitizeString(body.noteGov, 1000),
    noteProfil: sanitizeString(body.noteProfil, 1000),
    scores: {
      roles: sanitizeNumber(scores.roles),
      sdlc:  sanitizeNumber(scores.sdlc),
      gov:   sanitizeNumber(scores.gov),
    }
  };
}

/* ── Construction du prompt utilisateur ── */
function buildUserPrompt(data) {
  const levelLabel = (v) =>
    v < 35 ? '(niveau débutant)' :
    v < 65 ? '(niveau intermédiaire)' : '(niveau avancé)';

  return `Voici les données du diagnostic de maturité IA pour cette organisation :

PROFIL ORGANISATION
- Nom : ${data.org || 'Non précisé'}
- Secteur : ${data.sector || 'Non précisé'}
- Taille équipe TI : ${data.teamSize || 'Non précisée'}
- Méthodologie : ${data.methodology || 'Non précisée'}
- Outils IA actuellement utilisés : ${data.tools || 'Aucun mentionné'}
- Budget IA annuel : ${data.budget || 'Non précisé'}

SCORES DE MATURITÉ
- Augmentation des rôles : ${data.scores.roles}% ${levelLabel(data.scores.roles)}
- Pratiques SDLC : ${data.scores.sdlc}% ${levelLabel(data.scores.sdlc)}
- Gouvernance IA : ${data.scores.gov}% ${data.scores.gov < 35 ? '(niveau débutant — risque réglementaire)' : levelLabel(data.scores.gov)}

OBSERVATIONS TERRAIN (NOTES FACILITATEUR)
- Rôles : ${data.noteRoles || 'Aucune observation'}
- SDLC : ${data.noteSdlc || 'Aucune observation'}
- Gouvernance : ${data.noteGov || 'Aucune observation'}

Génère le plan d'actions en JSON strict selon cette structure exacte :
{
  "h1": [
    {
      "role": "Dev|QA|PO|Architecte|DevOps|RSSI|Management|Direction TI|Tous",
      "action": "Description précise de l'action à mener, avec le contexte québécois si pertinent",
      "impact": "Indicateur de résultat mesurable court"
    }
  ],
  "h2": [ ... ],
  "h3": [ ... ]
}

Contraintes :
- h1 (0–3 mois) : 3 à 4 actions prioritaires, gains rapides
- h2 (3–12 mois) : 3 à 4 actions d'ancrage
- h3 (12 mois+) : 2 à 3 actions de transformation
- JSON uniquement, aucun texte autour`;
}

/* ── Parse la réponse Anthropic ── */
function parseAPIResponse(text) {
  const clean = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Réponse non parseable');
    parsed = JSON.parse(match[0]);
  }

  const keys = Object.keys(parsed);
  return {
    h1: Array.isArray(parsed['h1'] || parsed['0-3 mois'] || parsed[keys[0]]) ? (parsed['h1'] || parsed['0-3 mois'] || parsed[keys[0]]) : [],
    h2: Array.isArray(parsed['h2'] || parsed['3-12 mois'] || parsed[keys[1]]) ? (parsed['h2'] || parsed['3-12 mois'] || parsed[keys[1]]) : [],
    h3: Array.isArray(parsed['h3'] || parsed['12 mois+']  || parsed[keys[2]]) ? (parsed['h3'] || parsed['12 mois+']  || parsed[keys[2]]) : [],
  };
}

/* ── Sanitise les actions retournées par le modèle ── */
function sanitizeActions(actions) {
  if (!Array.isArray(actions)) return [];
  return actions
    .filter(a => a && typeof a === 'object')
    .slice(0, 6) // max 6 actions par horizon
    .map(a => ({
      role:   sanitizeString(String(a.role   || 'Général'), 50),
      action: sanitizeString(String(a.action || ''), 600),
      impact: sanitizeString(String(a.impact || 'À prioriser'), 100),
    }));
}

/* ── Handler principal Vercel ── */
export default async function handler(req, res) {
  /* CORS preflight */
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  /* Méthode */
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  /* Clé API côté serveur — jamais exposée au client */
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY manquante dans les variables d\'environnement');
    return res.status(500).json({ error: 'Configuration serveur incomplète' });
  }

  /* Validation input */
  let data;
  try {
    data = validateBody(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  /* Appel Anthropic */
  let anthropicRes;
  try {
    anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: buildUserPrompt(data) }],
      }),
    });
  } catch (networkErr) {
    console.error('Erreur réseau vers Anthropic :', networkErr);
    return res.status(502).json({ error: 'Impossible de joindre l\'API Anthropic' });
  }

  if (!anthropicRes.ok) {
    const body = await anthropicRes.json().catch(() => ({}));
    const msg  = body?.error?.message || anthropicRes.statusText;
    console.error(`Anthropic ${anthropicRes.status} :`, msg);
    return res.status(anthropicRes.status === 401 ? 401 : 502).json({
      error: `Erreur API Anthropic (${anthropicRes.status})`,
    });
  }

  /* Parse et sanitise */
  let plan;
  try {
    const result = await anthropicRes.json();
    const text   = result.content?.[0]?.text?.trim() || '';
    const raw    = parseAPIResponse(text);
    plan = {
      h1: sanitizeActions(raw.h1),
      h2: sanitizeActions(raw.h2),
      h3: sanitizeActions(raw.h3),
    };
  } catch (parseErr) {
    console.error('Erreur parsing réponse Anthropic :', parseErr);
    return res.status(502).json({ error: 'Réponse Anthropic non interprétable' });
  }

  /* Succès */
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ plan });
}
