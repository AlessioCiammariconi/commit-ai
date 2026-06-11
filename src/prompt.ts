import * as p from "@clack/prompts";
import { GROQ_KEY_PATTERN } from "./config.js";

export async function askForApiKey(): Promise<string> {
  // Niente p.intro() qui — già chiamato in index.ts
  p.note(
    "Get your free API key at https://console.groq.com\nNo credit card required.",
    "Groq API Key"
  );

  const key = await p.password({
    message: "Paste your GROQ_API_KEY:",
    validate: (v) => {
      // Stesso pattern di config.ts — unica fonte di verità
      if (!v || !GROQ_KEY_PATTERN.test(v.trim()))
        return "Invalid Groq API key (expected format: gsk_...)";
    },
  });

  if (p.isCancel(key)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  return (key as string).trim();
}

export async function selectCommitMessage(
  messages: string[]
): Promise<string | null> {
  // Valori numerici come stringa — evita collisioni con messaggi che potrebbero
  // contenere le parole "edit" o "cancel"
  const options = messages.map((msg, i) => ({
    value: String(i),
    label: `${i + 1}. ${msg}`,
  }));

  const result = await p.select({
    message: "Pick a commit message:",
    options: [
      ...options,
      { value: "edit", label: "e. edit manually" },
      { value: "cancel", label: "x. cancel" },
    ],
  });

  if (p.isCancel(result) || result === "cancel") return null;
  if (result === "edit") return await editMessage(messages[0]);

  // Risolve l'indice al messaggio corrispondente
  const idx = parseInt(result as string, 10);
  return messages[idx] ?? null;
}

async function editMessage(defaultMessage: string): Promise<string | null> {
  const edited = await p.text({
    message: "Edit commit message:",
    initialValue: defaultMessage,
    validate: (v) => {
      if (!v || v.trim().length === 0) return "Commit message cannot be empty";
      if (/[\x00-\x1F]/.test(v.trim())) return "Commit message must not contain control characters";
    },
  });

  if (p.isCancel(edited)) return null;
  return (edited as string).trim();
}
