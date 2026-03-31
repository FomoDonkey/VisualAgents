# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.3.x   | Yes       |
| < 0.3   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in Visual Agents, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues by opening a **private security advisory** on GitHub:

1. Go to the [Security tab](https://github.com/FomoDonkey/VisualAgents/security) of this repository
2. Click **"Report a vulnerability"**
3. Provide a detailed description of the vulnerability

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix release**: As soon as possible, depending on severity

## Scope

This security policy covers:

- The Visual Agents VS Code extension
- The hook script that captures Claude Code events
- The development server and API endpoints
- The `events.jsonl` event format

## Best Practices for Users

- Keep Visual Agents updated to the latest version
- Do not expose the dev server (`npm run dev`) to public networks
- Review the hook script before installing if you have security concerns
- The `events.jsonl` file may contain file paths and command summaries — treat it accordingly

---

Thank you for helping keep Visual Agents and its users safe.
