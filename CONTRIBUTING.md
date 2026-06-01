# Contributing to CodingDatafy

Thank you for your interest in contributing to CodingDatafy **as we build** the world's largest coding language reference. To maintain project integrity and professional standards, please follow these guidelines.

## Development Workflow

### 1. Issue First Policy
Every contribution must address an existing Issue or a newly created one. This ensures that work is not duplicated and aligns with the project roadmap.

### 2. Branching Strategy
We follow a strict branching model to ensure production stability:
- **main**: Reserved for stable production releases only.
- **develop**: The primary integration branch for all new features.
- **feature/**: All work must be performed on a dedicated feature branch created from 'develop' (e.g., `feature/1-add-engine-fetcher`).

### 3. Commit Convention
Use professional English for commit messages. All commits must be linked to an issue number.
Example: `feat(routing): implement dynamic sub-directory slug resolution #1`

## Submission Process

### Step 1: Fork and Branch
- Fork the repository and create your feature branch from the **develop** branch.

### Step 2: Implementation
- Ensure all code follows our TypeScript strict mode guidelines.
- Add the standard organizational header to every new file.

### Step 3: Quality Assurance
- Push your changes to your fork.
- Verify the build through GitHub Actions and the Vercel Preview URL provided in the Pull Request.

### Step 4: Pull Request (PR)
- Submit a Pull Request from your feature branch to the CodingDatafy **develop** branch.
- PRs must include a detailed description of the changes and link to the relevant Issue.
- Once the PR is approved and merged into 'develop', it will be staged for the next release to 'main'.

## Coding and Content Standards

### Documentation Standards
- **Source Code (TS/TSX/CSS):** Every file must include the standard `@project` header as a comment at the beginning of the file:
```typescript
/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */
 ```

### Technical Integrity
- Do not bypass TypeScript compiler errors.
- Ensure that no sensitive information (API keys, personal data) is included in your contribution.

Copyright (c) 2026 CodingDatafy Organization.