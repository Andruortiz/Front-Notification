export const PAGE_SIZES = [10, 25, 50, 100, 200] as const;
export const DEFAULT_PAGE_SIZE = 50;

export interface PageParams {
    page: number;
    size: number;
}

export function parsePageParams(params: URLSearchParams): PageParams {
    const rawSize = Number(params.get('size'));
    const rawPage = Number(params.get('page'));
    const size = (PAGE_SIZES as readonly number[]).includes(rawSize) ? rawSize : DEFAULT_PAGE_SIZE;
    const page = Number.isSafeInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
    return { page, size };
}

export function pageToOffset({ page, size }: PageParams): number {
    return (page - 1) * size;
}

export function pageRange(offset: number, count: number): { from: number; to: number } | null {
    return count === 0 ? null : { from: offset + 1, to: offset + count };
}
