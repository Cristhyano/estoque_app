import { useEffect, useState } from "react"
import type { ChangeEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
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
    TablePagination,
} from "../components/Table"
import { Barcode, PackageSearch } from "lucide-react"
import { apiBaseUrl } from "../config"

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
    produto?: {
        codigo?: string
        codigo_barras?: string
        nome?: string
    } | null
}

type InventoryItemsResponse = {
    items: ProductInventoryItem[]
    total_items: number
    total_pages: number
    page: number
    limit: number
    totals?: {
        qtdSistema?: number
        qtdConferida?: number
        ajuste?: number
        valorSistema?: number
        valorConferido?: number
        diferencaValor?: number
    }
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
            const rawNext = current + delta
            const maxPage = totalPages > 0 ? totalPages : undefined
            const nextPage = maxPage ? Math.min(Math.max(1, rawNext), maxPage) : Math.max(1, rawNext)
            return {
                ...prev,
                page: String(nextPage),
            }
        })
    }

    const handlePageValueChange = (value: string) => {
        setFilters((prev) => ({
            ...prev,
            page: value,
        }))
    }

    const handleLimitValueChange = (value: string) => {
        setFilters((prev) => ({
            ...prev,
            limit: value,
            page: "1",
        }))
    }

    const inventoryQuery = useQuery({
        queryKey: ["inventarios", id],
        queryFn: async () => {
            const response = await fetch(`${apiBaseUrl}/inventarios/${id}`)
            if (!response.ok) {
                throw new Error("Falha ao carregar inventario")
            }
            return (await response.json()) as InventoryPeriod
        },
    })

    const itemsQuery = useQuery({
        queryKey: ["inventario-items", id, filters],
        queryFn: async () => {
            const searchParams = new URLSearchParams()
            Object.entries(filters).forEach(([key, value]) => {
                if (value.trim() !== "") {
                    searchParams.set(key, value)
                }
            })
            searchParams.set("include_totals", "1")
            const queryString = searchParams.toString()
            const response = await fetch(`${apiBaseUrl}/inventarios/${id}/items?${queryString}`)
            if (!response.ok) {
                throw new Error("Falha ao carregar itens do inventario")
            }
            return (await response.json()) as InventoryItemsResponse
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
            const response = await fetch(`${apiBaseUrl}/inventarios/${id}/nome`, {
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

    const itemsPayload = itemsQuery.data
    const rows = Array.isArray(itemsPayload?.items) ? itemsPayload.items : []
    const totalItems = Number(itemsPayload?.total_items ?? rows.length)
    const totalPages = Number(itemsPayload?.total_pages ?? 0)
    const totals = itemsPayload?.totals ?? {}

    const isLoading = inventoryQuery.isPending || itemsQuery.isPending
    const isFetching = inventoryQuery.isFetching || itemsQuery.isFetching

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
                                    const produto = item.produto
                                    const codigoProduto = String(produto?.codigo ?? item.id_produto ?? "")
                                    const qtdSistema = Number(item.qtd_sistema ?? 0)
                                    const qtdConferida = Number(item.qtd_conferida ?? item.quantidade ?? 0)
                                    const ajuste = Number(item.ajuste ?? qtdConferida - qtdSistema)
                                    const precoUnitario = Number(item.preco_unitario ?? 0)
                                    const valorSistema = Number(item.valor_sistema ?? qtdSistema * precoUnitario)
                                    const valorConferido = Number(item.valor_conferido ?? qtdConferida * precoUnitario)
                                    const diferencaValor = Number(item.diferenca_valor ?? valorConferido - valorSistema)
                                    return (
                                        <TableRow key={`${item.id_inventario}-${item.id_produto}`} className="hover:bg-neutral-400/20 duration-200">
                                            <TableCell className="text-left">{codigoProduto}</TableCell>
                                            <TableCell className="text-left">{produto?.nome ?? "-"}</TableCell>
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
                                <TableCell className="text-center">{totals.qtdSistema ?? 0}</TableCell>
                                <TableCell className="text-center">{totals.qtdConferida ?? 0}</TableCell>
                                <TableCell className="text-center">{totals.ajuste ?? 0}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.valorSistema ?? 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.valorConferido ?? 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.diferencaValor ?? 0)}</TableCell>
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

            <TablePagination
                page={filters.page}
                limit={filters.limit}
                maxPage={totalPages > 0 ? totalPages : undefined}
                onPageChange={handlePageValueChange}
                onLimitChange={handleLimitValueChange}
                onDelta={changePage}
            />
        </>
    )
}

export default InventoryDetail
