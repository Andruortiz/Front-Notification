import { describe, expect, it } from 'vitest';
import { parseTemplateVariables, validateTemplate, validateTemplateId } from './providerTemplate';

const SID = 'HXfe5ab5f00277942d4d4200328b4d403c';

describe('validateTemplateId', () => {
    it('acepta un Content SID válido y un valor vacío', () => {
        expect(validateTemplateId(SID)).toBeNull();
        expect(validateTemplateId('  ')).toBeNull();
    });

    it('rechaza un SID con formato inválido', () => {
        expect(validateTemplateId('HX123')).not.toBeNull();
        expect(validateTemplateId('AB' + SID.slice(2))).not.toBeNull();
    });
});

describe('parseTemplateVariables', () => {
    it('convierte líneas numero=valor en un mapa', () => {
        expect(parseTemplateVariables('1=Andrés\n2=Matrícula = ok')).toEqual({
            variables: { '1': 'Andrés', '2': 'Matrícula = ok' },
            error: null,
        });
    });

    it('devuelve mapa vacío sin errores para un texto vacío', () => {
        expect(parseTemplateVariables('')).toEqual({ variables: {}, error: null });
    });

    it('rechaza líneas sin clave, sin separador o repetidas', () => {
        expect(parseTemplateVariables('sin separador').error).not.toBeNull();
        expect(parseTemplateVariables('=valor').error).not.toBeNull();
        expect(parseTemplateVariables('1=a\n1=b').error).toContain('repetida');
    });
});

describe('validateTemplate', () => {
    it('prioriza el error del SID sobre el de las variables', () => {
        expect(validateTemplate('mal', 'sin separador')).toContain('Content SID');
        expect(validateTemplate(SID, 'sin separador')).toContain('formato');
        expect(validateTemplate(SID, '1=a')).toBeNull();
    });
});
