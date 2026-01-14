import { useEffect, useState } from "react"
import type { ChangeEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
    nome: string | null
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
    const queryClient = useQueryClient()
    const [filters, setFilters] = useState<DetailFilters>({
        codigo: "",
        codigo_barras: "",
        nome: "",
        page: "1",
        limit: "20",
    })
    const [isEditingName, setIsEditingName] = useState(false)
    const [nameDraft, setNameDraft] = useState("")
    const [nameError, setNameError] = useState<string | null>(null)

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

    useEffect(() => {
        if (!isEditingName) {
            setNameDraft(inventory?.nome ?? "")
        }
    }, [inventory?.nome, isEditingName])

    const updateNameMutation = useMutation({
        mutationFn: async (nextName: string | null) => {
            const response = await fetch(`http://localhost:3001/inventarios/${id}/nome`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ nome: nextName }),
            })
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}))
                const errorMessage = errorBody?.error || "Erro ao atualizar nome"
                throw new Error(errorMessage)
            }
            return (await response.json()) as InventoryPeriod
        },
        onSuccess: (updated) => {
            queryClient.setQueryData(["inventarios", id], updated)
            queryClient.invalidateQueries({ queryKey: ["inventarios"] })
            setIsEditingName(false)
            setNameError(null)
            setNameDraft(updated.nome ?? "")
        },
        onError: (error: Error) => {
            setNameError(error.message)
        },
    })

    const handleStartEdit = () => {
        setNameError(null)
        setIsEditingName(true)
    }

    const handleCancelEdit = () => {
        setNameError(null)
        setIsEditingName(false)
        setNameDraft(inventory?.nome ?? "")
    }

    const handleSaveName = () => {
        if (updateNameMutation.isPending) return
        const trimmed = nameDraft.trim()
        if (trimmed && trimmed.length > 100) {
            setNameError("Nome muito longo")
            return
        }
        setNameError(null)
        updateNameMutation.mutate(trimmed ? trimmed : null)
    }
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
    const totals = rawItems.reduce(
        (acc, item) => {
            const qtdSistema = Number(item.qtd_sistema ?? 0)
            const qtdConferida = Number(item.qtd_conferida ?? item.quantidade ?? 0)
            const ajuste = Number(item.ajuste ?? 0)
            const valorSistema = Number(item.valor_sistema ?? 0)
            const valorConferido = Number(item.valor_conferido ?? 0)
            const diferencaValor = Number(item.diferenca_valor ?? 0)
            return {
                qtdSistema: acc.qtdSistema + qtdSistema,
                qtdConferida: acc.qtdConferida + qtdConferida,
                ajuste: acc.ajuste + ajuste,
                valorSistema: acc.valorSistema + valorSistema,
                valorConferido: acc.valorConferido + valorConferido,
                diferencaValor: acc.diferencaValor + diferencaValor,
            }
        },
        {
            qtdSistema: 0,
            qtdConferida: 0,
            ajuste: 0,
            valorSistema: 0,
            valorConferido: 0,
            diferencaValor: 0,
        }
    )

    const isLoading = inventoryQuery.isPending || productInventoryQuery.isPending || productsQuery.isPending
    const isFetching = inventoryQuery.isFetching || productInventoryQuery.isFetching || productsQuery.isFetching

    return (
        <>
            <header className="flex flex-row justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Inventario {inventory?.id ?? ""}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        {isEditingName ? (
                            <input
                                className="bg-neutral-200 px-2 py-1 rounded text-sm"
                                value={nameDraft}
                                onChange={(event) => setNameDraft(event.target.value)}
                                onBlur={handleSaveName}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault()
                                        handleSaveName()
                                    }
                                    if (event.key === "Escape") {
                                        event.preventDefault()
                                        handleCancelEdit()
                                    }
                                }}
                                disabled={updateNameMutation.isPending}
                                autoFocus
                            />
                        ) : (
                            <span className="text-sm font-medium text-neutral-800">
                                {inventory?.nome ?? "Inventario sem nome"}
                            </span>
                        )}
                        {updateNameMutation.isPending && (
                            <span className="text-xs text-neutral-500">Salvando...</span>
                        )}
                        {!isEditingName && (
                            <button
                                type="button"
                                className="text-xs text-neutral-600 hover:text-neutral-800"
                                onClick={handleStartEdit}
                            >
                                Editar
                            </button>
                        )}
                    </div>
                    {nameError && (
                        <div className="text-xs text-red-600">{nameError}</div>
                    )}
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
                                <TableCell className="text-center">{totals.qtdSistema}</TableCell>
                                <TableCell className="text-center">{totals.qtdConferida}</TableCell>
                                <TableCell className="text-center">{totals.ajuste}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.valorSistema)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.valorConferido)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.diferencaValor)}</TableCell>
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
        </>
    )
}

export default InventoryDetail
