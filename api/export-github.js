const ANTHROPIC_URL  = 'https://api.anthropic.com/v1/messages';
const GITHUB_API_URL = 'https://api.github.com';

/* ── MCP : Claude structure les issues via tool_use ─────────────────
   Claude ne génère pas du texte libre — il remplit des champs précis
   pour chaque issue GitHub (titre, body, labels).                    */
async function generateIssues(data) {
  const tools = [{
    name: 'create_github_issues',
    description: 'Structure les actions du plan en issues GitHub prêtes à créer',
    input_schema: {
      type: 'object',
      properties: {
        milestone_title: {
          type: 'string',
          description: 'Titre du milestone GitHub (ex: "IA Maturité H1 — Intact Financial")',
        },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title:  { type: 'string', description: 'Titre court de l\'issue (< 80 chars)' },
              body:   { type: 'string', description: 'Description markdown : contexte, critères d\'acceptation, indicateur de succès' },
              labels: {
                type: 'array',
                items: { type: 'string', enum: ['dev', 'qa', 'po', 'architecte', 'devops', 'gouvernance', 'management', 'urgent'] },
                description: 'Labels correspondant au rôle et à la priorité',
              },
            },
            required: ['title', 'body', 'labels'],
          },
        },
      },
      required: ['milestone_title', 'issues'],
    },
  }];

  const scores  = data.scores;
  const h1Items = (data.plan?.h1 || []).slice(0, 6);

  const userMsg = `Transforme ces actions H1 en issues GitHub pour l'équipe TI.
Organisation : ${data.org || 'N/A'} | Secteur : ${data.sector || 'N/A'}
Scores → Rôles : ${scores.roles}% | SDLC : ${scores.sdlc}% | Gouvernance : ${scores.gov}%

Actions H1 (0–3 mois) à convertir :
${h1Items.map((a, i) => `${i + 1}. [${a.role}] ${a.action}\n   Indicateur : ${a.impact}`).join('\n\n')}

Pour chaque issue :
- Titre clair et actionnable (commence par un verbe)
- Body en markdown avec : contexte (1 phrase), critères d'acceptation (liste), indicateur de succès
- Labels cohérents avec le rôle`;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      tools,
      tool_choice: { type: 'tool', name: 'create_github_issues' },
      system: 'Tu es Samiha Salhi-Kacher, experte en transformation IA. Réponds en français. Les issues doivent être directement utilisables par une équipe TI.',
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const result  = await res.json();
  const toolUse = result.content?.find(b => b.type === 'tool_use');
  if (!toolUse) throw new Error('tool_use absent de la réponse Anthropic');
  return toolUse.input;
}

/* ── Crée un milestone GitHub ───────────────────────────────────────  */
async function createMilestone(repo, token, title) {
  const due = new Date();
  due.setMonth(due.getMonth() + 3);

  const res = await fetch(`${GITHUB_API_URL}/repos/${repo}/milestones`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      description: 'Plan d\'actions H1 généré par ia-diagnostic.vercel.app',
      due_on: due.toISOString(),
    }),
  });
  if (!res.ok) return null;
  const { number } = await res.json();
  return number;
}

/* ── S'assure que les labels existent dans le repo ─────────────────  */
const LABEL_COLORS = {
  dev:          'e11d48',
  qa:           '7c3aed',
  po:           '0284c7',
  architecte:   '0891b2',
  devops:       '15803d',
  gouvernance:  'd97706',
  management:   '64748b',
  urgent:       'dc2626',
};

async function ensureLabels(repo, token, labels) {
  await Promise.all(labels.map(label =>
    fetch(`${GITHUB_API_URL}/repos/${repo}/labels`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: label,
        color: LABEL_COLORS[label] || '94a3b8',
        description: `Diagnostic IA — ${label}`,
      }),
    }).catch(() => {}) // Ignore si le label existe déjà
  ));
}

/* ── Crée les issues GitHub ─────────────────────────────────────────  */
async function createIssues(repo, token, issues, milestoneNumber) {
  const results = [];
  for (const issue of issues) {
    const res = await fetch(`${GITHUB_API_URL}/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title:     issue.title,
        body:      issue.body,
        labels:    issue.labels,
        milestone: milestoneNumber || undefined,
      }),
    });
    if (res.ok) {
      const { html_url, number } = await res.json();
      results.push({ number, url: html_url, title: issue.title });
    }
  }
  return results;
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
  if (!process.env.Github_Token)
    return res.status(500).json({ error: 'Github_Token manquant — voir configuration Vercel' });
  if (!process.env.Github_Repo)
    return res.status(500).json({ error: 'Github_Repo manquant (format: owner/repo)' });

  const { data } = req.body || {};
  if (!data?.plan?.h1?.length)
    return res.status(400).json({ error: 'Plan H1 manquant — lancez d\'abord le diagnostic' });

  const repo  = process.env.Github_Repo;
  const token = process.env.Github_Token;

  // Étape 1 : Claude structure les issues via tool_use (pattern MCP)
  let structured;
  try {
    structured = await generateIssues(data);
  } catch (err) {
    console.error('Anthropic tool_use :', err);
    return res.status(502).json({ error: 'Erreur génération Anthropic' });
  }

  // Étape 2 : S'assurer que les labels existent
  const allLabels = [...new Set(structured.issues.flatMap(i => i.labels))];
  await ensureLabels(repo, token, allLabels);

  // Étape 3 : Créer le milestone H1
  const milestoneNumber = await createMilestone(repo, token, structured.milestone_title);

  // Étape 4 : Créer les issues
  let created;
  try {
    created = await createIssues(repo, token, structured.issues, milestoneNumber);
  } catch (err) {
    console.error('GitHub issues :', err);
    return res.status(502).json({ error: 'Erreur création issues GitHub' });
  }

  const repoUrl = `https://github.com/${repo}`;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    milestone: structured.milestone_title,
    issues:    created,
    repoUrl,
    milestoneUrl: milestoneNumber ? `${repoUrl}/milestone/${milestoneNumber}` : repoUrl,
  });
}
