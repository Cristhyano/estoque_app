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
}

const ProductTable = ({ filters }: ProductTableProps) => {
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

    const rows = Array.isArray(data) ? data : []

    return (
        <div className="relative">
            <div className="absolute -top-10">
                {(isFetching || isPending) ? "Carregando..." : "Lista Atualizada"}
            </div>
            <Table className="uppercase">
                <TableHeader>
                    <TableRow>
                        <TableHead>cod.</TableHead>
                        <TableHead>nome</TableHead>
                        <TableHead>qtd.</TableHead>
                        <TableHead>valor</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((item: any) => {
                        return (
                            <TableRow key={item.codigo}>
                                <TableCell>{item.codigo}</TableCell>
                                <TableCell>{item.nome}</TableCell>
                                <TableCell>{item.quantidade}</TableCell>
                                <TableCell>{item.preco_decimal}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell>00000</TableCell>
                        <TableCell>00000</TableCell>
                        <TableCell>00000</TableCell>
                        <TableCell>00000</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    )
}

export default ProductTable
