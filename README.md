# centroidium

**The High-Performance Core Engine for the CodingDatafy Platform.**

`centroidium` is the open-source, decoupled documentation engine designed to power the world's largest reference and knowledge base for coding languages. Built on a database-less, architecture, it functions as the central rendering hub—dynamically fetching, parsing, and delivering structured markdown data from external content repositories to the edge.

---

## Technical Stack
* **Domain Name:** [www.codingdatafy.com](https://www.codingdatafy.com)
* **Framework:** Next.js 16 (App Router & Dynamic Routing)
* **Language:** TypeScript (Strict Mode)
* **Rendering Strategy:** Static Site Generation (SSG) with Dynamic Fetching
* **Infrastructure:** [Vercel](https://vercel.com/) (Serverless Deployment) & [Cloudflare](https://www.cloudflare.com/) (Global DNS & Edge Caching)

---

## Architectural Design (Decoupled & Stateless)
Unlike traditional monolithic architectures, `centroidium` adopts a strict **Content-as-Data** philosophy. It contains zero hardcoded documentation or markdown assets. 

Instead, the engine utilizes a specialized data-fetching layer that queries the GitHub API to pull structured `MD` and `JSON` files directly from the [`content`](https://github.com/codingdatafy/content) repository (and secondary data hubs) during build time. This ensures:
* **Zero Vendor Lock-in:** The engine is stateless and can be re-routed to any git-based storage.
* **Optimized Build Consumption:** Vercel builds are triggered intelligently only when validated data changes occur.
* **Sub-Millisecond Delivery:** Pages are compiled into pure static HTML and heavily cached via Cloudflare's global edge network.

---

## Branching Model & Workflow
We enforce a disciplined branching model to protect production integrity:
* **`main`:** Protected branch. Reserved strictly for stable, production-ready engine releases.
* **`develop`:** Protected integration branch where all tested features are staged.
* **Feature Branches (`feature/<issue-number>-description`):** All development must occur on localized branches branched from `develop`.

> **Note:** Direct pushes to `main` and `develop` are restricted. All changes require an approved Pull Request (PR) linked to an active GitHub Issue.

---

## Contribution Policy
We welcome web engineers, performance optimizers, and technical architects to contribute to `centroidium`. If you wish to optimize the markdown parser, improve style sheets, or enhance edge caching mechanisms:
1. Explore open engineering tasks on the [Organization Roadmap](https://github.com/orgs/codingdatafy/projects).
2. Ensure all code adheres to our TypeScript strict standards and global comment architecture.
3. To contribute *technical content or code language documentation*, please head over to the dedicated [`content`](https://github.com/codingdatafy/content) repository instead.

---

## Licensing
The `centroidium` repository houses the software infrastructure of our platform and is strictly licensed under the permissive **MIT License**.

Copyright (c) 2026 CodingDatafy Organization