export interface WiwaInitPayload {
    questionnaireType: string;         // Kod upitnika (npr. 'LOCATION', 'GREAT_QUEST')
    identificatorTypeID: number;       // ID tipa identifikatora iz baze
    identificatorValue: string;        // Vrednost identifikatora
    instanceId?: number;               // Za učitavanje postojeće instance (EDIT mode)
    readOnly?: boolean;                // Prikaz samo za čitanje (VIEW mode)
    contextData?: Record<string, any>; // Dodatni podaci od host-a (vraćaju se nazad)
}

export interface WiwaThemePayload {
    cssVariables?: {
        '--wiwa-primary-color'?: string;
        '--wiwa-secondary-color'?: string;
        '--wiwa-background-color'?: string;
        '--wiwa-text-color'?: string;
        '--wiwa-border-color'?: string;
        '--wiwa-error-color'?: string;
        '--wiwa-success-color'?: string;
        '--wiwa-font-family'?: string;
        '--wiwa-border-radius'?: string;
        [key: string]: string | undefined;
    };
    customCss?: string;
}

export interface ReferenceMappingResult {
    questionId: number;
    tableName: string;
    referenceColumnName: string;
    value: string;
}

export interface EnrichedAnswerResult {
    questionId: number;
    questionText: string;
    questionCode?: string;
    value?: string;
    selectedAnswers?: {
        answerId: number;
        text: string;
        code: string;
    }[];
    referenceMapping?: {
        tableName: string;
        columnName: string;
    };
    subQuestions?: EnrichedAnswerResult[];
}

export interface WiwaCompletePayload {
    success: boolean;
    instanceId: number;
    questionnaireType: string;
    identificatorValue: string;
    answers: Record<number, { value?: string; selectedAnswerIds?: number[] }>;
    enrichedAnswers: EnrichedAnswerResult[];
    referenceMappings: ReferenceMappingResult[];
    contextData?: Record<string, any>;
}

export interface WiwaErrorPayload {
    code: string;
    message: string;
    details?: Record<string, any>;
}

export interface WiwaResizePayload {
    height: number;
    width?: number;
}

export const MSG_TYPES = {
    // Host -> iframe
    INIT: 'WIWA_INIT',
    THEME: 'WIWA_THEME',
    SUBMIT: 'WIWA_SUBMIT',
    CANCEL: 'WIWA_CANCEL',
    // iframe -> Host
    READY: 'WIWA_READY',
    COMPLETE: 'WIWA_COMPLETE',
    ERROR: 'WIWA_ERROR',
    RESIZE: 'WIWA_RESIZE'
} as const;

export type WiwaMessageType = typeof MSG_TYPES[keyof typeof MSG_TYPES];

/**
 * Send a message to the host application (when embedded in iframe)
 */
export const sendToHost = (type: WiwaMessageType, payload: any) => {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type, payload }, '*');
    } else {
        // Debug logging for standalone mode
        console.debug(`[WiwaEmbedded] Outgoing Message: ${type}`, payload);
    }
};

/**
 * Apply theme from host application
 */
export const applyTheme = (theme: WiwaThemePayload) => {
    if (theme.cssVariables) {
        const root = document.documentElement;
        Object.entries(theme.cssVariables).forEach(([key, value]) => {
            if (value) {
                root.style.setProperty(key, value);
            }
        });
    }

    if (theme.customCss) {
        // Sanitize and apply custom CSS
        const styleId = 'wiwa-custom-theme';
        let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }
        // Basic sanitization - remove script tags and javascript:
        const sanitizedCss = theme.customCss
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/javascript:/gi, '');
        styleEl.textContent = sanitizedCss;
    }
};

/**
 * Send resize notification to host
 */
export const notifyResize = () => {
    const height = document.body.scrollHeight;
    const width = document.body.scrollWidth;
    sendToHost(MSG_TYPES.RESIZE, { height, width } as WiwaResizePayload);
};
