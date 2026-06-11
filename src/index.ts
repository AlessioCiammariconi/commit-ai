import * as p from "@clack/prompts";
import { getApiKey, saveApiKey } from "./config.js";
import { getStagedDiff, commitWithMessage, containsSecrets } from "./git.js";
import { generateCommitMessages } from "./ai.js";
import { askForApiKey, selectCommitMessage } from "./prompt.js";

async function main() {
  p.intro("commit-ai");

  // 1. Recupera o chiedi la API key
  let apiKey = getApiKey();
  if (!apiKey) {
    apiKey = await askForApiKey();
    saveApiKey(apiKey);
    p.log.success("API key saved to ~/.config/commit-ai/config.json");
  }

  // 2. Leggi il diff staged
  const spinner = p.spinner();
  spinner.start("Reading staged changes...");

  let diff: string;
  try {
    diff = await getStagedDiff();
  } catch {
    spinner.stop("Failed to read git diff.");
    p.cancel("Make sure you are inside a git repository.");
    process.exit(1);
  }

  if (!diff.trim()) {
    spinner.stop("No staged changes found.");
    p.cancel("Run `git add` first.");
    process.exit(1);
  }

  spinner.stop("Staged changes read.");

  // 3. Warning se il diff contiene pattern sospetti
  if (containsSecrets(diff)) {
    p.log.warn(
      "Potential secrets detected in your diff (API keys, passwords, tokens).\n" +
        "This diff will be sent to Groq servers. Proceed with caution."
    );

    const confirmed = await p.confirm({
      message: "Send diff to Groq anyway?",
      initialValue: false,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Aborted. Check your staged files.");
      process.exit(0);
    }
  }

  // 4. Genera i messaggi con AI
  spinner.start("Generating commit messages...");

  let messages: string[];
  try {
    messages = await generateCommitMessages(apiKey, diff);
  } catch (err) {
    spinner.stop("Failed to generate messages.");
    p.cancel(`Groq API error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  spinner.stop("Done.");

  // 5. Mostra le opzioni e chiedi la scelta
  const selected = await selectCommitMessage(messages);

  if (!selected) {
    p.cancel("Commit cancelled.");
    process.exit(0);
  }

  // 6. Esegui il commit
  try {
    await commitWithMessage(selected);
    p.outro(`Committed: ${selected}`);
  } catch (err) {
    p.cancel(`Git commit failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

main();
