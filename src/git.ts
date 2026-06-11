import simpleGit from "simple-git";

const git = simpleGit();

// Pattern che potrebbero indicare segreti nel diff
const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token\s*=/i,
  /auth\s*=/i,
  /private[_-]?key/i,
  /ACCESS_KEY/i,
  /CLIENT_SECRET/i,
  /-----BEGIN .* PRIVATE KEY-----/,   // PEM blocks
  /ghp_[A-Za-z0-9]{36}/,              // GitHub personal access token
  /github_pat_[A-Za-z0-9_]{82}/,      // GitHub fine-grained token
  /sk-[A-Za-z0-9]{32,}/,             // OpenAI key
  /gsk_[A-Za-z0-9]{40,}/,            // Groq key
  /AKIA[0-9A-Z]{16}/,                 // AWS access key
];

// Limite dimensione diff inviato a Groq (~3.5k token)
const MAX_DIFF_BYTES = 15_000;

export async function getStagedDiff(): Promise<string> {
  const diff = await git.diff(["--staged"]);
  if (diff.length > MAX_DIFF_BYTES) {
    return diff.slice(0, MAX_DIFF_BYTES) + "\n\n[...diff truncated for AI processing...]";
  }
  return diff;
}

export async function commitWithMessage(message: string): Promise<void> {
  await git.commit(message);
}

export function containsSecrets(diff: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(diff));
}
