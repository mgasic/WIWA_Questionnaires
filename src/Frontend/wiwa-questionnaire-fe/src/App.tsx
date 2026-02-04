import { useEffect, useState, useRef, useCallback } from 'react';
import './App.css';
import { questionnaireApi } from './services/apiService';
import type { QuestionnaireSchemaDto, QuestionTypeDto, IdentificatorTypeDto, QuestionnaireSubmissionDto, ReferenceMappingDto } from './types/api';
import { QuestionnaireRenderer } from './components/QuestionnaireRenderer';
import type { QuestionnaireRendererHandle } from './components/QuestionnaireRenderer';
import { sendToHost, MSG_TYPES, type WiwaCompletePayload, type ReferenceMappingResult, notifyResize } from './services/messageService';
import i18n from './assets/i18n.json';

interface AppProps {
  embedded?: boolean;
  initialType?: string;
  initialIdentificator?: string;
  initialIdentificatorTypeID?: number;
  initialInstanceId?: number;
  forceReadOnly?: boolean;
  contextData?: Record<string, any>;
  onRegisterSubmit?: (fn: () => void) => void;
  onRegisterCancel?: (fn: () => void) => void;
}

function App({
  embedded = false,
  initialType,
  initialIdentificator = '',
  initialIdentificatorTypeID,
  initialInstanceId,
  forceReadOnly = false,
  contextData,
  onRegisterSubmit,
  onRegisterCancel
}: AppProps) {
  const [schema, setSchema] = useState<QuestionnaireSchemaDto | null>(null);
  const [types, setTypes] = useState<QuestionTypeDto[]>([]);
  const [idTypes, setIdTypes] = useState<IdentificatorTypeDto[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [selectedType, setSelectedType] = useState(initialType || '');
  const [idTypeID, setIdTypeID] = useState<number | undefined>(initialIdentificatorTypeID);
  const [identificator, setIdentificator] = useState(initialIdentificator);

  const [formConfigured, setFormConfigured] = useState(false);
  const [formState, setFormState] = useState<any>({});
  const [initialFormState, setInitialFormState] = useState<any>({});
  const [existingInstanceID, setExistingInstanceID] = useState<number | null>(initialInstanceId || null);
  const [isReadOnly, setIsReadOnly] = useState(forceReadOnly);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [setupErrors, setSetupErrors] = useState({ type: false, idType: false, id: false });

  const rendererRef = useRef<QuestionnaireRendererHandle>(null);

  // Build reference mappings result from answers and schema
  const buildReferenceMappings = useCallback((
    answers: Record<number, { value?: string; selectedAnswerIds?: number[] }>,
    mappings: ReferenceMappingDto[] | undefined,
    schemaQuestions: any[]
  ): ReferenceMappingResult[] => {
    if (!mappings || mappings.length === 0) return [];

    const results: ReferenceMappingResult[] = [];

    mappings.forEach(mapping => {
      const answer = answers[mapping.questionId];
      if (!answer) return;

      // Find the question in schema to get answer codes
      const findQuestion = (questions: any[]): any => {
        for (const q of questions) {
          if (q.questionID === mapping.questionId) return q;
          if (q.children?.length) {
            const found = findQuestion(q.children);
            if (found) return found;
          }
          for (const a of q.answers || []) {
            if (a.subQuestions?.length) {
              const found = findQuestion(a.subQuestions);
              if (found) return found;
            }
          }
        }
        return null;
      };

      const question = findQuestion(schemaQuestions);
      if (!question) return;

      // Get selected answer code(s)
      if (answer.selectedAnswerIds?.length) {
        for (const ansId of answer.selectedAnswerIds) {
          const ansObj = question.answers?.find((a: any) => a.predefinedAnswerID === ansId);
          if (ansObj?.code) {
            results.push({
              questionId: mapping.questionId,
              tableName: mapping.tableName,
              referenceColumnName: mapping.referenceColumnName,
              value: ansObj.code
            });
          }
        }
      } else if (answer.value) {
        // For text inputs, value is the code itself
        results.push({
          questionId: mapping.questionId,
          tableName: mapping.tableName,
          referenceColumnName: mapping.referenceColumnName,
          value: answer.value
        });
      }
    });

    return results;
  }, []);

  // Build Enriched Answers tree (structured output like input)
  const buildEnrichedAnswers = useCallback((
    questions: any[],
    answers: Record<number, { value?: string; selectedAnswerIds?: number[] }>,
    mappings: ReferenceMappingDto[] | undefined
  ): any[] => {
    const results: any[] = [];

    for (const q of questions) {
      const answer = answers[q.questionID];
      if (!answer) continue;

      const enriched: any = {
        questionId: q.questionID,
        questionText: q.questionText,
        questionCode: (q as any).code || (q as any).questionLabel,
      };

      if (answer.value) {
        enriched.value = answer.value;
      }

      if (answer.selectedAnswerIds?.length) {
        enriched.selectedAnswers = answer.selectedAnswerIds.map(ansId => {
          const ansObj = q.answers?.find((a: any) => a.predefinedAnswerID === ansId);
          return {
            answerId: ansId,
            text: ansObj?.answer || '',
            code: ansObj?.code || ''
          };
        });
      }

      // Add reference mapping if exists
      const mapping = mappings?.find(m => m.questionId === q.questionID);
      if (mapping) {
        enriched.referenceMapping = {
          tableName: mapping.tableName,
          columnName: mapping.referenceColumnName
        };
      }

      // Traverse children/subquestions
      const subResults: any[] = [];

      // Children (independent)
      if (q.children?.length) {
        const enrichedChildren = buildEnrichedAnswers(q.children, answers, mappings);
        subResults.push(...enrichedChildren);
      }

      // Subquestions from selected answers
      if (answer.selectedAnswerIds?.length) {
        for (const ansId of answer.selectedAnswerIds) {
          const ansObj = q.answers?.find((a: any) => a.predefinedAnswerID === ansId);
          if (ansObj?.subQuestions?.length) {
            const enrichedSub = buildEnrichedAnswers(ansObj.subQuestions, answers, mappings);
            subResults.push(...enrichedSub);
          }
        }
      }

      if (subResults.length > 0) {
        enriched.subQuestions = subResults;
      }

      results.push(enriched);
    }

    return results;
  }, []);

  // Handle submit - used by both button and external trigger
  const handleSubmit = useCallback(async () => {
    if (!schema) return;

    if (rendererRef.current) {
      const isValid = rendererRef.current.validate();
      if (!isValid) {
        setShowErrorDialog(true);
        if (embedded) {
          sendToHost(MSG_TYPES.ERROR, { code: 'VALIDATION_ERROR', message: 'Form validation failed' });
        }
        return;
      }
    }

    const answersPayload: Record<number, { value?: string, selectedAnswerIds?: number[] }> = {};

    Object.keys(formState).forEach(key => {
      const questionId = Number(key);
      const val = formState[questionId];
      if (val) {
        answersPayload[questionId] = {
          value: val.value,
          selectedAnswerIds: val.selectedAnswerIds
        };
      }
    });

    const payload: QuestionnaireSubmissionDto = {
      instanceID: existingInstanceID || undefined,
      questionnaireTypeID: schema.questionnaire.typeId,
      identificatorValue: identificator,
      identificatorTypeID: idTypeID!,
      answers: answersPayload
    };

    try {
      setLoading(true);
      let resultInstanceId: number;

      if (existingInstanceID) {
        const result = await questionnaireApi.updateQuestionnaire(payload);
        resultInstanceId = result.instanceID;
        setSuccessMessage(i18n.form.success_update);
      } else {
        const result = await questionnaireApi.submitQuestionnaire(payload);
        resultInstanceId = result.instanceID;
        setSuccessMessage(i18n.form.success_save);
      }

      setExistingInstanceID(resultInstanceId);
      setIsReadOnly(true);

      // Send WIWA_COMPLETE to host with enriched data
      if (embedded) {
        const referenceMappings = buildReferenceMappings(
          answersPayload,
          schema.referenceMappings,
          schema.questions
        );

        const enrichedAnswers = buildEnrichedAnswers(
          schema.questions,
          answersPayload,
          schema.referenceMappings
        );

        const completePayload: WiwaCompletePayload = {
          success: true,
          instanceId: resultInstanceId,
          questionnaireType: selectedType,
          identificatorValue: identificator,
          answers: answersPayload,
          enrichedAnswers,
          referenceMappings,
          contextData
        };

        sendToHost(MSG_TYPES.COMPLETE, completePayload);
      } else {
        setShowSuccessDialog(true);
      }

    } catch (err) {
      console.error(err);
      if (embedded) {
        sendToHost(MSG_TYPES.ERROR, { code: 'SAVE_ERROR', message: 'Failed to save questionnaire' });
      } else {
        alert(i18n.form.error_save);
      }
    } finally {
      setLoading(false);
    }
  }, [schema, formState, existingInstanceID, identificator, idTypeID, embedded, selectedType, contextData, buildReferenceMappings, buildEnrichedAnswers]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (embedded) {
      sendToHost(MSG_TYPES.ERROR, { code: 'CANCELLED', message: 'User cancelled' });
    } else {
      setFormConfigured(false);
      setSchema(null);
    }
  }, [embedded]);

  // Register submit/cancel triggers for external use (WIWA_SUBMIT message)
  useEffect(() => {
    if (onRegisterSubmit) onRegisterSubmit(handleSubmit);
    if (onRegisterCancel) onRegisterCancel(handleCancel);
  }, [onRegisterSubmit, onRegisterCancel, handleSubmit, handleCancel]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // If props provide everything, auto-configure (embedded mode)
    if (initialType && initialIdentificator && initialIdentificatorTypeID && types.length > 0) {
      handleConfigure();
    }
  }, [initialType, initialIdentificator, initialIdentificatorTypeID, types]);

  // Notify resize when content changes
  useEffect(() => {
    if (embedded && schema) {
      const timer = setTimeout(() => notifyResize(), 100);
      return () => clearTimeout(timer);
    }
  }, [embedded, schema, formState]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [typesData, idTypesData] = await Promise.all([
        questionnaireApi.getTypes(),
        questionnaireApi.getIdentificatorTypes()
      ]);
      setTypes(typesData);
      setIdTypes(idTypesData);
    } catch (err) {
      setError('Failed to load metadata. Is Backend running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionnaire = async (type: string, existingData?: QuestionnaireSubmissionDto | null) => {
    try {
      setSchema(null);
      setError('');

      const data = await questionnaireApi.getSchema(type);
      setSchema(data);

      if (existingData) {
        setInitialFormState(existingData.answers);
        setFormState(existingData.answers);
        setExistingInstanceID(existingData.instanceID ?? null);
        setIsReadOnly(true); // Default to Read Only for existing
      } else {
        setInitialFormState({});
        setFormState({});
        if (!initialInstanceId) setExistingInstanceID(null);
        setIsReadOnly(forceReadOnly);
      }
    } catch (err) {
      setError(i18n.form.error_load);
      console.error(err);
    }
  };

  const handleConfigure = async () => {
    const typeToUse = initialType || selectedType;
    const idTypeToUse = initialIdentificatorTypeID || idTypeID;
    const identificatorToUse = initialIdentificator || identificator;

    const newSetupErrors = {
      type: !typeToUse,
      idType: !idTypeToUse,
      id: !identificatorToUse
    };

    if (newSetupErrors.type || newSetupErrors.idType || newSetupErrors.id) {
      setSetupErrors(newSetupErrors);
      return;
    }

    setSetupErrors({ type: false, idType: false, id: false });

    // Update state from initial props if needed
    if (initialType) setSelectedType(initialType);
    if (initialIdentificatorTypeID) setIdTypeID(initialIdentificatorTypeID);
    if (initialIdentificator) setIdentificator(initialIdentificator);

    try {
      setLoading(true);
      const typeObj = types.find(t => t.code === typeToUse);
      if (!typeObj) throw new Error("Type not found");

      let existing: QuestionnaireSubmissionDto | null = null;

      // If initialInstanceId provided, that takes priority
      if (initialInstanceId) {
        // Instance ID is known from host - we'd need an API to fetch by instanceId
        // For now, try the existing endpoint
        existing = await questionnaireApi.getExistingSubmission(
          typeObj.questionnaireTypeID,
          idTypeToUse!,
          identificatorToUse
        );
      } else {
        existing = await questionnaireApi.getExistingSubmission(
          typeObj.questionnaireTypeID,
          idTypeToUse!,
          identificatorToUse
        );
      }

      setFormConfigured(true);
      await loadQuestionnaire(typeToUse, existing);

    } catch (err) {
      console.error(err);
      setError("Error during initialization");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    setFormConfigured(false); // Redirect to start
    setSchema(null);
  };

  // Embedded mode: hide setup panel if auto-configured
  const showSetupPanel = !formConfigured && !embedded;

  return (
    <div className={(embedded ? "embedded-container" : "container") + (formConfigured ? " questionnaire-mode" : " setup-mode")}>
      {!embedded && (
        <header>
          <h1>Wiener Städtische - Health Questionnaire</h1>
        </header>
      )}

      {/* Success Modal (not shown in embedded mode - we send WIWA_COMPLETE instead) */}
      {!embedded && showSuccessDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Uspešno!</h3>
            <p>{successMessage}</p>
            <button onClick={handleSuccessClose} className="btn-primary">OK</button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorDialog && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderTop: '5px solid var(--wiwa-error-color, #dc3545)' }}>
            <h3 style={{ color: 'var(--wiwa-error-color, #dc3545)' }}>Greška!</h3>
            <p>Forma sadrži greške. Molimo vas da proverite unete podatke i pokušate ponovo.</p>
            <button onClick={() => setShowErrorDialog(false)} className="btn-primary" style={{ backgroundColor: 'var(--wiwa-error-color, #dc3545)' }}>U redu</button>
          </div>
        </div>
      )}

      {showSetupPanel ? (
        <div className="setup-panel" style={{ padding: 20, border: '1px solid var(--wiwa-border-color, #ddd)', borderRadius: 'var(--wiwa-border-radius, 8px)' }}>
          <h3>{i18n.setup.title}</h3>
          <div className="setup-fields-wrapper">
            <div style={{ marginBottom: 15 }}>
              <label>{i18n.setup.type_label}: </label>
              <select
                value={selectedType}
                onChange={e => { setSelectedType(e.target.value); setSetupErrors(prev => ({ ...prev, type: false })); }}
                style={setupErrors.type ? { borderColor: 'var(--wiwa-error-color, red)', backgroundColor: '#fff5f5', color: '#333' } : {}}
              >
                <option value="">-- Izaberi --</option>
                {types.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 15 }}>
              <label>{i18n.setup.id_type_label}: </label>
              <select
                value={idTypeID || ""}
                onChange={e => { setIdTypeID(Number(e.target.value)); setSetupErrors(prev => ({ ...prev, idType: false })); }}
                style={setupErrors.idType ? { borderColor: 'var(--wiwa-error-color, red)', backgroundColor: '#fff5f5', color: '#333' } : {}}
              >
                <option value="">-- Izaberi --</option>
                {idTypes.map(it => <option key={it.questionnaireIdentificatorTypeID} value={it.questionnaireIdentificatorTypeID}>{it.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 15 }}>
              <label>{i18n.setup.id_value_label}: </label>
              <input
                type="text"
                value={identificator}
                onChange={e => { setIdentificator(e.target.value); setSetupErrors(prev => ({ ...prev, id: false })); }}
                placeholder="Npr. Lokacija ABC"
                style={setupErrors.id ? { borderColor: 'var(--wiwa-error-color, red)', backgroundColor: '#fff5f5', color: '#333' } : {}}
              />
            </div>
            <button onClick={handleConfigure} disabled={loading}>{i18n.setup.button_show}</button>
          </div>
        </div>
      ) : formConfigured ? (
        <main>
          {!embedded && (
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{i18n.form.type_label}:</strong> {schema?.questionnaire.typeName} |
                <strong> {i18n.form.id_label}:</strong> {identificator}
                {existingInstanceID && <span style={{ marginLeft: 10, color: 'var(--wiwa-primary-color, #e30613)' }}>(Izmena postojećeg)</span>}
              </div>
              <button onClick={() => setFormConfigured(false)}>{i18n.form.button_change}</button>
            </div>
          )}
          {loading && <p>{i18n.form.loading}</p>}
          {error && <p className="error">{error}</p>}

          {schema && (
            <div>
              <QuestionnaireRenderer
                ref={rendererRef}
                schema={schema.questions}
                rules={schema.rules}
                matrices={schema.matrices}
                initialState={initialFormState}
                readOnly={isReadOnly}
                validationMessages={{
                  success: i18n.form.validation_alert,
                  error: i18n.form.validation_alert,
                  required: i18n.form.error_required,
                  format: i18n.form.error_format
                }}
                onChange={(state) => setFormState(state)}
              />
              <div className="form-actions" style={{ marginTop: 20 }}>
                {isReadOnly ? (
                  <button onClick={() => setIsReadOnly(false)} className="btn-secondary" style={{ marginRight: 10 }}>
                    Izmeni
                  </button>
                ) : (
                  <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
                    {loading ? 'Čuvanje...' : i18n.form.button_save}
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      ) : embedded ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, color: 'var(--wiwa-text-color, #333)' }}>
          <p>{loading ? 'Učitavanje upitnika...' : 'Čekanje inicijalizacije...'}</p>
        </div>
      ) : null}
    </div>
  );
}

export default App;
