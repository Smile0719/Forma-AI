---
name: debugging-and-validation
description: "Use when investigating a bug, failing test, runtime regression, or unexpected behavior in this repo. Follow a root-cause workflow: reproduce, isolate, add or confirm a failing check, patch the minimal cause, and verify the fix with targeted evidence."
---

# Debugging and Verification

## When to use this skill

Use this skill when you need to:
- diagnose a failing test or bug report
- trace an unexpected runtime or UI behavior
- confirm a regression before changing code
- implement a fix and verify it with evidence

## Core workflow

### 1. Reproduce the problem
- Confirm the exact symptom, input, and expected behavior.
- Capture the smallest reliable reproduction.
- If the issue is not reproducible, gather missing details before changing code.

### 2. Localize the root cause
- Trace the data flow and identify the narrowest layer where behavior diverges.
- Check recent changes, assumptions, and invariants.
- Prefer one concrete hypothesis over broad guessing.

### 3. Add or confirm a failing check
- Write a focused failing test or minimal reproduction when possible.
- Ensure the failure matches the real behavior, not a mock-only expectation.
- Keep the check targeted to the actual bug.

### 4. Fix the root cause, not the symptom
- Apply the smallest patch that addresses the underlying issue.
- Avoid unrelated refactors while the bug is being fixed.
- Keep the change aligned with existing project conventions.

### 5. Verify with the smallest relevant proof
- Run the closest command that checks the changed behavior.
- Prefer the targeted test or validation step over a broad suite.
- Confirm the fix with fresh output before claiming success.

### 6. Summarize evidence
- State the root cause briefly.
- Describe the fix in plain terms.
- Cite the exact validation command and outcome.

## Decision points

- If the bug is reproducible: move directly to root-cause investigation and a failing check.
- If the bug is not reproducible: collect exact steps, environment, and data before patching.
- If multiple hypotheses exist: isolate them by checking one boundary or dependency at a time.
- If a patch is broad or speculative: narrow the scope and test the smallest case again.
- If validation is noisy or incomplete: choose the most relevant specific test rather than a full suite.

## Completion checks

Only finish when all of the following are true:
- The root cause is identified and explained.
- A failing reproduction or regression check exists or was confirmed.
- The fix is minimal and addresses the underlying cause.
- The relevant validation command passes with fresh output.
- The final answer includes what changed and how it was verified.

## Quality bar

- Do not claim a fix without evidence.
- Do not broaden scope during a bug fix unless required by the root cause.
- Do not rely only on mocked behavior when real behavior can be tested.
- Prefer targeted validation over noisy, expensive checks.

## Example prompts

- "Investigate why the form fails to load the schema and fix the root cause."
- "The test is failing in the validation flow; trace the bug and patch it with evidence."
- "Find the cause of the regression in the conditional field behavior and verify with a focused test."
- "Reproduce the issue, add a failing check, implement the minimal fix, and confirm it passes."
