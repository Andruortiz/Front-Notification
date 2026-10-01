import { describe, expect, it } from 'vitest';
import {
    MAX_EMAIL_LENGTH,
    MAX_PUSH_TOKEN_LENGTH,
    hasControlCharacters,
    isValidEmail,
    validateEmail,
    validatePhoneNumber,
    validatePushToken,
} from './validators';

describe('validateEmail', () => {
    it.each([
        'alice@example.com',
        'alice.smith@example.com',
        'alice+tag@sub.example.co',
        "o'brien@example.org",
        'a@b.co',
        'user_name-1@mail-server.example.com',
        'x@xn--bcher-kva.example',
        'ALICE@EXAMPLE.COM',
        `${'a'.repeat(64)}@example.com`,
    ])('acepta %s', (email) => {
        expect(validateEmail(email)).toBeNull();
    });

    it.each([
        ['', /Escribí un correo/],
        ['   ', /Escribí un correo/],
        ['alice', /Falta el símbolo @/],
        ['alice@', /Falta el dominio/],
        ['@example.com', /Falta la parte anterior/],
        ['a@b@example.com', /más de un símbolo @/],
        ['alice smith@example.com', /espacios/],
        ['alice@exam ple.com', /espacios/],
        ['alice@example', /debe incluir un punto/],
        ['alice@example.', /dominio del correo no es válido/],
        ['alice@.example.com', /dominio del correo no es válido/],
        ['alice@exa..mple.com', /dominio del correo no es válido/],
        ['alice@-example.com', /dominio del correo no es válido/],
        ['alice@example-.com', /dominio del correo no es válido/],
        ['alice@exa_mple.com', /dominio del correo no es válido/],
        ['alice@example.c', /terminación del dominio/],
        ['alice@example.123', /terminación del dominio/],
        ['alice@ejemplo.cöm', /dominio del correo no es válido/],
        ['.alice@example.com', /caracteres no permitidos o puntos mal ubicados/],
        ['alice.@example.com', /caracteres no permitidos o puntos mal ubicados/],
        ['al..ice@example.com', /caracteres no permitidos o puntos mal ubicados/],
        ['al(ice@example.com', /caracteres no permitidos/],
        ['ñandú@example.com', /caracteres no permitidos/],
        ['alice<script>@example.com', /caracteres no permitidos/],
    ])('rechaza %j', (email, message) => {
        expect(validateEmail(email)).toMatch(message);
    });

    it('rechaza la parte local de más de 64 caracteres', () => {
        expect(validateEmail(`${'a'.repeat(65)}@example.com`)).toMatch(/supera los 64/);
    });

    it('acepta un correo de exactamente 254 caracteres y rechaza uno de 255', () => {
        const domain = (lastLabel: number) =>
            `${'b'.repeat(63)}.${'b'.repeat(63)}.${'b'.repeat(lastLabel)}.co`;
        const exact = `${'a'.repeat(64)}@${domain(58)}`;
        const over = `${'a'.repeat(64)}@${domain(59)}`;

        expect(exact).toHaveLength(MAX_EMAIL_LENGTH);
        expect(validateEmail(exact)).toBeNull();
        expect(over).toHaveLength(MAX_EMAIL_LENGTH + 1);
        expect(validateEmail(over)).toMatch(/supera los 254/);
    });

    it('rechaza una etiqueta de dominio de más de 63 caracteres', () => {
        expect(validateEmail(`a@${'b'.repeat(64)}.com`)).toMatch(/dominio del correo no es válido/);
    });

    it('ignora los espacios alrededor', () => {
        expect(validateEmail('  alice@example.com  ')).toBeNull();
        expect(isValidEmail(' alice@example.com ')).toBe(true);
        expect(isValidEmail('nope')).toBe(false);
    });
});

describe('validatePhoneNumber', () => {
    it.each(['+573001234567', '+12025550123', '+12', '+442071838750', `+1${'2'.repeat(14)}`])(
        'acepta %s',
        (phone) => {
            expect(validatePhoneNumber(phone)).toBeNull();
        },
    );

    it.each([
        ['', /Escribí un número/],
        ['573001234567', /empezar con \+/],
        ['3001234567', /empezar con \+/],
        ['+57 300 123 4567', /solo puede tener dígitos/],
        ['+57-300', /solo puede tener dígitos/],
        ['+57abc', /solo puede tener dígitos/],
        ['+', /solo puede tener dígitos/],
        ['+0573001234567', /no puede empezar con 0/],
        ['+1', /entre 2 y 15 dígitos/],
        [`+1${'2'.repeat(15)}`, /entre 2 y 15 dígitos/],
    ])('rechaza %j', (phone, message) => {
        expect(validatePhoneNumber(phone)).toMatch(message);
    });
});

describe('validatePushToken', () => {
    it('acepta un token opaco', () => {
        expect(validatePushToken('device-token-demo-1234')).toBeNull();
        expect(validatePushToken('fcm:APA91bH_x-Y.z')).toBeNull();
    });

    it.each([
        ['', /Escribí el token/],
        ['   ', /Escribí el token/],
        ['token con espacios', /espacios/],
        ['token\u0000nulo', /espacios|no permitidos/],
        ['a'.repeat(MAX_PUSH_TOKEN_LENGTH + 1), /supera los 4096/],
    ])('rechaza %j', (token, message) => {
        expect(validatePushToken(token)).toMatch(message);
    });

    it('acepta un token de exactamente el máximo', () => {
        expect(validatePushToken('a'.repeat(MAX_PUSH_TOKEN_LENGTH))).toBeNull();
    });
});

describe('hasControlCharacters', () => {
    it('detecta caracteres de control', () => {
        expect(hasControlCharacters('hola\u0000')).toBe(true);
        expect(hasControlCharacters('hola\u007f')).toBe(true);
        expect(hasControlCharacters('hola\nmundo')).toBe(true);
        expect(hasControlCharacters('hola')).toBe(false);
    });

    it('permite saltos de línea y tabulaciones cuando se indica', () => {
        expect(hasControlCharacters('a\nb\r\nc\td', true)).toBe(false);
        expect(hasControlCharacters('a\u0000b', true)).toBe(true);
    });
});
