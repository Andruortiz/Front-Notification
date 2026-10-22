import { PAGE_SIZES, pageRange } from '../lib/pagination';

interface PaginationProps {
    page: number;
    size: number;
    offset: number;
    count: number;
    hasNext: boolean;
    busy?: boolean;
    onPageChange: (page: number) => void;
    onSizeChange: (size: number) => void;
}

export default function Pagination({
    page,
    size,
    offset,
    count,
    hasNext,
    busy = false,
    onPageChange,
    onSizeChange,
}: PaginationProps) {
    const range = pageRange(offset, count);

    return (
        <nav className="pagination" aria-label="Paginación">
            <p className="field-hint" aria-live="polite">
                {range ? `Mostrando ${range.from}–${range.to}` : 'Sin resultados en esta página'}
            </p>
            <div className="pagination-controls">
                <label className="pagination-size">
                    Por página
                    <select
                        value={size}
                        onChange={(event) => onSizeChange(Number(event.target.value))}
                    >
                        {PAGE_SIZES.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="button"
                    className="catalog-action-button"
                    disabled={page <= 1 || busy}
                    onClick={() => onPageChange(page - 1)}
                >
                    Anterior
                </button>
                <span aria-current="page">Página {page}</span>
                <button
                    type="button"
                    className="catalog-action-button"
                    disabled={!hasNext || busy}
                    onClick={() => onPageChange(page + 1)}
                >
                    Siguiente
                </button>
            </div>
        </nav>
    );
}
