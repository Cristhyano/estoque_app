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
    onPageChange: (value: string) => void
    onLimitChange: (value: string) => void
    onDelta?: (delta: number) => void
}

export const TablePagination = ({
    page,
    limit,
    onPageChange,
    onLimitChange,
    onDelta,
}: TablePaginationProps) => {
    const handlePageChange = (event: ChangeEvent<HTMLInputElement>) => {
        onPageChange(event.target.value)
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
                disabled={!onDelta}
            >
                <ChevronLeft />
            </button>
            <input
                id="page"
                placeholder="1"
                type="number"
                min={1}
                className="w-10 bg-neutral-200 rounded text-center"
                value={page}
                onChange={handlePageChange}
            />
            <button
                type="button"
                className="bg-neutral-800 p-1 rounded text-white cursor-pointer"
                onClick={() => onDelta?.(1)}
                disabled={!onDelta}
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
