# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., TypeScript ~6.0, React 19]

**Primary Dependencies**: [e.g., Vite, TanStack Query, React Router, openapi-typescript]

**Storage**: [N/A — server state comes from the API through TanStack Query; note any browser storage used]

**Testing**: [e.g., Vitest, Testing Library, MSW handlers generated from the OpenAPI contract]

**Target Platform**: [e.g., modern evergreen browsers, served by Vite]

**Project Type**: [e.g., single-page web application, operator panel]

**Performance Goals**: [story-specific, e.g., list renders 50 rows without jank, or NEEDS CLARIFICATION]

**Constraints**: [story-specific, e.g., every screen handles loading/empty/error, no real authentication yet, X-Tenant-Id is a placeholder]

**Scale/Scope**: [story-specific, e.g., how many screens, how many endpoints consumed]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., src/pages/..., src/api/...).
  The delivered plan must not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: API client and generated types
src/api/
├── schema.d.ts          # generated from api-notificaciones.yaml, never edited by hand
└── client.ts

# [REMOVE IF UNUSED] Option 2: screens, components and data hooks
src/pages/[Screen].tsx
src/components/[Component].tsx
src/hooks/[useSomething].ts

# [REMOVE IF UNUSED] Option 3: tests
src/**/*.test.tsx        # next to the code they cover
src/test/handlers/       # MSW handlers shared by tests
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., a new dependency] | [current need] | [why the existing stack isn't enough] |
