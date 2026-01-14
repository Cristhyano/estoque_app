import { useState } from "react"
import type { ChangeEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "@tanstack/react-router"
import Divider from "../components/Divider"
import Input from "../components/Input"
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/Table"
import { Barcode, ChevronLeft, ChevronRight, PackageSearch } from "lucide-react"

type InventoryPeriod = {
    id: string
    nome: string
    inicio: string
    fim: string | null
    status: string
}

type ProductInventoryItem = {
    id_produto: string
    id_inventario: string
    quantidade: number
    qtd_sistema?: number
    qtd_conferida?: number
    ajuste?: number
    preco_unitario?: number
    valor_sistema?: number
    valor_conferido?: number
    diferenca_valor?: number
    last_read?: string | null
}

type Product = {
    codigo?: string
    codigo_barras?: string
    nome?: string
}

type DetailFilters = {
    codigo: string
    codigo_barras: string
    nome: string
    page: string
    limit: string
}

const formatDateTime = (value?: string | null) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "-"
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(date)
}

const formatCurrency = (value?: number | null) => {
    const safeValue = Number(value ?? 0)
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(Number.isFinite(safeValue) ? safeValue : 0)
}

const normalize = (value: string) => value.trim().toLowerCase()

const InventoryDetail = () => {
    const { id } = useParams({ from: "/inventarios/$id" })
    const [filters, setFilters] = useState<DetailFilters>({
        codigo: "",
        codigo_barras: "",
        nome: "",
        page: "1",
        limit: "20",
    })

    const handleFilterChange = (key: keyof DetailFilters) =>
        (event: ChangeEvent<HTMLInputElement>) => {
            setFilters((prev) => {
                const next = {
                    ...prev,
                    [key]: event.target.value,
                }

                if (key === "limit") {
                    next.page = "1"
                }

                if (key !== "page" && key !== "limit") {
                    next.page = "1"
                }

                return next
            })
        }

    const changePage = (delta: number) => {
        setFilters((prev) => {
            const current = Number(prev.page) || 1
            const nextPage = Math.max(1, current + delta)
            return {
                ...prev,
                page: String(nextPage),
            }
        })
    }

    const inventoryQuery = useQuery({
        queryKey: ["inventarios", id],
        queryFn: async () => {
            const response = await fetch(`http://localhost:3001/inventarios/${id}`)
            if (!response.ok) {
                throw new Error("Falha ao carregar inventario")
            }
            return (await response.json()) as InventoryPeriod
        },
    })

    const productInventoryQuery = useQuery({
        queryKey: ["produto-inventario", id],
        queryFn: async () => {
            const response = await fetch("http://localhost:3001/produto-inventario")
            if (!response.ok) {
                throw new Error("Falha ao carregar itens do inventario")
            }
            return (await response.json()) as ProductInventoryItem[]
        },
    })

    const productsQuery = useQuery({
        queryKey: ["products", "all"],
        queryFn: async () => {
            const response = await fetch("http://localhost:3001/products")
            if (!response.ok) {
                throw new Error("Falha ao carregar produtos")
            }
            return (await response.json()) as Product[]
        },
    })

    if (inventoryQuery.error) {
        return "An error has occurred: " + inventoryQuery.error.message
    }

    const inventory = inventoryQuery.data
    const productInventory = Array.isArray(productInventoryQuery.data) ? productInventoryQuery.data : []
    const products = Array.isArray(productsQuery.data) ? productsQuery.data : []

    const productsById = new Map(
        products.map((item) => [
            item.codigo || item.codigo_barras || "",
            item,
        ])
    )

    const rawItems = productInventory.filter((item) => item.id_inventario === id)
    const normalizedCodigo = normalize(filters.codigo)
    const normalizedCodigoBarras = normalize(filters.codigo_barras)
    const normalizedNome = normalize(filters.nome)

    let filteredItems = rawItems.filter((item) => {
        const product = productsById.get(item.id_produto)
        const codigo = normalize(product?.codigo ?? "")
        const codigoBarras = normalize(product?.codigo_barras ?? "")
        const nome = normalize(product?.nome ?? "")

        if (normalizedCodigo && !codigo.includes(normalizedCodigo)) {
            return false
        }
        if (normalizedCodigoBarras && !codigoBarras.includes(normalizedCodigoBarras)) {
            return false
        }
        if (normalizedNome && !nome.includes(normalizedNome)) {
            return false
        }

        return true
    })

    const limit = Math.max(1, Number(filters.limit) || 20)
    const page = Math.max(1, Number(filters.page) || 1)
    const totalItems = filteredItems.length
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit)
    const start = (page - 1) * limit
    const rows = filteredItems.slice(start, start + limit)
    const totalQuantidade = rawItems.reduce(
        (sum, item) => sum + Number(item.qtd_conferida ?? item.quantidade ?? 0),
        0
    )

    const isLoading = inventoryQuery.isPending || productInventoryQuery.isPending || productsQuery.isPending
    const isFetching = inventoryQuery.isFetching || productInventoryQuery.isFetching || productsQuery.isFetching

    return (
        <main className="flex flex-col gap-4 h-screen p-4 bg-neutral-100 overflow-hidden">
            <header className="flex flex-row justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Inventario {inventory?.id ?? ""}</h1>
                    <div className="text-sm text-neutral-600">
                        {inventory?.nome ?? "Inventario"} - {formatDateTime(inventory?.inicio)} - {formatDateTime(inventory?.fim)}
                    </div>
                </div>
                <div className="flex flex-row gap-4">
                    <Link
                        to="/inventarios"
                        className="bg-neutral-800 px-2 rounded text-white flex flex-row items-center gap-2 cursor-pointer"
                    >
                        Voltar
                    </Link>
                </div>
            </header>

            <Divider />

            <form className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <Input
                    id="codigo"
                    label="Codigo do Produto"
                    icon={PackageSearch}
                    placeholder="00000"
                    type="text"
                    value={filters.codigo}
                    onChange={handleFilterChange("codigo")}
                />
                <Input
                    id="codigo-barras"
                    label="Codigo de barras"
                    icon={Barcode}
                    placeholder="000000000000"
                    type="text"
                    value={filters.codigo_barras}
                    onChange={handleFilterChange("codigo_barras")}
                />
                <Input
                    id="nome"
                    label="Nome do Produto"
                    icon={PackageSearch}
                    placeholder="PRODUTO"
                    type="text"
                    value={filters.nome}
                    onChange={handleFilterChange("nome")}
                />
            </form>

            <div className="flex flex-col h-full overflow-hidden rounded">
                <div className="flex-1 overflow-y-auto">
                    <Table className="uppercase overflow-visible rounded">
                        <TableHeader>
                            <TableRow className="sticky top-0 bg-neutral-200">
                                <TableHead className="text-left">cod.</TableHead>
                                <TableHead className="text-left">nome</TableHead>
                                <TableHead className="text-right">preco unitario</TableHead>
                                <TableHead className="text-center">qtd. sistema</TableHead>
                                <TableHead className="text-center">qtd. conferida</TableHead>
                                <TableHead className="text-center">ajuste</TableHead>
                                <TableHead className="text-right">valor sistema</TableHead>
                                <TableHead className="text-right">valor conferido</TableHead>
                                <TableHead className="text-right">diferenca (r$)</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center">
                                        Carregando
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center">
                                        Nenhum produto encontrado
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((item) => {
                                    const product = productsById.get(item.id_produto)
                                    const codigoProduto = String(product?.codigo ?? item.id_produto ?? "")
                                    const qtdSistema = Number(item.qtd_sistema ?? product?.quantidade ?? 0)
                                    const qtdConferida = Number(item.qtd_conferida ?? item.quantidade ?? 0)
                                    const ajuste = Number(item.ajuste ?? qtdConferida - qtdSistema)
                                    const precoUnitario = Number(item.preco_unitario ?? 0)
                                    const valorSistema = Number(item.valor_sistema ?? qtdSistema * precoUnitario)
                                    const valorConferido = Number(item.valor_conferido ?? qtdConferida * precoUnitario)
                                    const diferencaValor = Number(item.diferenca_valor ?? valorConferido - valorSistema)
                                    return (
                                        <TableRow key={`${item.id_inventario}-${item.id_produto}`} className="hover:bg-neutral-400/20 duration-200">
                                            <TableCell className="text-left">{codigoProduto}</TableCell>
                                            <TableCell className="text-left">{product?.nome ?? "-"}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(precoUnitario)}</TableCell>
                                            <TableCell className="text-center">{qtdSistema}</TableCell>
                                            <TableCell className="text-center">{qtdConferida}</TableCell>
                                            <TableCell className="text-center">{ajuste}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(valorSistema)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(valorConferido)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(diferencaValor)}</TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>

                        <TableFooter>
                            <TableRow className="sticky bottom-0 bg-neutral-200">
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-center">{totalQuantidade}</TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>

                <div>
                    {isFetching ? (
                        <div className="flex flex-row items-center gap-2">
                            Carregando
                        </div>
                    ) : (
                        <div className="flex flex-row items-center gap-2">
                            {totalItems} itens, {totalPages} paginas
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-row justify-end gap-2">
                <button
                    type="button"
                    className="bg-neutral-800 p-1 rounded text-white cursor-pointer"
                    onClick={() => changePage(-1)}
                >
                    <ChevronLeft />
                </button>
                <input
                    id="page"
                    placeholder="1"
                    type="number"
                    min={1}
                    className="w-10 bg-neutral-200 rounded text-center"
                    value={filters.page}
                    onChange={handleFilterChange("page")}
                />
                <button
                    type="button"
                    className="bg-neutral-800 p-1 rounded text-white cursor-pointer"
                    onClick={() => changePage(1)}
                >
                    <ChevronRight />
                </button>
                <input
                    id="limit"
                    placeholder="10"
                    type="number"
                    min={1}
                    className="w-10 bg-neutral-200 rounded text-center"
                    value={filters.limit}
                    onChange={handleFilterChange("limit")}
                />
            </div>
        </main>
    )
}

export default InventoryDetail
