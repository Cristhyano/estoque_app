import { useEffect } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/Table"
import { useQuery } from "@tanstack/react-query"

type ProductFilters = {
    codigo: string
    nome: string
    quantidade_min: string
    quantidade_max: string
    preco_decimal_min: string
    preco_decimal_max: string
    page: string
    limit: string
}

type ProductTableProps = {
    filters: ProductFilters
    onMetaChange?: (meta: { totalPages: number; totalItems: number }) => void
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value)

const ProductTable = ({ filters, onMetaChange }: ProductTableProps) => {
    const { isPending, error, data, isFetching } = useQuery({
        queryKey: ["products", filters],
        queryFn: async () => {
            const searchParams = new URLSearchParams()
            Object.entries(filters).forEach(([key, value]) => {
                if (value.trim() !== "") {
                    searchParams.set(key, value)
                }
            })
            const queryString = searchParams.toString()
            const url = queryString
                ? `http://localhost:3001/products?${queryString}`
                : "http://localhost:3001/products"
            const response = await fetch(url)
            return await response.json()
        },
    })

    if (error) return "An error has occurred: " + error.message

    const rows = Array.isArray(data?.items) ? data?.items : []
    const totalItems = Number(data?.total_items ?? rows.length)
    const totalPages = Number(data?.total_pages ?? 0)

    useEffect(() => {
        onMetaChange?.({ totalPages, totalItems })
    }, [onMetaChange, totalItems, totalPages])

    return (
        <div className="flex flex-col h-full overflow-hidden rounded">
            <div className="flex-1 overflow-y-auto">
                <Table className="uppercase overflow-visible rounded">
                    <TableHeader>
                        <TableRow className="sticky top-0 bg-neutral-200">
                            <TableHead className="text-left">cod.</TableHead>
                            <TableHead className="text-left">cod. barras</TableHead>
                            <TableHead className="text-left">nome</TableHead>
                            <TableHead className="text-center">qtd.</TableHead>
                            <TableHead className="text-right">valor</TableHead>
                        </TableRow>
                    </TableHeader>
                    
                    <TableBody>
                        {rows.map((item: any, index: number) => {
                            const codigoProduto = String(item.codigo ?? "")
                            const codigoBarras = String(item.codigo_barras ?? "")
                            const rowKey = item.codigo || item.codigo_barras || `${item.nome}-${index}`
                            return (
                                <TableRow key={rowKey} className="hover:bg-neutral-400/20 duration-200">
                                    <TableCell className="text-left">{codigoProduto}</TableCell>
                                    <TableCell className="text-left">{codigoBarras}</TableCell>
                                    <TableCell className="text-left">{item.nome}</TableCell>
                                    <TableCell className="text-center">{item.quantidade}</TableCell>
                                    <TableCell className="text-right">
                                        {formatCurrency(Number(item.preco_decimal))}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>

                    <TableFooter>
                        <TableRow className="sticky bottom-0 bg-neutral-200">
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-center">{data?.totals?.quantidade}</TableCell>
                            <TableCell className="text-right">
                                {formatCurrency(Number(data?.totals?.preco_decimal))}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            <div>
                {
                    (isFetching || isPending) ?
                        <div className="flex flex-row items-center gap-2">
                            {/* <ReloadIcon className="animate-spin" /> */}
                            Carregando
                        </div>
                        :
                        <div className="flex flex-row items-center gap-2">
                            {/* <CheckIcon /> */}
                            {data?.total_items} linhas, {data?.total_pages} paginas
                        </div>
                }
            </div>
        </div>
    )
}

export default ProductTable
