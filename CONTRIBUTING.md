# Contributing to CodingDatafy
Thank you for your interest in contributing to **centroidium**, the native Cloudflare Worker rendering engine for [CodingDatafy](https://www.codingdatafy.com).

This repository strictly contains the **engine code, routing logic, standard UI components, and edge rendering pipelines**. If you are looking to edit or add markdown documentation pages, please contribute directly to the [`content`](https://github.com/CodingDatafy/content) repository instead.

---

## Architectural Principles
Before contributing code, please keep our fundamental design choices in mind:

* **Zero Runtime Dependencies:** The engine must remain lightweight and fast. External NPM runtime packages are strictly prohibited.
* **TypeScript Strict Mode:** All code must pass `tsc --noEmit` without warnings or implicit types.
* **Edge-Native Standard:** Core services must utilize native Cloudflare `workerd` APIs (`R2Bucket`, `Cache API`, `AnalyticsEngineDataset`).

## Development Workflow
We manage this repository with strict open-source governance standards:

### 1. Issue First Policy
Every contribution must address an existing Issue or a newly created one. This ensures that work is not duplicated and aligns with the project roadmap.

### 2. Branching Strategy
We follow a strict branching model to ensure production stability:
- **main**: Reserved for stable production releases only.
- **develop**: The primary integration branch for all new features.
- **feature/**: All work must be performed on a dedicated feature branch created from 'develop' (e.g., `feature/1-add-engine-fetcher`).

### 3. Commit Convention
Use professional English for commit messages. All commits must be linked to an issue number.
Commit messages must follow: `<type>(<scope>): <description> #issuenumber`
Example: `fix(cache): resolve edge hit header parsing #7`

## Submission Process

### Step 1: Fork and Branch
- Fork the repository and create your feature branch from the **develop** branch.

### Step 2: Implementation
- Ensure all code follows our TypeScript strict mode guidelines.
- Add the standard organizational header to every new file.

### Step 3: Quality Assurance
- Push your changes to your fork.
- Verify the build through GitHub Actions and the Cloudflare Pages Deployment logs.

### Step 4: Pull Request (PR)
- Submit a Pull Request from your feature branch to the CodingDatafy **develop** branch.
- PRs must include a detailed description of the changes and link to the relevant Issue.
- Once the PR is approved and merged into 'develop', it will be staged for the next release to 'main'.