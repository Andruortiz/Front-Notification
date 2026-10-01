export const MAX_EMAIL_LENGTH = 254;
export const MAX_EMAIL_LOCAL_LENGTH = 64;
export const MAX_DOMAIN_LABEL_LENGTH = 63;
export const MAX_PUSH_TOKEN_LENGTH = 4096;
export const MAX_CONTENT_LENGTH = 32_768;

const E164 = /^\+[1-9]\d{1,14}$/;
const EMAIL_LOCAL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_LABEL = /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/;
const TOP_LEVEL_DOMAIN = /^([A-Za-z]{2,}|xn--[A-Za-z0-9-]{2,})$/;

export function validateEmail(value: string): string | null {
    const email = value.trim();
    if (email.length === 0) {
        return 'Escribí un correo electrónico.';
    }
    if (/\s/.test(email)) {
        return 'El correo no puede contener espacios.';
    }
    if (email.length > MAX_EMAIL_LENGTH) {
        return `El correo supera los ${MAX_EMAIL_LENGTH} caracteres.`;
    }
    const at = email.indexOf('@');
    if (at === -1) {
        return 'Falta el símbolo @ en el correo.';
    }
    if (email.includes('@', at + 1)) {
        return 'El correo tiene más de un símbolo @.';
    }
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (local.length === 0) {
        return 'Falta la parte anterior al @.';
    }
    if (local.length > MAX_EMAIL_LOCAL_LENGTH) {
        return `La parte anterior al @ supera los ${MAX_EMAIL_LOCAL_LENGTH} caracteres.`;
    }
    if (!EMAIL_LOCAL.test(local)) {
        return 'La parte anterior al @ tiene caracteres no permitidos o puntos mal ubicados.';
    }
    if (domain.length === 0) {
        return 'Falta el dominio después del @.';
    }
    const labels = domain.split('.');
    if (labels.length < 2) {
        return 'El dominio debe incluir un punto, por ejemplo example.com.';
    }
    if (
        labels.some((label) => label.length === 0 || label.length > MAX_DOMAIN_LABEL_LENGTH) ||
        !labels.every((label) => DOMAIN_LABEL.test(label))
    ) {
        return 'El dominio del correo no es válido.';
    }
    if (!TOP_LEVEL_DOMAIN.test(labels[labels.length - 1])) {
        return 'La terminación del dominio no es válida.';
    }
    return null;
}

export function isValidEmail(value: string): boolean {
    return validateEmail(value) === null;
}

export function validatePhoneNumber(value: string): string | null {
    const phone = value.trim();
    if (phone.length === 0) {
        return 'Escribí un número de teléfono.';
    }
    if (!phone.startsWith('+')) {
        return 'El número debe empezar con + y el código de país, por ejemplo +573001234567.';
    }
    if (!/^\+\d+$/.test(phone)) {
        return 'El número solo puede tener dígitos después del +.';
    }
    if (phone.startsWith('+0')) {
        return 'El código de país no puede empezar con 0.';
    }
    if (!E164.test(phone)) {
        return 'El número debe tener entre 2 y 15 dígitos incluyendo el código de país.';
    }
    return null;
}

export function validatePushToken(value: string): string | null {
    const token = value.trim();
    if (token.length === 0) {
        return 'Escribí el token del dispositivo.';
    }
    if (/\s/.test(token)) {
        return 'El token no puede contener espacios.';
    }
    if (hasControlCharacters(token)) {
        return 'El token tiene caracteres no permitidos.';
    }
    if (token.length > MAX_PUSH_TOKEN_LENGTH) {
        return `El token supera los ${MAX_PUSH_TOKEN_LENGTH} caracteres.`;
    }
    return null;
}

export function hasControlCharacters(text: string, allowLineBreaks = false): boolean {
    return [...text].some((char) => {
        const code = char.charCodeAt(0);
        if (allowLineBreaks && (code === 9 || code === 10 || code === 13)) {
            return false;
        }
        return code < 32 || code === 127;
    });
}
