import type {
    HTMLAttributes,
    TableHTMLAttributes,
    TdHTMLAttributes,
    ThHTMLAttributes,
} from "react"

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
