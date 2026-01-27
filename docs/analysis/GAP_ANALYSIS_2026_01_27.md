# BA/DBA Gap Analysis Session Report
**Date:** 2026-01-27
**Topic:** Questionnaire System - Documentation vs Implementation Review

## 1. Executive Summary

This report compares the initial system architecture and workflows (BA/DBA designed) with the current actual implementation (Frontend & Backend/SQL). 
**Key Findings:** The core data model and JSON nesting structure are aligned, but the **runtime environment (Embedded mode)** and **generic computation engine (Matrix Lookups)** are significantly incomplete or hardcoded.

---

## 2. Business Analyst (BA) Perspective

### Analysis of Requirements vs. Experience

| Requirement Area | Defined Specification (Docs/Workflows) | Current Implementation (Frontend `src`) | Status |
|-----------------|------------------------------------------|----------------------------------------|--------|
| **Deployment Mode** | **Embeddable Module** (Iframe + PostMessage). The host application controls the questionnaire. | **Standalone Web App**. Runs directly in root. No `parent.postMessage` logic found. | 🔴 **CRITICAL GAP** |
| **Logic Engine** | **Generic Rules Engine**. Can calculate any value based on `rules` (e.g., Matrix Lookup). | **Hardcoded "BMI_CALC"**. The renderer only supports specific hardcoded rule kinds; it ignores generic matrix definitions. | 🟠 **MAJOR GAP** |
| **Branching UX** | Dynamic display of sub-questions under selected answers. | **Implemented**. Recursive rendering correctly handles nested questions. | ✅ **OK** |
| **Validation** | Mandatory fields and Regex patterns supported. | **Partially Implemented**. Frontend has logic for `isRequired` and `validationPattern`, but **data might be missing** from backend. | ⚠️ **RISK** |

### Recommendations (BA)
1.  **Immediate Priority**: Refactor `main.tsx` and `App.tsx` option to support the "Embedded" workflow defined in `/develop-questionnaire-module`.
2.  **Scalability**: The "BMI_CALC" hardcoding is technical debt. We must implement the generic `MATRIX_LOOKUP` handler in the frontend or we will need code changes for every new calculation type.
3.  **Data Integrity**: Ensure `ValidationPattern` and `IsRequired` are actually stored in the DB and exported.

---

## 3. Database Administrator (DBA) Perspective

### Analysis of Data Model & JSON Generator

| Data Point | Model Definition (`MODEL.sql` / Generator) | Frontend Expectation (`types/api.ts`) | Status |
|------------|--------------------------------------------|---------------------------------------|--------|
| **Structure** | Nested JSON (`Children`, `SubQuestions`, `rules`). | Matches. Expects recursive nesting. | ✅ **OK** |
| **Validations** | Generator explicitly selects: `QuestionID`, `Text`, `Format`, `SpecificType`, `ReadOnly`. | Expects: `isRequired`, `validationPattern`. | 🔴 **MISSING DATA** |
| **Rules Data** | Exports `matrixName`, `resultCodeColumn`. | Frontend expects `kind` (string) and inputs. Generator provides `kind` as `cm.Code`. | ⚠️ **MISMATCH** |
| **Controls** | Generator maps `%Radio%` -> `radio`. | Frontend maps `radio`, `select`, `text`. | ⚠️ **INCOMPLETE MAPPING** |

### Identified Gaps in SQL Generator (`JSON_File_Generator...sql`)
1.  **Missing Columns**: The `Questions` table in the generator query does not include `IsRequired` (or `Mandatory`) and `ValidationPattern`, causing the Frontend to never receive validation rules.
2.  **Rule Complexity**: The generator tries to infer `inputQuestionIds` by looking at children (`c.ParentQuestionID = qcc.QuestionID`). This works for strict hierarchy but might fail if inputs are siblings. The workflow `/setup-computed-question` suggests inputs can be siblings (Child 1..4). The query limiting inputs to *direct children* might be too restrictive.

### Recommendations (DBA)
1.  **Update Generator**: Modify the SQL script to include `IsRequired` and `ValidationPattern` (if columns exist in `Questions`).
2.  **Validation Columns**: If columns don't exist in `Questions` table, we need a schema migration immediately.
3.  **UI Control Logic**: Update the `@UiControlMap` table variable in the SQL script to explicitly cover `Select`, `Date`, etc., to match Frontend capabilities.

---

## 4. Gap Resolution Plan

### Gap 1: Standalone vs Embedded
*   **Fix**: Implement `window.addEventListener('message')` in `main.tsx` as per `/develop-questionnaire-module`.
*   **Why we missed it**: Implementation likely focused on getting the UI working locally ("Standalone") first.

### Gap 2: Generic Matrix Calculation
*   **Fix**: Replace `evaluateBmiRule` in `QuestionnaireRenderer.tsx` with a generic `evaluateRule` that parses the `rules` matrix definition.
*   **Why we missed it**: "BMI" was likely used as a Proof-of-Concept, but the generic engine wasn't built.

### Gap 3: Missing Validation Data
*   **Fix**:
    1.  Check `Questions` table definition.
    2.  Update `JSON_File_Generator` to select `IsRequired` and `ValidationPattern`.
*   **Why we missed it**: The Frontend `types` were defined ahead of the SQL generator updates.

---

## 5. Next Steps
1.  Run `SELECT * FROM Questions` to verify if validation columns exist.
2.  Update the SQL Generator.
3.  Refactor Frontend `main.tsx` for embedded support.
