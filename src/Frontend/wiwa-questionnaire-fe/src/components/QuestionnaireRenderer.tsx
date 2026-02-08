import React, { useState, useEffect } from 'react';
import type { QuestionDto, AnswerDto, QuestionnaireState, RuleDto, MatrixDto } from '../types/api';
import './QuestionnaireRenderer.css';

interface Props {
    schema: QuestionDto[]; // List of root questions
    rules?: RuleDto[];
    matrices?: MatrixDto[]; // Data for local lookup
    onChange?: (state: QuestionnaireState) => void;
    initialState?: QuestionnaireState;
    readOnly?: boolean; // Global ReadOnly override
    validationMessages?: {
        success: string;
        error: string;
        required?: string;
        format?: string;
    };
}

export interface QuestionnaireRendererHandle {
    validate: () => boolean;
}

export const QuestionnaireRenderer = React.forwardRef<QuestionnaireRendererHandle, Props>((props, ref) => {
    const { schema, rules, onChange, initialState, readOnly = false, validationMessages } = props;
    const [state, setState] = useState<QuestionnaireState>(initialState || {});
    const [errors, setErrors] = useState<Record<number, string>>({});

    useEffect(() => {
        if (initialState) {
            setState(initialState);
        }
    }, [initialState]);

    React.useImperativeHandle(ref, () => ({
        validate: () => {
            return validateForm();
        }
    }));

    const validateQuestionValue = (q: QuestionDto, value?: string, selectedAnswerIds?: number[]): string | null => {
        // Skip validation for ReadOnly questions (user cannot fix them directly)
        if (q.readOnly) return null;

        const hasValue = (value && value.trim() !== '') || (selectedAnswerIds && selectedAnswerIds.length > 0);

        if (q.isRequired && !hasValue) {
            return validationMessages?.required || 'This field is required.';
        }

        if (q.validationPattern && value) {
            try {
                const regex = new RegExp(q.validationPattern);
                if (!regex.test(value)) {
                    return validationMessages?.format || 'Invalid format.';
                }
            } catch (e) {
                console.warn('Invalid regex pattern:', q.validationPattern);
            }
        }

        return null; // Valid
    };

    const handleAnswerChange = (q: QuestionDto, answerId: number, type: 'radio' | 'checkbox') => {
        const questionId = q.questionID;
        setState(prev => {
            const newState = { ...prev };
            let newIds: number[] = [];

            if (type === 'radio') {
                newIds = [answerId];
            } else {
                const currentIds = prev[questionId]?.selectedAnswerIds || [];
                const exists = currentIds.includes(answerId);
                newIds = exists
                    ? currentIds.filter(id => id !== answerId)
                    : [...currentIds, answerId];
            }

            newState[questionId] = { ...prev[questionId], selectedAnswerIds: newIds };

            // Auto-clear validation error if valid
            const error = validateQuestionValue(q, newState[questionId].value, newIds);
            if (!error && errors[questionId]) {
                setErrors(prevErrors => {
                    const next = { ...prevErrors };
                    delete next[questionId];
                    return next;
                });
            }

            onChange?.(newState);
            return newState;
        });
    };

    // --- Rule Evaluation ---
    useEffect(() => {
        if (!rules || rules.length === 0) return;

        rules.forEach(rule => {
            if (rule.kind === 'MATRIX_LOOKUP') {
                evaluateMatrixRule(rule);
            } else if (rule.kind === 'FORMULA') {
                evaluateFormulaRule(rule);
            }
        });
    }, [state, rules]);

    // Helper to find answer code by ID (Recursive search in schema)
    const findAnswerCode = (qId: number, ansId: number, questions: QuestionDto[]): string | null => {
        for (const q of questions) {
            if (q.questionID === qId) {
                const ans = q.answers?.find(a => a.predefinedAnswerID === ansId);
                if (ans) return ans.code || ans.answer;
            }
            if (q.children) {
                const res = findAnswerCode(qId, ansId, q.children);
                if (res) return res;
            }
            if (q.answers) {
                for (const a of q.answers) {
                    if (a.subQuestions) {
                        const res = findAnswerCode(qId, ansId, a.subQuestions);
                        if (res) return res;
                    }
                }
            }
        }
        return null;
    };

    // Helper to find answer ID by Code for a specific question
    const findAnswerIdByCode = (qId: number, code: string, questions: QuestionDto[]): number | null => {
        for (const q of questions) {
            if (q.questionID === qId) {
                const ans = q.answers?.find(a => a.code === code);
                if (ans) return ans.predefinedAnswerID;
            }
            if (q.children) {
                const res = findAnswerIdByCode(qId, code, q.children);
                if (res) return res;
            }
            if (q.answers) {
                for (const a of q.answers) {
                    if (a.subQuestions) {
                        const res = findAnswerIdByCode(qId, code, a.subQuestions);
                        if (res) return res;
                    }
                }
            }
        }
        return null;
    };

    const evaluateFormulaRule = (rule: RuleDto) => {
        if (!rule.formula) return;

        const regex = /\{(\d+)\}/g;
        let match;
        const idSet = new Set<number>();

        while ((match = regex.exec(rule.formula)) !== null) {
            idSet.add(parseInt(match[1], 10));
        }

        let expr = rule.formula;
        let allValid = true;

        for (const id of idSet) {
            const valStr = state[id]?.value;
            if (valStr) {
                const val = parseFloat(valStr.replace(',', '.'));
                if (!isNaN(val)) {
                    expr = expr.replace(new RegExp(`\\{${id}\\}`, 'g'), val.toString());
                } else {
                    allValid = false;
                    break;
                }
            } else {
                allValid = false;
                break;
            }
        }

        let finalValue = '';
        if (allValid && idSet.size > 0) {
            try {
                // eslint-disable-next-line no-new-func
                const result = new Function(`return ${expr}`)();
                if (typeof result === 'number' && !isNaN(result)) {
                    finalValue = result.toFixed(2);
                }
            } catch (e) {
                console.warn('Formula eval error:', expr, e);
            }
        }

        if (state[rule.questionId]?.value !== finalValue) {
            setState(prev => ({
                ...prev,
                [rule.questionId]: { ...prev[rule.questionId], value: finalValue }
            }));
            if (finalValue && errors[rule.questionId]) {
                setErrors(prev => { const n = { ...prev }; delete n[rule.questionId]; return n; });
            }
        }
    };

    const evaluateMatrixRule = (rule: RuleDto) => {
        const inputs = rule.inputQuestionIds;
        if (!inputs || inputs.length === 0) return;

        // 1. Resolve Input Values (Keys)
        const inputValues: Record<string, number> = {};
        // We map inputs[i] -> matrix.definition.keyColumns[i]

        // Find the matrix definition
        const matrix = (rules && props.matrices) ? props.matrices.find(m => m.matrixName === rule.matrixName) : null;

        if (!matrix) {
            console.warn(`Matrix '${rule.matrixName}' not found in schema.`);
            return;
        }

        const keys = matrix.definition.keyColumns;
        if (inputs.length !== keys.length) {
            console.warn(`Matrix inputs mismatch: Rule has ${inputs.length}, Matrix has ${keys.length}`);
            // Attempt partial matching or just proceed? Safer to abort.
            // return;
        }

        let allPresent = true;

        for (let i = 0; i < inputs.length; i++) {
            const inputId = inputs[i];
            const keyCol = keys[i]; // Map by index
            const qState = state[inputId];

            let val: number | null = null;

            if (qState?.selectedAnswerIds && qState.selectedAnswerIds.length > 0) {
                const ansId = qState.selectedAnswerIds[0];
                const code = findAnswerCode(inputId, ansId, schema);
                if (code) {
                    val = parseInt(code, 10);
                }
            } else if (qState?.value) {
                val = parseInt(qState.value, 10);
            }

            if (val !== null && !isNaN(val)) {
                inputValues[keyCol] = val; // Store by Column Name!
            } else {
                allPresent = false;
            }
        }

        let targetAnsId: number | null = null;

        if (allPresent) {
            // 2. Perform Lookup
            const match = matrix.data.find(row => {
                // Check if all key columns match
                return keys.every(k => row[k] === inputValues[k]);
            });

            if (match) {
                // 3. Extract Result
                const resultCol = matrix.definition.valueColumns[0]; // Assuming single value output for now
                const resultVal = match[resultCol];

                // 4. Map Result Code to Answer ID
                if (resultVal !== undefined) {
                    targetAnsId = findAnswerIdByCode(rule.questionId, resultVal.toString(), schema);
                }
            }
        }

        // 5. Update State
        const currentIds = state[rule.questionId]?.selectedAnswerIds || [];
        const shouldBeIds = targetAnsId ? [targetAnsId] : [];

        if (JSON.stringify(currentIds) !== JSON.stringify(shouldBeIds)) {
            setState(prev => ({
                ...prev,
                [rule.questionId]: { ...prev[rule.questionId], selectedAnswerIds: shouldBeIds }
            }));
            if (shouldBeIds.length > 0 && errors[rule.questionId]) {
                setErrors(prev => { const n = { ...prev }; delete n[rule.questionId]; return n; });
            }
        }
    };

    const handleTextChange = (q: QuestionDto, val: string) => {
        const questionId = q.questionID;
        setState(prev => {
            const newState = { ...prev, [questionId]: { ...prev[questionId], value: val } };

            // Auto-clear validation error if valid
            const error = validateQuestionValue(q, val, newState[questionId].selectedAnswerIds);
            if (!error && errors[questionId]) {
                setErrors(prevErrors => {
                    const next = { ...prevErrors };
                    delete next[questionId];
                    return next;
                });
            }

            onChange?.(newState);
            return newState;
        });
    };

    const isAnswerSelected = (qid: number, aid: number) => {
        return state[qid]?.selectedAnswerIds?.includes(aid);
    };

    const validateForm = (): boolean => {
        const newErrors: Record<number, string> = {};
        console.log("Validating form...", schema);

        const validateRecursive = (questions: QuestionDto[]) => {
            questions.forEach(q => {
                const valState = state[q.questionID];
                const error = validateQuestionValue(q, valState?.value, valState?.selectedAnswerIds);

                if (error) {
                    newErrors[q.questionID] = error;
                    console.log(`Validation Failed for Q${q.questionID}:`, error);
                }

                // 2. Validate Children (Always Visible)
                if (q.children) {
                    validateRecursive(q.children);
                }

                // 3. Validate SubQuestions of SELECTED Answers
                if (q.answers && valState?.selectedAnswerIds) {
                    q.answers.forEach(ans => {
                        if (valState.selectedAnswerIds!.includes(ans.predefinedAnswerID)) {
                            if (ans.subQuestions) {
                                validateRecursive(ans.subQuestions);
                            }
                        }
                    });
                }
            });
        };

        validateRecursive(schema);
        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            // Alert removed; App.tsx will handle the notification
            return false;
        } else {
            return true;
        }
    };

    const renderControls = (q: QuestionDto, hasDirectChildren: boolean) => {
        const controlType = q.uiControl ? q.uiControl.toLowerCase() : 'text';
        const isReadOnly = readOnly || q.readOnly;

        switch (controlType) {
            case 'label':
                return null;
            case 'radio':
            case 'radio button input':
            case 'boolean':
            case 'checkbox':
            case 'checkbox input':
            case 'select': // Added Select support

                // Safe check for answers
                if (!q.answers || q.answers.length === 0) return <div className="no-answers">(No answers defined)</div>;

                if (controlType === 'select') {
                    // Simple select implementation
                    const selectedValue = state[q.questionID]?.selectedAnswerIds?.[0] || '';
                    return (
                        <select
                            className="text-input"
                            value={selectedValue}
                            disabled={isReadOnly}
                            onChange={(e) => handleAnswerChange(q, Number(e.target.value), 'radio')}
                        >
                            <option value="">-- Select --</option>
                            {q.answers.map(ans => (
                                <option key={ans.predefinedAnswerID} value={ans.predefinedAnswerID}>
                                    {ans.answer}
                                </option>
                            ))}
                        </select>
                    );
                }

                return (
                    <div className="options-list">
                        {q.answers.map(ans => renderAnswerOption(q, ans, controlType, hasDirectChildren, isReadOnly))}
                    </div>
                );
            case 'text':
            case 'input':
            case 'text input':
                return (
                    <input
                        type="text"
                        className="text-input"
                        value={state[q.questionID]?.value || ''}
                        readOnly={isReadOnly}
                        disabled={isReadOnly}
                        onChange={(e) => handleTextChange(q, e.target.value)}
                    />
                );
            case 'date':
                return (
                    <input
                        type="date"
                        className="text-input"
                        value={state[q.questionID]?.value || ''}
                        readOnly={isReadOnly}
                        disabled={isReadOnly}
                        onChange={(e) => handleTextChange(q, e.target.value)}
                    />
                );
            case 'textarea':
                return (
                    <textarea
                        className="text-input"
                        rows={3}
                        value={state[q.questionID]?.value || ''}
                        readOnly={isReadOnly}
                        disabled={isReadOnly}
                        onChange={(e) => handleTextChange(q, e.target.value)}
                    />
                );
            default:
                return <div>Unknown Control: {q.uiControl}</div>;
        }
    };

    const renderAnswerOption = (q: QuestionDto, ans: AnswerDto, controlType: string, hasDirectChildren: boolean, isReadOnly: boolean) => {
        const isSelected = isAnswerSelected(q.questionID, ans.predefinedAnswerID);
        const isCheckbox = controlType.includes('checkbox');
        const inputType = isCheckbox ? 'checkbox' : 'radio';

        return (
            <div key={ans.predefinedAnswerID} className="answer-wrapper">
                <label className={`answer-option ${isReadOnly ? 'disabled-option' : ''} ${isSelected ? 'selected-option' : ''}`}>
                    <input
                        type={inputType}
                        name={`q_${q.questionID}`}
                        checked={isSelected || false}
                        disabled={isReadOnly}
                        onChange={() => !isReadOnly && handleAnswerChange(q, ans.predefinedAnswerID, inputType)}
                    />
                    <span className="answer-text">{ans.answer}</span>
                </label>
                {/* Render Inline Sub-questions if Selected AND NOT a Group Question (hasDirectChildren is false) */}
                {isSelected && !hasDirectChildren && ans.subQuestions && ans.subQuestions.length > 0 && (
                    <div className="inline-sub-questions">
                        {ans.subQuestions.map(sq => renderQuestion(sq))}
                    </div>
                )}
            </div>
        );
    };

    const renderQuestion = (q: QuestionDto) => {
        // Handle SectionLabel (Format 99)
        const isSectionLabel = q.uiControl === 'SectionLabel' || q.questionLabel === 'SectionLabel' || (q.uiControl && q.uiControl.toLowerCase() === 'sectionlabel');
        // Or check by ID if needed, but backend sends uiControl mapped from Format.

        if (isSectionLabel) {
            return (
                <div key={q.questionID} className="section-label-container">
                    <h3 className="section-header">{q.questionText}</h3>
                    {q.children && q.children.length > 0 && (
                        <div className="section-body">
                            {q.children.map(child => renderQuestion(child))}
                        </div>
                    )}
                </div>
            );
        }

        const error = errors[q.questionID];
        const valState = state[q.questionID];

        // Collect sub-questions from selected answers
        const selectedSubQuestions = q.answers?.filter(ans =>
            valState?.selectedAnswerIds?.includes(ans.predefinedAnswerID)
        ).flatMap(ans => ans.subQuestions || []) || [];

        // Determine rendering mode:
        // If question has direct children (e.g. inputs for computed question), render sub-questions at the bottom to maintain flow.
        // Otherwise (standard question), render sub-questions inline for better UX.
        const hasDirectChildren = q.children && q.children.length > 0;

        // Combine both into a single list and sort by questionOrder (Only used if hasDirectChildren is true)
        const allNestedQuestions = hasDirectChildren ? [
            ...selectedSubQuestions,
            ...q.children
        ].sort((a, b) => (a.questionOrder || 0) - (b.questionOrder || 0)) : [];

        const hasNestedContent = allNestedQuestions.length > 0;

        return (
            <div key={q.questionID} className={`question-card type-${q.uiControl} ${error ? 'has-error' : ''}`}>
                <div className="question-header">
                    <span className="q-text">{q.questionText} {q.isRequired && <span className="required-mark">*</span>}</span>
                    {q.questionLabel && <span className="q-label">({q.questionLabel})</span>}
                </div>

                <div className="question-body">
                    {renderControls(q, hasDirectChildren)}
                </div>
                {error && <div className="error-message">{error}</div>}

                {/* Render sorted/merged children ONLY if this is a Group/Computed question with direct children */}
                {hasDirectChildren && hasNestedContent && (
                    <div className="nested-questions-container">
                        {allNestedQuestions.map(nestedQ => (
                            <div key={`nested_${nestedQ.questionID}`} className="nested-question-wrapper">
                                {renderQuestion(nestedQ)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (!schema || !Array.isArray(schema)) {
        return <div>No questions to display (Schema is empty or invalid)</div>;
    }

    return (
        <div className="wiwa-renderer">
            {schema.map(q => renderQuestion(q))}
        </div>
    );
});
