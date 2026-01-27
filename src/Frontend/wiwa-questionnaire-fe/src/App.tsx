import { useEffect, useState } from 'react';
import './App.css';
import { questionnaireApi } from './services/apiService';
import type { QuestionnaireSchemaDto, QuestionTypeDto } from './types/api';
import { QuestionnaireRenderer } from './components/QuestionnaireRenderer';

interface AppProps {
  embedded?: boolean;
  initialType?: string;
}

function App({ embedded = false, initialType }: AppProps) {
  const [schema, setSchema] = useState<QuestionnaireSchemaDto | null>(null);
  const [types, setTypes] = useState<QuestionTypeDto[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // If initialType provided, use it. Otherwise default to 'GREAT_QUEST' or empty.
  const [selectedType, setSelectedType] = useState(initialType || 'GREAT_QUEST');

  useEffect(() => {
    // In standalone mode, we load types list. In embedded, we might skip this if we know the type.
    if (!embedded) {
      loadInitialData();
    } else if (initialType) {
      // If embedded and type provided, just load it
      loadQuestionnaire(initialType);
    }
  }, [embedded, initialType]);

  useEffect(() => {
    // React to manual selection change (standalone only)
    if (!embedded && selectedType) {
      loadQuestionnaire(selectedType);
    }
  }, [selectedType, embedded]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const typesData = await questionnaireApi.getTypes();
      setTypes(typesData);
      // Logic: if not embedded and no type selected, pick first
      if (typesData.length > 0 && !selectedType && !initialType) {
        setSelectedType(typesData[0].code);
      }
    } catch (err) {
      setError('Failed to load metadata. Is Backend running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionnaire = async (type: string) => {
    try {
      setSchema(null);
      setError('');
      const data = await questionnaireApi.getSchema(type);
      setSchema(data);
    } catch (err) {
      setError('Failed to load questionnaire content.');
      console.error(err);
    }
  };

  return (
    <div className={embedded ? "embedded-container" : "container"}>
      {!embedded && (
        <header>
          <h1>Wiener Städtische - Health Questionnaire</h1>
          <div style={{ marginTop: 10 }}>
            <label style={{ marginRight: 10 }}>Izaberite Tip:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ padding: 5, borderRadius: 4 }}
            >
              {types.map(t => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
          </div>
        </header>
      )}

      <main>
        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}

        {schema && (
          <div>
            <h2>{schema.questionnaire.typeName}</h2>
            <QuestionnaireRenderer
              schema={schema.questions}
              rules={schema.rules}
              onChange={(state) => console.log('Form State:', state)}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
