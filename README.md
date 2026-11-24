# ABA Guardrail Studio
### AI Safeguard & Verification Console | Group 2 Research Prototype

**An evidence-based verification platform for reliable AI-assisted Applied Behavior Analysis (ABA) documentation.**

ABA Guardrail Studio is a research-stage application designed to independently validate AI-generated clinical documentation feedback before it reaches Registered Behavior Technicians (RBTs).

The platform focuses on reducing unsupported LLM outputs, detecting potential hallucinations, verifying evidence and source citations, and supporting transparent, auditable human review.

> **Project Status:** Early-stage research prototype. Synthetic data only. Not clinically validated or certified for handling protected health information (PHI).

## 1. Project Overview

AI-assisted documentation systems can improve the efficiency of reviewing ABA session notes. However, large language models may generate inaccurate findings, unsupported clinical observations, fabricated citations, or misleading recommendations.

ABA Guardrail Studio introduces an independent verification layer between an external AI evaluation engine and the feedback presented to users.

**Core objectives:**
- Verify AI-generated findings against available evidence and approved rules.
- Identify unsupported claims, fabricated citations, and potential LLM hallucinations.
- Flag uncertain, conflicting, or potentially unsafe feedback.
- Support human review of clinical or compliance-related uncertainty.
- Maintain traceable records of validation decisions and note revisions.
- Provide reproducible synthetic test cases for evaluating safeguards.

The application is a documentation quality-assurance tool, not a clinical diagnosis or treatment recommendation system.

## 2. System Architecture

```text
RBT Session Documentation
          |
          v
External AI Evaluation Engine
          |
          v
Candidate Findings (Untrusted)
          |
          v
+--------------------------------+
| GROUP 2 VERIFICATION GATEWAY   |
|                                |
| 1. Schema and Version Checks   |
| 2. Rule Applicability          |
| 3. Evidence Verification       |
| 4. Citation Validation         |
| 5. Hallucination Safeguards    |
| 6. Privacy and Safety Checks   |
+--------------------------------+
          |
          v
Guardrail Decision Engine
          |
     +----+----+
     |    |    |
  RELEASE REVIEW SUPPRESS
     |    |    |
     v    v    v
 Safe   Human  Audit
Feedback Review Log
     |
     v
RBT Revision and Re-evaluation
```

The verification layer treats AI-generated findings as untrusted until their supporting evidence and applicable requirements have been checked.

## 3. Core Application Features

| Module | Description |
|---|---|
| **Dashboard** | Monitor evaluation activity, safeguard decisions, and testing outcomes. |
| **Test Case Laboratory** | Manage synthetic cases, run supported verification checks, and compare expected versus actual outcomes. |
| **Evidence Verification** | Inspect AI-generated findings, supporting note passages, and source references. |
| **Rule & Source Registry** | Maintain documentation rules, source metadata, applicability, and version information. |
| **Human Review Queue** | Support reviewer assessment of uncertain or high-risk findings. |
| **Revision Tracking** | Compare resolved, remaining, and newly identified issues across documentation versions. |
| **Audit Trail** | Record validation events, decisions, and reviewer actions. |

## 4. AI Safeguard Framework

The application is designed around six verification outcomes.

| Decision | Description |
|---|---|
| `RELEASE_FLAG` | Evidence-supported feedback may be presented to the user. |
| `NO_FLAG` | No issue was detected for the specific criterion checked. |
| `SUPPRESS` | Unsupported, fabricated, malformed, or outdated AI output must be withheld. |
| `ABSTAIN` | Insufficient evidence or unclear applicability prevents a reliable decision. |
| `REVIEW_REQUIRED` | Qualified human review is necessary. |
| `PARTIAL_UNAVAILABLE` | A required evaluation or verification component is unavailable. |

A valid JSON response or a plausible explanation does not establish factual correctness.

### Key Safeguards

**Evidence grounding:** Findings should be supported by the documentation being evaluated.

**Citation verification:** References should correspond to verified and applicable source records.

**Hallucination prevention:** The system should not invent clinical observations, interventions, measurements, diagnoses, signatures, or outcomes.

**Version integrity:** Findings must correspond to the correct note and evaluation versions.

**Human oversight:** Consequential uncertainty should be escalated rather than automatically resolved by an LLM.

**Fail-safe behavior:** Unavailable verification must not be represented as a successful evaluation.

## 5. Group 2 Validation Dataset

The repository includes application data derived from an initial collection of **32 synthetic safeguard test cases**.

The cases cover scenarios including:

- Missing documentation fields and inconsistent session durations.
- Subjective or insufficiently detailed clinical notes.
- Unsupported behavioral observations and measurements.
- Fabricated source citations and incorrect rule application.
- False-positive feedback.
- Prompt injection and unauthorized instructions.
- Version conflicts and unavailable AI evaluation services.

The dataset is intended for independent validation and regression testing.

**Important:** These cases contain proposed expected outcomes, not clinically approved gold-standard labels. Formal validation requires independent review and documented test execution.

## 6. Technology Stack

The current application source uses:

| Component | Technology |
|---|---|
| Frontend | React 19, TypeScript |
| Routing and server functions | TanStack Router / TanStack Start |
| Build tooling | Vite |
| Styling | Tailwind CSS |
| Backend integration | Supabase |
| Database | PostgreSQL-oriented migrations |
| Data validation | Zod |
| Automated testing | Vitest |
| Package management | Bun |

The source includes database migration and authentication integration files. A source checkout does not automatically include a configured backend, database records, credentials, or user accounts.

## 7. Repository Structure

```text
AI-Safeguard-Verification-Console-Prototype/
│
├── README.md
│
└── ABA-Guardrail-Studio/
    ├── package.json
    ├── bun.lock
    ├── src/
    │   ├── routes/
    │   ├── components/
    │   ├── lib/
    │   │   ├── guardrail/
    │   │   └── group2/
    │   ├── integrations/
    │   └── test/
    ├── drizzle/
    │   └── migrations/
    ├── supabase/
    └── vite.config.ts
```

### Important Source Files

- `src/lib/guardrail/engine.ts` — Verification decision logic.
- `src/lib/guardrail/adapter.ts` — External evaluation data interfaces.
- `src/lib/guardrail/privacy.ts` — Privacy-related safeguards.
- `src/lib/group2/import.ts` — Dataset import logic.
- `src/lib/group2/runner.ts` — Synthetic scenario and deterministic test execution.
- `src/lib/group2/source.json` — Preserved Group 2 source data.
- `src/test/` — Automated test files.

## 8. Installation and Local Development

### Prerequisites

Install Node.js and Bun before starting.

### Clone the Repository

```bash
git clone https://github.com/danielhsu0816/AI-Safeguard-Verification-Console-Prototype.git

cd AI-Safeguard-Verification-Console-Prototype/ABA-Guardrail-Studio
```

### Install Dependencies

```bash
bun install
```

### Start the Development Server

```bash
bun run dev
```

Open the localhost address displayed by the terminal.

### Available Commands

```bash
bun run dev       # Start local development
bun run test      # Execute automated tests
bun run lint      # Run code quality checks
bun run build     # Build the application
bun run preview   # Preview production build
```

Backend-dependent features require a separately configured development environment. Review the application's existing Supabase integration and migration files before provisioning services.

## 9. Security, Privacy, and Compliance

This prototype is intended for research and software validation using synthetic records.

**Healthcare data restrictions:**
- Do not upload real patient records or identifiable PHI.
- Do not commit API keys, passwords, or private environment files.
- Do not interpret AI feedback as a diagnosis or clinical authorization.
- Do not assume a documentation rule applies without verifying the payer, plan, service type, and relevant dates.
- Require authorized human review for consequential clinical uncertainty.

Potentially relevant governance frameworks include applicable HIPAA requirements, healthcare documentation policies, and the NIST AI Risk Management Framework.

**This application is not certified as HIPAA-compliant.** Future clinical deployment requires appropriate legal, clinical, privacy, and security assessments.

## 10. Current Development Status

The repository contains application routes, safeguard logic, dataset import functions, synthetic testing utilities, and automated test files.

The following activities remain necessary before broader implementation:

- Confirm outstanding security fixes and initial administrator configuration.
- Verify the complete authenticated workflow in the intended deployment environment.
- Conduct independent review of proposed clinical test expectations.
- Integrate and evaluate an operational external LLM service.
- Benchmark hallucination detection and false-positive rates.
- Complete appropriate clinical and compliance assessments.

The presence of implementation code does not establish that all functions have passed deployment or security testing.

## 11. Team Collaboration

Team members are encouraged to clone the repository, review the architecture, run tests, and contribute improvements.

### Recommended Git Workflow

```bash
git checkout -b feature/your-feature-name

# Make changes and run tests

bun run test

git add .
git commit -m "Add feature description"

git push -u origin feature/your-feature-name
```

Create a Pull Request to merge changes into `main`.

Pull Requests should include a description of the change, testing performed, and screenshots for relevant UI updates.

## 12. Future Development Roadmap

1. Strengthen safeguard verification and source-grounding logic.
2. Expand the independently reviewed synthetic test dataset.
3. Establish stable integration contracts with the external evaluator.
4. Add controlled model execution and measurable reliability benchmarks.
5. Improve reviewer workflows, auditability, and access controls.
6. Conduct clinical, privacy, and security reviews before any real-data deployment.

---

**Project:** Group 2 — AI Safeguards & Feedback Verification

**Repository:** https://github.com/danielhsu0816/AI-Safeguard-Verification-Console-Prototype

**Development Platform:** Lovable

**Status:** Research Prototype — Synthetic Data Only
