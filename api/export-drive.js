import { createSign } from 'crypto';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DOCS_URL      = 'https://docs.googleapis.com/v1/documents';
const DRIVE_URL     = 'https://www.googleapis.com/drive/v3/files';
const TOKEN_URL     = 'https://oauth2.googleapis.com/token';

/* ── Google Service Account Auth (JWT → access token) ──────────────
   Aucune dépendance npm — utilise crypto natif de Node.js           */
async function getGoogleToken() {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const now = Math.floor(Date.now() / 1000);

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss:   key.client_email,
    scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive',
    aud:   TOKEN_URL,
    iat:   now,
    exp:   now + 3600,
  })).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(key.private_key, 'base64url');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${header}.${payload}.${sig}`,
  });
  const { access_token } = await res.json();
  if (!access_token) throw new Error('Impossible d\'obtenir un token Google');
  return access_token;
}

/* ── MCP : Claude utilise un outil structuré (tool_use) ─────────────
   Claude ne génère pas du texte libre — il remplit des champs précis
   via l'outil "structure_report". C'est le cœur du pattern MCP.     */
async function generateReportContent(data) {
  const tools = [{
    name: 'structure_report',
    description: 'Produit le contenu narratif d\'un rapport de diagnostic IA pour un COPIL',
    input_schema: {
      type: 'object',
      properties: {
        executive_summary: {
          type: 'string',
          description: 'Résumé exécutif de 3-4 phrases, ton professionnel pour un COPIL',
        },
        score_interpretation: {
          type: 'string',
          description: 'Lecture croisée des 3 scores : ce que ça dit du niveau de maturité réel',
        },
        top_3_priorities: {
          type: 'array',
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              title:  { type: 'string', description: 'Titre court de la priorité' },
              reason: { type: 'string', description: 'Pourquoi c\'est prioritaire (2 phrases)' },
              metric: { type: 'string', description: 'Indicateur de succès mesurable' },
            },
            required: ['title', 'reason', 'metric'],
          },
        },
        conclusion: {
          type: 'string',
          description: 'Appel à l\'action en 2 phrases — recommande la prochaine étape concrète',
        },
      },
      required: ['executive_summary', 'score_interpretation', 'top_3_priorities', 'conclusion'],
    },
  }];

  const userMsg = `Génère le contenu narratif pour ce diagnostic de maturité IA :
Organisation : ${data.org || 'Non précisée'} | Secteur : ${data.sector || '—'} | Équipe TI : ${data.teamSize || '—'}
Méthodologie : ${data.methodology || '—'} | Outils IA actuels : ${data.tools || 'Aucun'}
Scores → Rôles : ${data.scores.roles}% | SDLC : ${data.scores.sdlc}% | Gouvernance : ${data.scores.gov}%
Actions H1 prioritaires : ${(data.plan?.h1 || []).slice(0, 3).map(a => a.action).join(' | ') || 'N/A'}`;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      tools,
      tool_choice: { type: 'tool', name: 'structure_report' },
      system: 'Tu es Samiha Salhi-Kacher, experte en IA générative et transformation SDLC pour organisations québécoises. Réponds en français professionnel.',
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const result = await res.json();
  const toolUse = result.content?.find(b => b.type === 'tool_use');
  if (!toolUse) throw new Error('tool_use absent de la réponse Anthropic');
  return toolUse.input;
}

/* ── Construit le contenu du Google Doc par sections ───────────────  */
function buildDocParts(data, report) {
  const date = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  const lvl  = v => v < 35 ? 'Débutant ⚠' : v < 65 ? 'Intermédiaire' : 'Avancé ✓';
  const plan = (horizon) =>
    (data.plan?.[horizon] || []).map(a => `• [${a.role}] ${a.action}\n  Indicateur : ${a.impact}`).join('\n\n') || 'Aucune action définie.';

  return [
    { text: `Diagnostic IA · ${data.org || 'Organisation'}\n`,       style: 'TITLE' },
    { text: `Rapport de maturité IA · ${date}\n\n`,                  style: 'SUBTITLE' },

    { text: `Résumé exécutif\n`,                                      style: 'HEADING_1' },
    { text: `${report.executive_summary}\n\n` },

    { text: `Profil de l'organisation\n`,                             style: 'HEADING_1' },
    { text: `Organisation : ${data.org || '—'}\nSecteur : ${data.sector || '—'}\nTaille équipe TI : ${data.teamSize || '—'}\nMéthodologie : ${data.methodology || '—'}\nOutils IA actuels : ${data.tools || 'Aucun déclaré'}\n\n` },

    { text: `Scores de maturité IA\n`,                                style: 'HEADING_1' },
    { text: `Augmentation des rôles  : ${data.scores.roles}%  (${lvl(data.scores.roles)})\nPratiques SDLC         : ${data.scores.sdlc}%  (${lvl(data.scores.sdlc)})\nGouvernance IA         : ${data.scores.gov}%  (${lvl(data.scores.gov)})\n\n${report.score_interpretation}\n\n` },

    { text: `Top 3 priorités\n`,                                      style: 'HEADING_1' },
    ...report.top_3_priorities.flatMap((p, i) => [
      { text: `${i + 1}. ${p.title}\n`,                              style: 'HEADING_2' },
      { text: `${p.reason}\nSuccès mesuré par : ${p.metric}\n\n` },
    ]),

    { text: `Plan d'actions\n`,                                       style: 'HEADING_1' },
    { text: `Horizon 1 — 0 à 3 mois\n`,                              style: 'HEADING_2' },
    { text: `${plan('h1')}\n\n` },
    { text: `Horizon 2 — 3 à 12 mois\n`,                             style: 'HEADING_2' },
    { text: `${plan('h2')}\n\n` },
    { text: `Horizon 3 — 12 mois et plus\n`,                         style: 'HEADING_2' },
    { text: `${plan('h3')}\n\n` },

    { text: `Conclusion et prochaines étapes\n`,                      style: 'HEADING_1' },
    { text: `${report.conclusion}\n\n` },
    { text: `Samiha Salhi-Kacher · Intégratrice IA · Accélération & Gouvernance\nhttps://ia-diagnostic.vercel.app · salhisamiha83@gmail.com · 438 870-2551\n` },
  ];
}

/* ── Crée et formate le Google Doc ─────────────────────────────────  */
async function createAndFormatDoc(token, title, data, report) {
  // 1. Créer le document vide
  const createRes = await fetch(DOCS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!createRes.ok) throw new Error(`Google Docs create: ${createRes.status}`);
  const { documentId } = await createRes.json();

  // 2. Construire le texte complet + calcul des plages pour les styles
  const parts   = buildDocParts(data, report);
  const fullText = parts.map(p => p.text).join('');

  const requests = [
    { insertText: { location: { index: 1 }, text: fullText } },
  ];

  let idx = 1;
  for (const part of parts) {
    const end = idx + part.text.length;
    if (part.style) {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: idx, endIndex: end },
          paragraphStyle: { namedStyleType: part.style },
          fields: 'namedStyleType',
        },
      });
    }
    idx = end;
  }

  // 3. Appliquer le contenu et les styles
  const updateRes = await fetch(`${DOCS_URL}/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  if (!updateRes.ok) {
    const err = await updateRes.json();
    throw new Error(`Google Docs batchUpdate: ${JSON.stringify(err)}`);
  }

  return documentId;
}

/* ── Rend le document accessible via lien ──────────────────────────  */
async function shareDocument(token, docId) {
  await fetch(`${DRIVE_URL}/${docId}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
}

/* ── Handler Vercel ─────────────────────────────────────────────────  */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' });
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    return res.status(500).json({ error: 'GOOGLE_SERVICE_ACCOUNT_KEY manquante — voir configuration Vercel' });

  const { data } = req.body || {};
  if (!data?.scores) return res.status(400).json({ error: 'Données du diagnostic manquantes' });

  const date  = new Date().toLocaleDateString('fr-CA');
  const title = `Diagnostic IA · ${data.org || 'Organisation'} · ${date}`;

  // Étape 1 : Claude structure le contenu via tool_use (pattern MCP)
  let report;
  try {
    report = await generateReportContent(data);
  } catch (err) {
    console.error('Erreur Anthropic tool_use :', err);
    return res.status(502).json({ error: 'Erreur génération contenu Anthropic' });
  }

  // Étape 2 : Google auth
  let token;
  try {
    token = await getGoogleToken();
  } catch (err) {
    console.error('Erreur Google auth :', err);
    return res.status(502).json({ error: 'Erreur authentification Google — vérifiez GOOGLE_SERVICE_ACCOUNT_KEY' });
  }

  // Étape 3 : Créer + formater le Google Doc
  let docId;
  try {
    docId = await createAndFormatDoc(token, title, data, report);
  } catch (err) {
    console.error('Erreur Google Docs :', err);
    return res.status(502).json({ error: 'Erreur création Google Doc' });
  }

  // Étape 4 : Partager (lien public en lecture)
  try {
    await shareDocument(token, docId);
  } catch (err) {
    console.error('Erreur partage Drive :', err.message);
    // Non bloquant — le doc existe même sans partage
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    url:   `https://docs.google.com/document/d/${docId}/edit`,
    docId,
  });
}
