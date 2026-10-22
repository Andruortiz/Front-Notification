export const CONTENT_SID_PATTERN = /^HX[0-9a-fA-F]{32}$/;
export const MAX_TEMPLATE_VARIABLES = 20;
export const MAX_TEMPLATE_VARIABLE_LENGTH = 1024;

export interface ParsedTemplateVariables {
    variables: Record<string, string>;
    error: string | null;
}

export function validateTemplateId(value: string): string | null {
    const templateId = value.trim();
    if (!templateId) {
        return null;
    }
    return CONTENT_SID_PATTERN.test(templateId)
        ? null
        : 'El Content SID empieza por HX y tiene 32 caracteres hexadecimales.';
}

export function parseTemplateVariables(text: string): ParsedTemplateVariables {
    const variables: Record<string, string> = {};
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    for (const line of lines) {
        const separator = line.indexOf('=');
        const key = separator < 0 ? '' : line.slice(0, separator).trim();
        const value = separator < 0 ? '' : line.slice(separator + 1).trim();
        if (!key) {
            return {
                variables: {},
                error: 'Cada variable va en una línea con el formato 1=valor.',
            };
        }
        if (key in variables) {
            return { variables: {}, error: `La variable ${key} está repetida.` };
        }
        if (value.length > MAX_TEMPLATE_VARIABLE_LENGTH) {
            return {
                variables: {},
                error: `La variable ${key} supera ${MAX_TEMPLATE_VARIABLE_LENGTH} caracteres.`,
            };
        }
        variables[key] = value;
    }

    if (Object.keys(variables).length > MAX_TEMPLATE_VARIABLES) {
        return { variables: {}, error: `Máximo ${MAX_TEMPLATE_VARIABLES} variables.` };
    }
    return { variables, error: null };
}

export function validateTemplate(templateId: string, variablesText: string): string | null {
    return validateTemplateId(templateId) ?? parseTemplateVariables(variablesText).error;
}
