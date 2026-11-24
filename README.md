# ABA Guardrail Studio
### AI Safeguard & Verification Console for Healthcare RAG Systems

An AI-powered verification and safeguard prototype developed by **Group 2** to support the reliability, transparency, and safety of a healthcare Retrieval-Augmented Generation (RAG) chatbot designed for autism-related applications.

## Project Overview

Our team focuses on the **Guardrail and Verification Layer**, working alongside Group 1's dataset and codebook.

The goal is to evaluate AI-generated responses, verify supporting evidence, identify potential hallucinations, and support human review before feedback is released.

## Key Features

- **AI Response Verification:** Evaluate generated feedback against available source evidence and validation rules.
- **Hallucination Detection:** Identify potentially unsupported or fabricated claims.
- **Evidence Checking:** Examine whether AI responses are supported by relevant source materials.
- **Rule Registry:** Organize verification rules and codebook mappings.
- **Guardrail Testing:** Manage test cases and evaluate validation outcomes.
- **Human Review:** Support review workflows for flagged or uncertain responses.
- **Audit Tracking:** Support traceability of verification decisions.
- **Privacy Safeguards:** Incorporate privacy-related checks into the verification workflow.

These features are part of an evolving prototype. Full backend integration and production readiness have not yet been established.

## Project Architecture

```text
Group 1: Dataset & Codebook
           |
           v
Healthcare RAG System
           |
           v
Group 2: ABA Guardrail Studio
           |
           +-- Evidence Verification
           +-- Hallucination Checks
           +-- Rule-Based Validation
           +-- Privacy Screening
           +-- Human Review
           +-- Audit Tracking
           |
           v
Verified / Flagged / Withheld Feedback
```

## Build with Lovable

This prototype was developed using [Lovable](https://lovable.dev).

Continue developing the project in the [Lovable Editor](https://lovable.dev/projects/5e876f40-7cdf-4e21-93cd-8f4e485ce7a6).

- **Rapid Prototyping:** Develop and refine interfaces using AI-assisted development.
- **GitHub Integration:** Collaborate through version control.
- **Extensibility:** Expand verification workflows, datasets, and backend integrations.

## Local Development

### Prerequisites

- Node.js
- npm
- Git
- Visual Studio Code (recommended)

### Installation

Clone the repository:

```bash
git clone https://github.com/danielhsu0816/AI-Safeguard-Verification-Console-Prototype.git
```

Navigate into the project:

```bash
cd AI-Safeguard-Verification-Console-Prototype
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal, typically:

`http://localhost:8080/`

Some features may require additional environment variables or backend configuration.

## Collaboration

Team members can clone the repository, modify the application locally, and submit improvements through GitHub.

```bash
git checkout -b feature/my-improvement
git add .
git commit -m "Describe your changes"
git push -u origin feature/my-improvement
```

Create a Pull Request to propose changes for review.

## Healthcare Safety & Compliance

This prototype explores guardrail mechanisms informed by healthcare data protection and responsible AI principles, including HIPAA considerations, privacy protection, evidence traceability, and human oversight.

**Disclaimer:** This is a research and development prototype, not a certified medical device or a clinically validated decision-support system. It should not be used with real patient information without appropriate security, privacy, regulatory, and institutional review.

## Project Status

**Status: Prototype — Under Active Development**

Current priorities include integration with Group 1's dataset and codebook, verification testing, backend validation, and strengthening privacy and safety controls.

---

Developed by **Group 2 — AI Safeguard & Verification Team**.
