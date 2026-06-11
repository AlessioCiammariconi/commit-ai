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

Respond with a JSON object in this exact format:
{"messages": ["message1", "message2", "message3"]}`;

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
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Could not parse AI response");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { messages?: unknown }).messages)
  ) {
    throw new Error("Invalid AI response format");
  }

  // Valida che ogni elemento sia una stringa non vuota
  const messages = ((parsed as { messages: unknown[] }).messages)
    .filter((m): m is string => typeof m === "string" && m.trim().length > 0)
    .slice(0, 3);

  if (messages.length === 0) throw new Error("AI returned no valid commit messages");

  return messages;
}
