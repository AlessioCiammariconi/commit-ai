# commit-ai

AI-powered git commit message generator. Reads your staged diff, generates 3 commit options in [Conventional Commits](https://www.conventionalcommits.org/) format, and lets you pick one — all in under 3 seconds.

Powered by [Groq](https://groq.com) (Llama 3.3 70B). **Free tier — no credit card required.** Groq free plan includes 1,000 requests/day and 30 requests/minute per API key.

```
$ commit-ai

○ Reading staged changes...
○ Generating commit messages...

Pick a commit message:
❯ 1. feat(auth): add JWT refresh token rotation
  2. fix(auth): handle expired token edge case
  3. refactor(auth): simplify token validation logic
  e. edit manually
  x. cancel

✔ Committed: feat(auth): add JWT refresh token rotation
```

---

## Install

```bash
npm install -g @alessiociammariconi/commit-ai
```

Requires Node.js 18+.

---

## Setup

Get a free API key at [console.groq.com](https://console.groq.com) — no credit card needed.

On first run, `commit-ai` will ask for your key and save it to `~/.config/commit-ai/config.json`. You only do this once.

---

## Usage

Stage your changes, then run:

```bash
git add <files>
commit-ai
```

That's it. Pick one of the 3 generated messages, edit manually, or cancel.

### Flags

```bash
commit-ai --reset-key   # remove saved API key and enter a new one
commit-ai --version     # show version
commit-ai --help        # show help
```

### Environment variable

If you prefer not to save the key on disk (e.g. CI/CD), set it via env:

```bash
GROQ_API_KEY=gsk_... commit-ai
```

---

## How it works

1. Runs `git diff --staged` to get your staged changes
2. Sends the diff to Groq (Llama 3.3 70B) with a Conventional Commits prompt
3. Parses the 3 returned options
4. You pick one → `git commit -m` executes

The diff is truncated at 15,000 characters before being sent to avoid hitting context limits on large refactors.

---

## Security

- **API key** is stored in `~/.config/commit-ai/config.json` with `600` permissions (Unix) — only your user can read it
- **Your diff is sent to Groq servers** — do not use on proprietary or sensitive codebases without reviewing [Groq's data policy](https://groq.com/privacy-policy/)
- **Secret detection** — if your diff contains patterns like API keys, passwords, PEM blocks, or tokens, commit-ai warns you before sending and asks for confirmation. Detection is heuristic — not foolproof. Avoid `git add .` blindly; always add specific files
- **commit-ai stores nothing** — your diff is sent to Groq and immediately discarded. No logs, no local cache, no database
- **No command injection** — commit messages are passed to git as separate arguments, never interpolated into a shell string

---

## License

MIT © [Alessio Ciammariconi](https://github.com/AlessioCiammariconi)
