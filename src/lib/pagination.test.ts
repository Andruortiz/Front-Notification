import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE, pageRange, pageToOffset, parsePageParams } from './pagination';

describe('parsePageParams', () => {
    it('usa página 1 y el tamaño por defecto sin parámetros', () => {
        expect(parsePageParams(new URLSearchParams())).toEqual({
            page: 1,
            size: DEFAULT_PAGE_SIZE,
        });
    });

    it('acepta una página y un tamaño válidos', () => {
        expect(parsePageParams(new URLSearchParams('page=4&size=25'))).toEqual({
            page: 4,
            size: 25,
        });
    });

    it.each(['0', '-2', '1.5', 'abc', '', '99999999999999999999'])(
        'descarta la página inválida %j',
        (page) => {
            expect(parsePageParams(new URLSearchParams({ page })).page).toBe(1);
        },
    );

    it.each(['0', '7', '201', 'abc', '-10'])('descarta el tamaño no permitido %j', (size) => {
        expect(parsePageParams(new URLSearchParams({ size })).size).toBe(DEFAULT_PAGE_SIZE);
    });
});

describe('pageToOffset', () => {
    it('calcula el offset a partir de página y tamaño', () => {
        expect(pageToOffset({ page: 1, size: 50 })).toBe(0);
        expect(pageToOffset({ page: 3, size: 25 })).toBe(50);
    });
});

describe('pageRange', () => {
    it('devuelve el rango mostrado', () => {
        expect(pageRange(50, 25)).toEqual({ from: 51, to: 75 });
    });

    it('devuelve nulo cuando la página está vacía', () => {
        expect(pageRange(50, 0)).toBeNull();
    });
});
