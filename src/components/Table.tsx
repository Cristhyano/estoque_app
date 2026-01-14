import type {
    ChangeEvent,
    HTMLAttributes,
    TableHTMLAttributes,
    TdHTMLAttributes,
    ThHTMLAttributes,
} from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export const Table = ({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) => {
    return (
        <table
            {...props}
            className={`w-full rounded overflow-hidden ${className ?? ""}`}
        />
    )
}

export const TableHeader = ({
    className,
    ...props
}: HTMLAttributes<HTMLTableSectionElement>) => {
    return <thead {...props} className={`bg-neutral-200 ${className ?? ""}`} />
}

export const TableBody = ({
    className,
    ...props
}: HTMLAttributes<HTMLTableSectionElement>) => {
    return <tbody {...props} className={className} />
}

export const TableFooter = ({
    className,
    ...props
}: HTMLAttributes<HTMLTableSectionElement>) => {
    return <tfoot {...props} className={`bg-neutral-300 ${className ?? ""}`} />
}

export const TableRow = ({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) => {
    return <tr {...props} className={className} />
}

export const TableHead = ({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) => {
    return (
        <th {...props} className={`p-2 ${className ?? ""}`} />
    )
}

export const TableCell = ({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) => {
    return (
        <td {...props} className={`p-2 ${className ?? ""}`} />
    )
}

type TablePaginationProps = {
    page: string
    limit: string
    maxPage?: number
    onPageChange: (value: string) => void
    onLimitChange: (value: string) => void
    onDelta?: (delta: number) => void
}

export const TablePagination = ({
    page,
    limit,
    maxPage,
    onPageChange,
    onLimitChange,
    onDelta,
}: TablePaginationProps) => {
    const pageNumber = Math.max(1, Number(page) || 1)
    const effectiveMaxPage = maxPage && maxPage > 0 ? maxPage : undefined
    const handlePageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const rawValue = event.target.value
        if (rawValue.trim() === "") {
            onPageChange(rawValue)
            return
        }
        const numericValue = Number(rawValue)
        if (!Number.isFinite(numericValue)) {
            onPageChange(rawValue)
            return
        }
        let nextValue = Math.max(1, Math.trunc(numericValue))
        if (effectiveMaxPage) {
            nextValue = Math.min(nextValue, effectiveMaxPage)
        }
        onPageChange(String(nextValue))
    }

    const handleLimitChange = (event: ChangeEvent<HTMLInputElement>) => {
        onLimitChange(event.target.value)
    }

    return (
        <div className="flex flex-row justify-end gap-2">
            <button
                type="button"
                className="bg-neutral-800 p-1 rounded text-white cursor-pointer"
                onClick={() => onDelta?.(-1)}
                disabled={!onDelta || pageNumber <= 1}
            >
                <ChevronLeft />
            </button>
            <input
                id="page"
                placeholder="1"
                type="number"
                min={1}
                max={effectiveMaxPage}
                className="w-10 bg-neutral-200 rounded text-center"
                value={page}
                onChange={handlePageChange}
            />
            <button
                type="button"
                className="bg-neutral-800 p-1 rounded text-white cursor-pointer"
                onClick={() => onDelta?.(1)}
                disabled={!onDelta || (effectiveMaxPage ? pageNumber >= effectiveMaxPage : false)}
            >
                <ChevronRight />
            </button>
            <input
                id="limit"
                placeholder="10"
                type="number"
                min={1}
                className="w-10 bg-neutral-200 rounded text-center"
                value={limit}
                onChange={handleLimitChange}
            />
        </div>
    )
}
