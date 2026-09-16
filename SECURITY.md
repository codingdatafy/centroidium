# Security Policy

At **CodingDatafy**, we prioritize system integrity, application safety, and user privacy. As an open-source, privacy-first initiative, we appreciate the work of security researchers and the global developer community in helping us maintain a safe environment.

---

## Supported Versions

Only the latest active deployment on the `main` branch is currently supported for security updates.

| Version / Branch | Supported          |
| ---------------- | ------------------ |
| `main`           | :white_check_mark: |
| `develop`        | :x:                |
| Custom Forks     | :x:                |

---

## Reporting a Vulnerability

If you believe you have discovered a security vulnerability or privacy concern within any **CodingDatafy** repository or live service, please report it responsibly **without opening a public issue**.

### Preferred Reporting Method
- **Email:** `security@codingdatafy.com`
- **Contact Form:** [https://www.codingdatafy.com/contact](https://www.codingdatafy.com/contact)

### What to Include in Your Report
To help us evaluate and address the issue efficiently, please include:
1. **Description:** A brief summary of the vulnerability and its potential impact.
2. **Steps to Reproduce:** Clear, step-by-step instructions or a proof-of-concept (PoC).
3. **Affected Scope:** Specific repository, URL, route, or file involved.

---

## Response Timeline & Disclosure Guidelines

- **Acknowledgment:** We aim to acknowledge receipt of security reports within **48 hours**.
- **Assessment:** Our team will review and validate the finding within **5 business days**.
- **Resolution:** Critical issues will be patched promptly on the `main` branch.

We kindly request that you refrain from publicly disclosing the issue until we have had reasonable time to address it.

---

## Security & Privacy Principles

- **No Trackers / Strict Privacy:** CodingDatafy does not employ third-party tracking scripts or intrusive cookies. Telemetry is handled natively via Cloudflare Workers Analytics Engine with zero-tracker anonymized metrics.
- **Edge-Native Architecture:** `centroidium` operates as a zero-dependency dynamic renderer executing on Cloudflare Workers (`workerd`) and fetching markdown objects directly from Cloudflare R2 object storage.

Thank you for helping keep CodingDatafy safe for developers worldwide!