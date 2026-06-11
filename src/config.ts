import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from "fs";
import { homedir, platform } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".config", "commit-ai");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const GROQ_KEY_PATTERN = /^gsk_[A-Za-z0-9]{40,}$/;

interface Config {
  groqApiKey: string;
}

export function getApiKey(): string | null {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    const config: Config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    const key = config.groqApiKey;
    // Valida formato anche in lettura — previene substitution attack
    if (!key || typeof key !== "string" || !GROQ_KEY_PATTERN.test(key)) return null;
    return key;
  } catch {
    return null;
  }
}

export function saveApiKey(key: string): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify({ groqApiKey: key }, null, 2));
  if (platform() !== "win32") {
    // Unix: owner read/write only
    chmodSync(CONFIG_PATH, 0o600);
  } else {
    // Windows: chmod è no-op, avvisa l'utente
    console.warn(
      "\nWarning: on Windows file permissions are not enforced.\n" +
      "Protect ~/.config/commit-ai/config.json manually if on a shared machine.\n"
    );
  }
}
