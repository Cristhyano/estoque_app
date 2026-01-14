import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/Table"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

type InventoryFilters = {
    status: string
    inicio: string
    fim: string
    produto: string
    sort_by: string
    sort_dir: string
    page: string
    limit: string
}

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
    last_read?: string | null
}

type InventoryTableProps = {
    filters: InventoryFilters
    onSortChange: (next: { sort_by: string; sort_dir: string }) => void
}

type PaginatedResponse<T> = {
    items: T[]
    total_items: number
    total_pages: number
    page: number
    limit: number
    totals?: Record<string, number>
}

const hasPagination = <T,>(
    payload: PaginatedResponse<T> | T[] | undefined
): payload is PaginatedResponse<T> => {
    return Boolean(payload && !Array.isArray(payload) && Array.isArray(payload.items))
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

const normalize = (value: string) => value.trim().toLowerCase()

const InventoryTable = ({ filters, onSortChange }: InventoryTableProps) => {
    const queryClient = useQueryClient()
    const [exportingId, setExportingId] = useState<string | null>(null)

    const inventoriesQuery = useQuery({
        queryKey: ["inventarios", filters],
        queryFn: async () => {
            const searchParams = new URLSearchParams()
            Object.entries(filters).forEach(([key, value]) => {
                if (value.trim() !== "") {
                    searchParams.set(key, value)
                }
            })
            const queryString = searchParams.toString()
            const url = queryString
                ? `http://localhost:3001/inventarios?${queryString}`
                : "http://localhost:3001/inventarios"
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error("Falha ao carregar inventarios")
            }
            return (await response.json()) as PaginatedResponse<InventoryPeriod> | InventoryPeriod[]
        },
    })

    const productInventoryQuery = useQuery({
        queryKey: ["produto-inventario"],
        queryFn: async () => {
            const response = await fetch("http://localhost:3001/produto-inventario")
            if (!response.ok) {
                throw new Error("Falha ao carregar itens do inventario")
            }
            return (await response.json()) as ProductInventoryItem[]
        },
    })

    const closeMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch("http://localhost:3001/inventarios/aberto/fechar", {
                method: "PATCH",
            })
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}))
                const errorMessage = errorBody?.error || "Erro ao fechar inventario"
                throw new Error(errorMessage)
            }
            return await response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventarios"] })
        },
    })

    const reopenMutation = useMutation({
        mutationFn: async (payload: InventoryPeriod) => {
            const response = await fetch(`http://localhost:3001/inventarios/${payload.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nome: payload.nome,
                    inicio: payload.inicio,
                    fim: null,
                    status: "aberto",
                }),
            })
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}))
                const errorMessage = errorBody?.error || "Erro ao reabrir inventario"
                throw new Error(errorMessage)
            }
            return await response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inventarios"] })
        },
    })

    if (inventoriesQuery.error) {
        return "An error has occurred: " + inventoriesQuery.error.message
    }

    const inventoriesPayload = inventoriesQuery.data
    const inventories = hasPagination(inventoriesPayload)
        ? inventoriesPayload.items
        : Array.isArray(inventoriesPayload)
            ? inventoriesPayload
            : []
    const productInventory = Array.isArray(productInventoryQuery.data) ? productInventoryQuery.data : []

    const totalsByInventory = productInventory.reduce((acc, item) => {
        const current = acc.get(item.id_inventario) ?? { total: 0, items: 0 }
        acc.set(item.id_inventario, {
            total: current.total + Number(item.quantidade ?? 0),
            items: current.items + 1,
        })
        return acc
    }, new Map<string, { total: number; items: number }>())

    const totalItems = hasPagination(inventoriesPayload)
        ? Number(inventoriesPayload.total_items ?? 0)
        : inventories.length
    const totalPages = hasPagination(inventoriesPayload)
        ? Number(inventoriesPayload.total_pages ?? 0)
        : 0

    const handleSortClick = (nextSort: string) => {
        if (filters.sort_by === nextSort) {
            const nextDir = filters.sort_dir === "asc" ? "desc" : "asc"
            onSortChange({ sort_by: nextSort, sort_dir: nextDir })
        } else {
            onSortChange({ sort_by: nextSort, sort_dir: "asc" })
        }
    }

    const isLoading = inventoriesQuery.isPending
    const isFetching = inventoriesQuery.isFetching || productInventoryQuery.isFetching

    const handleExport = async (inventoryId: string) => {
        if (exportingId) return
        setExportingId(inventoryId)
        try {
            const response = await fetch(`http://localhost:3001/inventarios/${inventoryId}/export`)
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}))
                const errorMessage = errorBody?.error || "Falha ao exportar inventario"
                throw new Error(errorMessage)
            }
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `inventario_${inventoryId}.xlsx`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error(error)
            window.alert("Falha ao exportar inventario")
        } finally {
            setExportingId(null)
        }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden rounded">
            <div className="flex-1 overflow-y-auto">
                <Table className="uppercase overflow-visible rounded">
                    <TableHeader>
                        <TableRow className="sticky top-0 bg-neutral-200">
                            <TableHead className="text-left">inventario</TableHead>
                            <TableHead className="text-left">nome</TableHead>
                            <TableHead className="text-left">
                                <button
                                    type="button"
                                    className="flex items-center gap-1"
                                    onClick={() => handleSortClick("status")}
                                >
                                    status
                                </button>
                            </TableHead>
                            <TableHead className="text-left">
                                <button
                                    type="button"
                                    className="flex items-center gap-1"
                                    onClick={() => handleSortClick("inicio")}
                                >
                                    inicio
                                </button>
                            </TableHead>
                            <TableHead className="text-left">fim</TableHead>
                            <TableHead className="text-center">
                                <button
                                    type="button"
                                    className="flex items-center gap-1 mx-auto"
                                    onClick={() => handleSortClick("quantidade")}
                                >
                                    qtd. itens
                                </button>
                            </TableHead>
                            <TableHead className="text-left">responsavel</TableHead>
                            <TableHead className="text-right">acoes</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center">
                                    Carregando
                                </TableCell>
                            </TableRow>
                        ) : inventories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center">
                                    Nenhum inventario encontrado
                                </TableCell>
                            </TableRow>
                        ) : (
                            inventories.map((item) => {
                                const totals = totalsByInventory.get(item.id)
                                const totalQuantidade = totals?.total ?? 0
                                const statusLabel = normalize(item.status) === "aberto" ? "Aberto" : "Fechado"
                                const statusClass =
                                    normalize(item.status) === "aberto"
                                        ? "bg-green-200 text-green-800"
                                        : "bg-neutral-300 text-neutral-800"
                                return (
                                    <TableRow key={item.id} className="hover:bg-neutral-400/20 duration-200">
                                        <TableCell className="text-left">{item.id}</TableCell>
                                        <TableCell className="text-left">{item.nome ?? "Inventario sem nome"}</TableCell>
                                        <TableCell className="text-left">
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusClass}`}>
                                                {statusLabel}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-left">{formatDateTime(item.inicio)}</TableCell>
                                        <TableCell className="text-left">{formatDateTime(item.fim)}</TableCell>
                                        <TableCell className="text-center">{totalQuantidade}</TableCell>
                                        <TableCell className="text-left">-</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-row justify-end gap-2">
                                                <Link
                                                    to="/inventarios/$id"
                                                    params={{ id: item.id }}
                                                    className="bg-neutral-800 px-2 rounded text-white flex flex-row items-center gap-2 cursor-pointer"
                                                >
                                                    Detalhes
                                                </Link>
                                                <button
                                                    type="button"
                                                    className="bg-neutral-800 px-2 rounded text-white flex flex-row items-center gap-2 cursor-pointer disabled:opacity-60"
                                                    onClick={() => {
                                                        if (!window.confirm("Fechar inventario?")) return
                                                        closeMutation.mutate()
                                                    }}
                                                    disabled={normalize(item.status) !== "aberto" || closeMutation.isPending}
                                                >
                                                    Fechar
                                                </button>
                                                <button
                                                    type="button"
                                                    className="bg-neutral-800 px-2 rounded text-white flex flex-row items-center gap-2 cursor-pointer disabled:opacity-60"
                                                    onClick={() => {
                                                        if (!window.confirm("Reabrir inventario?")) return
                                                        reopenMutation.mutate(item)
                                                    }}
                                                    disabled={normalize(item.status) !== "fechado" || reopenMutation.isPending}
                                                >
                                                    Reabrir
                                                </button>
                                                <button
                                                    type="button"
                                                    className="bg-neutral-800 px-2 rounded text-white flex flex-row items-center gap-2 cursor-pointer disabled:opacity-60"
                                                    onClick={() => handleExport(item.id)}
                                                    disabled={exportingId === item.id}
                                                >
                                                    {exportingId === item.id ? "Exportando" : "Exportar"}
                                                </button>
                                            </div>
                                        </TableCell>
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
                            <TableCell></TableCell>
                            <TableCell className="text-center">
                                {inventories.reduce((sum, item) => sum + (totalsByInventory.get(item.id)?.total ?? 0), 0)}
                            </TableCell>
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
                        {totalItems} linhas, {totalPages} paginas
                    </div>
                )}
            </div>
        </div>
    )
}

export default InventoryTable
