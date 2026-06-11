import * as p from "@clack/prompts";

export async function askForApiKey(): Promise<string> {
  p.intro("commit-ai — first time setup");

  p.note(
    "Get your free API key at https://console.groq.com\nNo credit card required.",
    "Groq API Key"
  );

  const key = await p.password({
    message: "Paste your GROQ_API_KEY:",
    validate: (v) => {
      if (!v || !v.trim().startsWith("gsk_") || v.trim().length < 40)
        return "Invalid Groq API key (expected format: gsk_...)";
    },
  });

  if (p.isCancel(key)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  return key as string;
}

export async function selectCommitMessage(
  messages: string[]
): Promise<string | null> {
  const options = messages.map((msg, i) => ({
    value: msg,
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

  return result as string;
}

async function editMessage(defaultMessage: string): Promise<string | null> {
  const edited = await p.text({
    message: "Edit commit message:",
    initialValue: defaultMessage,
    validate: (v) => {
      if (!v || v.trim().length === 0) return "Commit message cannot be empty";
    },
  });

  if (p.isCancel(edited)) return null;
  return edited as string;
}
