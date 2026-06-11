import simpleGit from "simple-git";

const git = simpleGit();

// Pattern ad alta confidenza — matchano valori, non nomi di variabili
// Evita falsi positivi su codice che "parla di" chiavi senza contenerle
const SECRET_PATTERNS = [
  /-----BEGIN .* PRIVATE KEY-----/,          // PEM blocks
  /ghp_[A-Za-z0-9]{36}/,                     // GitHub PAT
  /github_pat_[A-Za-z0-9_]{82}/,             // GitHub fine-grained token
  /sk-[A-Za-z0-9]{32,}/,                     // OpenAI key
  /gsk_[A-Za-z0-9]{40,}/,                    // Groq key
  /AKIA[0-9A-Z]{16}/,                        // AWS access key
  // Generici: richiede assegnamento con valore plausibile (8+ caratteri)
  /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}/i,
];

// Limite in caratteri UTF-16 (diff.length) — rinominato per chiarezza
const MAX_DIFF_CHARS = 15_000;

export async function getStagedDiff(): Promise<{ diff: string; truncated: boolean }> {
  const raw = await git.diff(["--staged"]);
  if (raw.length > MAX_DIFF_CHARS) {
    // Tronca all'ultimo newline per non spezzare righe a metà
    const cut = raw.lastIndexOf("\n", MAX_DIFF_CHARS);
    const diff = raw.slice(0, cut > 0 ? cut : MAX_DIFF_CHARS) + "\n\n[...diff truncated for AI processing...]";
    return { diff, truncated: true };
  }
  return { diff: raw, truncated: false };
}

export async function commitWithMessage(message: string): Promise<void> {
  await git.commit(message);
}

export function containsSecrets(diff: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(diff));
}
