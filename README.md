# centroidium
**The High-Performance Core Engine for the CodingDatafy Platform.**
`centroidium` is the open-source, decoupled documentation engine powering CodingDatafy—an early-stage project on a mission to build a unified reference and knowledge base for programmers. Built on a native Cloudflare edge architecture (`workerd`), it functions as the central rendering hub—dynamically fetching, parsing, and delivering structured markdown content from Cloudflare R2 storage directly to the edge.

## Technical Stack
* **Domain Name:** [www.codingdatafy.com](https://www.codingdatafy.com)
* **Runtime:** Native Cloudflare Worker (`workerd` runtime)
* **Language:** TypeScript (Strict Mode)
* **Framework:** None (Zero-Dependency Pure TypeScript Engine)
* **Storage:** Cloudflare R2 (Stateless object storage for Markdown content)
* **Caching & Performance:** Cloudflare Cache API (Global Edge Caching)
* **Analytics:** Cloudflare Workers Analytics Engine (Privacy-First First-Party Analytics)
* **Infrastructure & CI/CD:** GitHub Actions + Wrangler CLI direct deployment

## Architectural Design (Decoupled & Stateless)
Unlike traditional web frameworks, `centroidium` adopts a strict **Content-as-Data** philosophy. It contains zero hardcoded documentation or static build assets in the core engine.

Instead, the engine operates as a ultra-fast edge renderer:
* **Dynamic R2 Storage Fetching:** Content is stored in a dedicated Cloudflare R2 bucket, synced seamlessly from the [`content`](https://github.com/CodingDatafy/content) repository via automated GitHub Actions.
* **Zero-Dependency Markdown Engine:** Uses internal custom logic (`markdatafy.ts`) to parse Markdown into pure HTML on the fly without external runtime overhead.
* **Edge-First Caching:** Dynamically caches rendered HTML payloads directly in Cloudflare's global edge network using the native Cache API.
* **Privacy-First Telemetry:** Logs anonymized performance metrics via Workers Analytics Engine without tracking users or using cookies.