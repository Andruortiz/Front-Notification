---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Include them for every story of size M or larger; smaller stories may use a single flow test.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Paths below assume the project's real structure (`src/api/`, `src/pages/`, `src/components/`, `src/hooks/`) — adjust based on plan.md structure

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Confirm `src/api/schema.d.ts` is up to date with the OpenAPI contract (regenerate it if the contract changed)
- [ ] T002 Add any new dependency to `package.json` and justify it in plan.md
- [ ] T003 [P] Confirm `tsc -b` and ESLint cover the new files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared pieces that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Extend the API client in `src/api/client.ts` if a new call shape is needed
- [ ] T005 [P] Add or update MSW handlers in `src/test/handlers/` for the endpoints the feature consumes
- [ ] T006 [P] Create the shared data hook in `src/hooks/` if several screens use the same query
- [ ] T007 Confirm the existing tests, lint and type check still pass with the new structure

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [P] [US1] Component test with Testing Library in `src/pages/[Screen].test.tsx` (loading, empty, error and data states)
- [ ] T011 [P] [US1] Flow test against MSW handlers covering the story's main scenario (Constitution Principle III)

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create the [Component] in `src/components/[Component].tsx`
- [ ] T013 [P] [US1] Create the data hook in `src/hooks/[useSomething].ts`
- [ ] T014 [US1] Implement the screen in `src/pages/[Screen].tsx` (depends on T012, T013)
- [ ] T015 [US1] Register the route in `src/routes.tsx`
- [ ] T016 [US1] Handle loading, empty and error states explicitly
- [ ] T017 [US1] Confirm `npm run build`, `npm run lint` and the test suite pass for this story

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 ⚠️

- [ ] T018 [P] [US2] Component test with Testing Library in `src/pages/[Screen].test.tsx`
- [ ] T019 [P] [US2] Flow test against MSW handlers

### Implementation for User Story 2

- [ ] T020 [P] [US2] Create the [Component] in `src/components/[Component].tsx`
- [ ] T021 [US2] Implement the screen or hook changes
- [ ] T022 [US2] Wire it into the existing routes
- [ ] T023 [US2] Integrate with User Story 1 components (if needed)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 ⚠️

- [ ] T024 [P] [US3] Component test with Testing Library
- [ ] T025 [P] [US3] Flow test against MSW handlers

### Implementation for User Story 3

- [ ] T026 [P] [US3] Create the [Component]
- [ ] T027 [US3] Implement the screen or hook changes
- [ ] T028 [US3] Wire it into the existing routes

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates, if any (never cited from the spec — keep this file self-contained)
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX Check that no data or cache survives a tenant change
- [ ] TXXX [P] Additional tests
- [ ] TXXX Run quickstart.md validation against a running backend

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types and hooks before screens
- Screens before routes
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if capacity allows)
- All tests for a user story marked [P] can run in parallel
- Components within a story marked [P] can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Demo (MVP!)
3. Add User Story 2 → Test independently → Demo
4. Add User Story 3 → Test independently → Demo
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group (one branch per story — single-line commits, Principle V)
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
