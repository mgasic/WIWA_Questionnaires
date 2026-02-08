import axios from 'axios';

const API_BASE_URL = 'http://localhost:5238/api';

// Questionnaire Types
export const questionnaireTypesService = {
    getAll: async () => {
        const response = await axios.get(`${API_BASE_URL}/QuestionnaireTypes`);
        return response.data;
    },
    getWithCounts: async () => {
        // Calls the endpoint in FlowController that includes counts
        const response = await axios.get(`${API_BASE_URL}/Flow/GetQuestionnaireTypes`);
        return response.data;
    },
    create: async (data: { name: string; code: string }) => {
        const response = await axios.post(`${API_BASE_URL}/QuestionnaireTypes`, data);
        return response.data;
    }
};

// Questionnaire Identificator Types
export const questionnaireIdentificatorTypesService = {
    getAll: async () => {
        const response = await axios.get(`${API_BASE_URL}/QuestionnaireIdentificatorTypes`);
        return response.data;
    },
    create: async (data: { name: string }) => {
        const response = await axios.post(`${API_BASE_URL}/QuestionnaireIdentificatorTypes`, data);
        return response.data;
    }
};

// Question Formats
export const questionFormatsService = {
    getAll: async () => {
        const response = await axios.get(`${API_BASE_URL}/QuestionFormats`);
        return response.data;
    }
};

// Specific Question Types
export const specificQuestionTypesService = {
    getAll: async () => {
        const response = await axios.get(`${API_BASE_URL}/SpecificQuestionTypes`);
        return response.data;
    }
};

// Database Metadata
export const databaseMetadataService = {
    getAllTables: async () => {
        const response = await axios.get(`${API_BASE_URL}/DatabaseMetadata/tables`);
        return response.data;
    },
    getTableNames: async () => {
        const response = await axios.get(`${API_BASE_URL}/DatabaseMetadata/tables/names`);
        return response.data;
    },
    getTableColumns: async (tableName: string) => {
        const response = await axios.get(`${API_BASE_URL}/DatabaseMetadata/tables/${tableName}/columns`);
        return response.data;
    }
};

// Flow
export const flowService = {
    getFlow: async (questionnaireTypeId: number) => {
        const response = await axios.get(`${API_BASE_URL}/Flow/GetFlow/${questionnaireTypeId}`);
        return response.data;
    },
    save: async (flowData: any) => {
        const response = await axios.post(`${API_BASE_URL}/Flow/Save`, flowData);
        return response.data;
    },
    checkCombination: async (questionnaireTypeId: number, identificatorTypeId: number) => {
        const response = await axios.get(`${API_BASE_URL}/Flow/CheckCombination`, {
            params: { questionnaireTypeId, identificatorTypeId }
        });
        return response.data;
    },
    getUserReferenceTables: async (questionnaireTypeId: number) => {
        const response = await axios.get(`${API_BASE_URL}/Flow/GetUserReferenceTables/${questionnaireTypeId}`);
        return response.data;
    },
    getReferenceTableMetadata: async (questionnaireTypeId: number) => {
        const response = await axios.get(`${API_BASE_URL}/Flow/GetReferenceTableMetadata/${questionnaireTypeId}`);
        return response.data;
    },
    saveMatrix: async (questionId: number, matrix: any) => {
        const response = await axios.post(`${API_BASE_URL}/Questions/${questionId}/matrix`, matrix);
        return response.data;
    }
};
