# Architecture & Design: Data-Driven Questionnaire Module

## Overview
This document defines the architectural model for the WIWA Questionnaire Module. The core design philosophy is **Data-Driven UI**: the structure, behavior, and logic of the frontend are entirely determined by data records in the database, served via a generic JSON schema. The Frontend contains **no hardcoded business logic** specific to any questionnaire type.

## Data Flow
`Database (Relational)` -> `API Service (Mapping)` -> `JSON Schema (Hierarchical)` -> `Frontend Renderer (Generic)`

---

## 1. Database Schema & GUI Mapping
The following table explains how database columns map to JSON properties and Frontend UI behavior.

| DB Table/Column | JSON Property | Frontend GUI Behavior |
| :--- | :--- | :--- |
| **Questions** | | |
| `QuestionText` | `questionText` | Displays as the main label/title of the component. |
| `QuestionLabel` | `questionLabel` | Displays as a small code prefix (e.g., "Q1"). |
| `QuestionFormatID` -> `QuestionFormats.Code` | `uiControl` | Determines the **Component Type** to render (e.g., `checkbox`, `radio`, `text`, `section-label`). |
| `SpecificQuestionTypeID` | `specificTypeId` | **1 (Always)**: Rendered immediately. <br>**2 (Conditional)**: Hiden until triggered by a parent answer (Branching). <br>**3 (Computed)**: Read-only, value calculated by Rule Engine. |
| `ParentQuestionID` | `children` | **Grouping/Layout**: Questions with a ParentID (that are NOT branched answers) are rendered nested inside the parent container. Used for `SectionLabel` groups or multi-part questions (e.g., BMI -> Height/Weight). |
| `ReadOnly` | `readOnly` | **State**: If `true`, the input field is disabled (grayed out). Valid for computed fields or pre-filled data. |
| `IsRequired` | `isRequired` | **Validation**: If `true`, the `Validate` function prevents submission if the field is empty, highlighting it in red. |
| **QuestionFormats** | | |
| `Code` | `uiControl` | The contract key. Examples: `text`, `radio`, `select`, `checkbox`, `section-label`. The Frontend maps this string to a React component. |
| **PredefinedAnswers** | | |
| `Answer` | `answers[].answer` | The text label of the option (Radio/Checkbox/Select option). |
| **PredefinedAnswerSubQuestions** | | |
| *(Join Table)* | `answers[].subQuestions`| **Branching Logic**: If an answer is selected, the questions linked here are dynamically rendered (expanded) immediately below the answer. |
| **QuestionComputedConfigs** | | |
| `RuleName`, `Inputs` | `rules[]` | **Logic**: Defines client-side calculations (e.g., BMI). The frontend 'Rule Engine' listens for changes in `InputQuestionIds` and updates the target field. |

---

## 2. Combinations & Edge Cases

### Markings (Flags)
- **ReadOnly + Computed**: The standard pattern for calculated fields (BMI). User sees the value but cannot edit it.
- **Required + Conditional**: A field that is "Required" is only validated **IF** it is currently visible (i.e., its parent branch is active). If the branch is hidden, validation ignores it.

### Structural Combinations
- **SectionLabel (Parent) + Children**: Renders as a Header (`<h3>`) with the children rendered sequentially in a "body" block below. No input control for the parent.
- **Checkbox (Parent) + Conditional SubQuestions**: Selecting a checkbox option expands the specific sub-questions linked to *that specific option* (Branching).
- **Complex Nesting**: A SubQuestion can itself be a Parent to other questions or have its own Branching. The recursion handles infinite depth.

---

## 3. Future Improvements: Generic Formulas
Currently, `QuestionComputedConfigs` maps to a `kind` (e.g., `BMI_CALC`) which matches a function in the Frontend. 
**Improvement**: Store the *mathematical expression* directly in the database (e.g., `inputs[1] / (inputs[0]/100)^2`).
- **DB**: Add `FormulaExpression` column.
- **Frontend**: Implement a safe expression parser (or use a library like `math.js`) to evaluate the string at runtime.
- **Benefit**: Create new calculated types without deploying new Frontend code.

---

## 4. Key Takeaways for the Team
1.  **Strictly Additive**: To add a new questionnaire, you ONLY insert data. No code changes.
2.  **Format Codes Matter**: The `QuestionFormats.Code` must match a supported type in the Frontend Registry (`renderControls` switch statement).
3.  **Validation is Schema-Driven**: Do not write custom validation logic in JS. Set `IsRequired` and `ValidationPattern` (Regex) in the database.
