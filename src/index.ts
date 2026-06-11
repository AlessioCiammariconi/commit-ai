import * as p from "@clack/prompts";
import { getApiKey, saveApiKey, resetApiKey } from "./config.js";
import { getStagedDiff, commitWithMessage, containsSecrets } from "./git.js";
import { generateCommitMessages } from "./ai.js";
import { askForApiKey, selectCommitMessage } from "./prompt.js";

const VERSION = "0.1.0";

function showHelp() {
  console.log(`
commit-ai — AI-powered git commit message generator

Usage:
  commit-ai             Generate commit messages for staged changes
  commit-ai --reset-key Reset saved API key
  commit-ai --version   Show version
  commit-ai --help      Show this help

Requirements:
  - Run inside a git repository
  - Stage changes with git add before running
  - Free Groq API key from https://console.groq.com

Environment:
  GROQ_API_KEY          API key via env var (overrides saved config)
`);
}

async function main() {
  const arg = process.argv[2];

  if (arg === "--help" || arg === "-h") { showHelp(); process.exit(0); }
  if (arg === "--version" || arg === "-v") { console.log(VERSION); process.exit(0); }
  if (arg === "--reset-key") {
    resetApiKey();
    console.log("API key removed. Run commit-ai to set a new one.");
    process.exit(0);
  }

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
  let truncated: boolean;
  try {
    ({ diff, truncated } = await getStagedDiff());
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

  // 3. Avvisa se il diff è stato troncato
  if (truncated) {
    p.log.warn(
      "Large diff — truncated to 15,000 characters before sending to AI.\n" +
      "Some changes may not be reflected in the generated messages."
    );
  }

  // 4. Warning se il diff contiene pattern sospetti
  if (containsSecrets(diff)) {
    p.log.warn(
      "Potential secrets detected in your diff.\n" +
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

  // 5. Genera i messaggi con AI
  spinner.start("Generating commit messages...");

  let messages: string[];
  try {
    messages = await generateCommitMessages(apiKey, diff);
  } catch (err) {
    spinner.stop("Failed to generate messages.");
    const msg = err instanceof Error ? err.message : String(err);
    // 401 → chiave revocata, offri reset
    if (msg.includes("401") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("invalid api key")) {
      p.log.error("Groq API key is invalid or revoked.");
      const reset = await p.confirm({ message: "Reset saved key and enter a new one?" });
      if (!p.isCancel(reset) && reset) {
        resetApiKey();
        p.log.info("Key removed. Run commit-ai again to set a new one.");
      }
    } else {
      p.cancel(`Groq API error: ${msg}`);
    }
    process.exit(1);
  }

  spinner.stop("Done.");

  // 6. Mostra le opzioni e chiedi la scelta
  const selected = await selectCommitMessage(messages);
  if (!selected) {
    p.cancel("Commit cancelled.");
    process.exit(0);
  }

  // 7. Esegui il commit
  try {
    await commitWithMessage(selected);
    p.outro(`Committed: ${selected}`);
  } catch (err) {
    p.cancel(`Git commit failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

main();
