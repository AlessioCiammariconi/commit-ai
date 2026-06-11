import Groq from "groq-sdk";

const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are a git commit message generator.
Given a git diff, generate exactly 3 commit message options following the Conventional Commits spec.

Rules:
- Format: type(scope): description
- Types: feat, fix, refactor, docs, style, test, chore
- Keep descriptions under 72 characters
- Use imperative mood ("add" not "added")
- Scope is optional but use it when obvious from the diff

Respond with ONLY a JSON array of 3 strings, nothing else.
Example: ["feat(auth): add JWT refresh token rotation", "fix(auth): handle expired token edge case", "refactor(auth): simplify token validation logic"]`;

export async function generateCommitMessages(
  apiKey: string,
  diff: string
): Promise<string[]> {
  const groq = new Groq({ apiKey });

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Git diff:\n\n${diff}` },
    ],
    temperature: 0.7,
    max_tokens: 256,
  });

  const content = response.choices[0]?.message?.content ?? "";

  // Estrae il JSON array dalla risposta
  const match = content.match(/\[.*\]/s);
  if (!match) throw new Error("Could not parse AI response");

  const parsed: unknown = JSON.parse(match[0]);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Invalid AI response format");
  }

  // Valida che ogni elemento sia una stringa non vuota
  const messages = (parsed as unknown[])
    .filter((m): m is string => typeof m === "string" && m.trim().length > 0)
    .slice(0, 3);

  if (messages.length === 0) throw new Error("AI returned no valid commit messages");

  return messages;
}
