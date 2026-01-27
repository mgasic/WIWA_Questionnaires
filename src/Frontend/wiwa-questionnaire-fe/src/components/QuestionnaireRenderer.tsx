import React, { useState, useEffect } from 'react';
import type { QuestionDto, AnswerDto, QuestionnaireState, RuleDto } from '../types/api';
import './QuestionnaireRenderer.css';

interface Props {
    schema: QuestionDto[]; // List of root questions
    rules?: RuleDto[];
    onChange?: (state: QuestionnaireState) => void;
}

export const QuestionnaireRenderer: React.FC<Props> = ({ schema, rules, onChange }) => {
    const [state, setState] = useState<QuestionnaireState>({});
    const [errors, setErrors] = useState<Record<number, string>>({});

    const validateQuestionValue = (q: QuestionDto, value?: string, selectedAnswerIds?: number[]): string | null => {
        const hasValue = (value && value.trim() !== '') || (selectedAnswerIds && selectedAnswerIds.length > 0);

        if (q.isRequired && !hasValue) {
            return 'This field is required.';
        }

        if (q.validationPattern && value) {
            try {
                const regex = new RegExp(q.validationPattern);
                if (!regex.test(value)) {
                    return 'Invalid format.';
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
            if (rule.kind === 'BMI_CALC') {
                evaluateBmiRule(rule);
            }
        });
    }, [state, rules]);

    const evaluateBmiRule = (rule: RuleDto) => {
        const inputs = rule.inputQuestionIds;
        if (!inputs || inputs.length < 2) {
            console.warn('BMI rule missing inputs:', rule);
            return;
        }

        const hId = inputs[0]; // Height
        const wId = inputs[1]; // Weight

        const hVal = state[hId]?.value;
        const wVal = state[wId]?.value;

        if (hVal && wVal) {
            const h = parseFloat(hVal.replace(',', '.'));
            const w = parseFloat(wVal.replace(',', '.'));

            if (!isNaN(h) && !isNaN(w) && h > 0) {
                const hM = h / 100;
                const bmi = (w / (hM * hM)).toFixed(2);

                if (state[rule.questionId]?.value !== bmi) {
                    console.log(`Calculating BMI for Q${rule.questionId}: H=${h}, W=${w} => BMI=${bmi}`);
                    setState(prev => ({
                        ...prev,
                        [rule.questionId]: { ...prev[rule.questionId], value: bmi }
                    }));

                    // Auto-clear validation error for BMI field if it exists
                    if (errors[rule.questionId]) {
                        setErrors(prevErrors => {
                            const next = { ...prevErrors };
                            delete next[rule.questionId];
                            return next;
                        });
                    }
                }
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

    const validateForm = () => {
        const newErrors: Record<number, string> = {};

        const validateRecursive = (questions: QuestionDto[]) => {
            questions.forEach(q => {
                const valState = state[q.questionID];
                const error = validateQuestionValue(q, valState?.value, valState?.selectedAnswerIds);

                if (error) {
                    newErrors[q.questionID] = error;
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
            alert('Please correct the errors before proceeding.');
        } else {
            alert('Validation Passed!');
        }
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

        return (
            <div key={q.questionID} className={`question-card type-${q.uiControl} ${error ? 'has-error' : ''}`}>
                <div className="question-header">
                    <span className="q-text">{q.questionText} {q.isRequired && <span className="required-mark">*</span>}</span>
                    {q.questionLabel && <span className="q-label">({q.questionLabel})</span>}
                </div>

                <div className="question-body">
                    {renderControls(q)}
                </div>
                {error && <div className="error-message">{error}</div>}

                {/* Always Visible Children (ParentQuestionID hierarchy) */}
                {q.children && q.children.length > 0 && (
                    <div className="children-container">
                        {q.children.map(child => renderQuestion(child))}
                    </div>
                )}
            </div>
        );
    };

    const renderControls = (q: QuestionDto) => {
        const controlType = q.uiControl ? q.uiControl.toLowerCase() : 'text';

        switch (controlType) {
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
                        {q.answers.map(ans => renderAnswerOption(q, ans, controlType))}
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
                        readOnly={q.readOnly}
                        onChange={(e) => handleTextChange(q, e.target.value)}
                    />
                );
            default:
                return <div>Unknown Control: {q.uiControl}</div>;
        }
    };

    const renderAnswerOption = (q: QuestionDto, ans: AnswerDto, controlType: string) => {
        const isSelected = isAnswerSelected(q.questionID, ans.predefinedAnswerID);
        const isCheckbox = controlType.includes('checkbox');
        const inputType = isCheckbox ? 'checkbox' : 'radio';

        return (
            <div key={ans.predefinedAnswerID} className="answer-wrapper">
                <label className="answer-option">
                    <input
                        type={inputType}
                        name={`q_${q.questionID}`}
                        checked={isSelected || false}
                        onChange={() => handleAnswerChange(q, ans.predefinedAnswerID, inputType)}
                    />
                    <span className="answer-text">{ans.answer}</span>
                </label>

                {/* Branching: Render SubQuestions if Selected */}
                {isSelected && ans.subQuestions && ans.subQuestions.length > 0 && (
                    <div className="sub-questions-container">
                        {ans.subQuestions.map(sq => renderQuestion(sq))}
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

            <div className="actions-bar">
                <button className="btn-validate" onClick={validateForm}>Validate Answers</button>
            </div>

            {/* Debug State */}
            <pre style={{ marginTop: 50, fontSize: 10, background: '#eee' }}>{JSON.stringify(state, null, 2)}</pre>
        </div>
    );
};
