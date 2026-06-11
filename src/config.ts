import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { homedir, platform } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".config", "commit-ai");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

// Unica fonte di verità per il formato della key — condivisa con prompt.ts
export const GROQ_KEY_PATTERN = /^gsk_[A-Za-z0-9]{40,}$/;

interface Config {
  groqApiKey: string;
}

export function getApiKey(): string | null {
  // 1. Variabile d'ambiente — utile per CI/CD e chi non vuole la key su disco
  const envKey = process.env.GROQ_API_KEY;
  if (envKey && GROQ_KEY_PATTERN.test(envKey.trim())) return envKey.trim();

  // 2. File di configurazione
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    const config: Config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    const key = config.groqApiKey;
    // Valida formato in lettura — previene substitution attack su file config
    if (!key || typeof key !== "string" || !GROQ_KEY_PATTERN.test(key)) return null;
    return key;
  } catch {
    return null;
  }
}

export function saveApiKey(key: string): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  // mode passato direttamente a writeFileSync — nessuna race condition
  writeFileSync(CONFIG_PATH, JSON.stringify({ groqApiKey: key }, null, 2), { mode: 0o600 });
  if (platform() === "win32") {
    console.warn(
      "\nWarning: on Windows file permissions are not enforced.\n" +
      "Protect ~/.config/commit-ai/config.json manually if on a shared machine.\n"
    );
  }
}

export function resetApiKey(): void {
  if (existsSync(CONFIG_PATH)) unlinkSync(CONFIG_PATH);
}
