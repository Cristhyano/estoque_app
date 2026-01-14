import { useEffect, useRef, useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import { Barcode } from "lucide-react"

type ProdutoInventarioItem = {
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

type InventoryPeriod = {
    id: string
    nome: string | null
    inicio: string
    fim: string | null
    status: string
}

type ProdutoInventarioOpenResponse = {
    inventario: {
        id: string
        nome: string | null
        inicio: string
        fim: string | null
        status: string
    }
    items: ProdutoInventarioItem[]
    recent_reads?: ProdutoInventarioRead[]
}

type ProdutoInventarioRead = {
    id?: string
    id_produto: string
    id_inventario: string
    created_at?: string | null
    preco_unitario?: number
    produto?: {
        codigo?: string
        codigo_barras?: string
        nome?: string
    } | null
}

type ProdutoInventarioResponse = {
    produto: {
        codigo?: string
        codigo_barras?: string
        nome?: string
    }
    inventario: {
        id: string
        nome: string | null
        inicio: string
        fim: string | null
        status: string
    }
    leitura: {
        id?: string
        id_produto: string
        id_inventario: string
        created_at?: string | null
    }
    acumulado?: ProdutoInventarioItem
    recent_reads?: ProdutoInventarioRead[]
}

const formatDateTime = (value?: string | null) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "-"
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
    }).format(date)
}

const InventoryScan = () => {
    const queryClient = useQueryClient()
    const inputRef = useRef<HTMLInputElement>(null)
    const lastReadRef = useRef<{ code: string; at: number }>({ code: "", at: 0 })
    const highlightTimeoutRef = useRef<number | null>(null)
    const audioRef = useRef<AudioContext | null>(null)
    const wasFetchingRef = useRef(false)
    const [code, setCode] = useState("")
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const [highlightId, setHighlightId] = useState<string | null>(null)
    const [removeQuantities, setRemoveQuantities] = useState<Record<string, string>>({})
    const [selectedInventoryId, setSelectedInventoryId] = useState("")

    const { data, isPending, isFetching, error } = useQuery<ProdutoInventarioOpenResponse>({
        queryKey: ["produto-inventario-open", selectedInventoryId],
        queryFn: async () => {
            const query = selectedInventoryId ? `?inventario_id=${selectedInventoryId}` : ""
            const response = await fetch(`http://localhost:3001/produto-inventario/aberto${query}`)
            if (!response.ok) {
                throw new Error("Falha ao carregar leituras")
            }
            return await response.json()
        },
    })

    const { data: openInventories } = useQuery<InventoryPeriod[]>({
        queryKey: ["inventarios-open"],
        queryFn: async () => {
            const response = await fetch("http://localhost:3001/inventarios?status=aberto&limit=200")
            if (!response.ok) {
                throw new Error("Falha ao carregar inventarios")
            }
            const payload = await response.json()
            return Array.isArray(payload?.items) ? payload.items : payload
        },
    })

    const playBeep = (type: "success" | "error") => {
        if (typeof window === "undefined" || !window.AudioContext) return
        if (!audioRef.current) {
            audioRef.current = new AudioContext()
        }
        const ctx = audioRef.current
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        oscillator.type = "sine"
        oscillator.frequency.value = type === "success" ? 880 : 220
        gain.gain.value = 0.06
        oscillator.connect(gain)
        gain.connect(ctx.destination)
        oscillator.start()
        oscillator.stop(ctx.currentTime + 0.08)
    }

    const mutation = useMutation({
        mutationFn: async (payload: { codigo: string }) => {
            const response = await fetch("http://localhost:3001/produto-inventario", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...payload,
                    inventarioId: selectedInventoryId || undefined,
                }),
            })
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}))
                const errorMessage =
                    errorBody?.error || "Erro ao registrar leitura"
                throw new Error(errorMessage)
            }
            return (await response.json()) as ProdutoInventarioResponse
        },
        onSuccess: (payload) => {
            setMessage({ type: "success", text: "Leitura registrada" })
            const rel = payload.acumulado
            const productId = rel?.id_produto ?? payload.leitura?.id_produto
            if (productId) {
                setHighlightId(productId)
            }
            if (highlightTimeoutRef.current) {
                window.clearTimeout(highlightTimeoutRef.current)
            }
            highlightTimeoutRef.current = window.setTimeout(() => {
                setHighlightId(null)
            }, 800)
            playBeep("success")
            queryClient.setQueryData<ProdutoInventarioOpenResponse | undefined>(
                ["produto-inventario-open"],
                (current) => {
                    if (!current) return current
                    const nextItems = [...current.items]
                    if (rel) {
                        const index = nextItems.findIndex(
                            (item) =>
                                item.id_produto === rel.id_produto &&
                                item.id_inventario === rel.id_inventario
                        )
                        const nextItem = {
                            ...rel,
                            produto: payload.produto ?? rel.produto ?? null,
                        }
                        if (index >= 0) {
                            nextItems[index] = nextItem
                        } else {
                            nextItems.unshift(nextItem)
                        }
                    }
                    const recentReads = payload.recent_reads ?? current.recent_reads ?? []
                    return {
                        ...current,
                        items: nextItems,
                        inventario: payload.inventario,
                        recent_reads: recentReads,
                    }
                }
            )
        },
        onError: (err: Error) => {
            setMessage({ type: "error", text: err.message })
            playBeep("error")
        },
        onSettled: () => {
            setCode("")
            inputRef.current?.focus()
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (payload: { id: string; inventoryId?: string; quantidade?: number }) => {
            const searchParams = new URLSearchParams()
            if (payload.quantidade) {
                searchParams.set("quantidade", String(payload.quantidade))
            }
            if (payload.inventoryId) {
                searchParams.set("inventario_id", payload.inventoryId)
            }
            const query = searchParams.toString()
            const response = await fetch(
                `http://localhost:3001/leituras/${payload.id}${query ? `?${query}` : ""}`,
                { method: "DELETE" }
            )
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}))
                const errorMessage =
                    errorBody?.error || "Erro ao remover leitura"
                throw new Error(errorMessage)
            }
            return (await response.json()) as ProdutoInventarioOpenResponse
        },
        onSuccess: (payload) => {
            queryClient.setQueryData(["produto-inventario-open"], payload)
        },
        onError: (err: Error) => {
            setMessage({ type: "error", text: err.message })
        },
    })

    const closeMutation = useMutation({
        mutationFn: async () => {
            const inventoryId = data?.inventario?.id
            if (!inventoryId) {
                throw new Error("Inventario nao encontrado")
            }
            const response = await fetch(`http://localhost:3001/inventarios/${inventoryId}/fechar`, {
                method: "PATCH",
            })
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}))
                const errorMessage =
                    errorBody?.error || "Erro ao finalizar inventario"
                throw new Error(errorMessage)
            }
            return await response.json()
        },
        onSuccess: () => {
            setMessage({ type: "success", text: "Inventario finalizado" })
            queryClient.invalidateQueries({ queryKey: ["produto-inventario-open"] })
        },
        onError: (err: Error) => {
            setMessage({ type: "error", text: err.message })
        },
        onSettled: () => {
            inputRef.current?.focus()
        },
    })

    useEffect(() => {
        inputRef.current?.focus()
        return () => {
            if (highlightTimeoutRef.current) {
                window.clearTimeout(highlightTimeoutRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (!selectedInventoryId && data?.inventario?.id) {
            setSelectedInventoryId(data.inventario.id)
        }
    }, [data?.inventario?.id, selectedInventoryId])

    useEffect(() => {
        if (!mutation.isPending) {
            inputRef.current?.focus()
        }
    }, [mutation.isPending])

    useEffect(() => {
        if (wasFetchingRef.current && !isFetching) {
            inputRef.current?.focus()
        }
        wasFetchingRef.current = isFetching
    }, [isFetching])

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault()
        const trimmed = code.trim()
        if (!trimmed || mutation.isPending || closeMutation.isPending) return
        const now = Date.now()
        if (
            lastReadRef.current.code === trimmed &&
            now - lastReadRef.current.at < 400
        ) {
            return
        }
        lastReadRef.current = { code: trimmed, at: now }
        setMessage(null)
        mutation.mutate({ codigo: trimmed })
    }

    const items = data?.items ?? []
    const recentReads = data?.recent_reads ?? []
    const totalQuantidade = items.reduce(
        (sum, item) => sum + Number(item.qtd_conferida ?? item.quantidade ?? 0),
        0
    )

    return (
        <>
            <header className="flex flex-row justify-between">
                <h1 className="text-2xl font-semibold">Leitura de produtos</h1>
                <button
                    type="button"
                    className="bg-neutral-800 px-2 rounded text-white flex flex-row items-center gap-2 cursor-pointer"
                    onClick={() => closeMutation.mutate()}
                    disabled={closeMutation.isPending}
                >
                    Finalizar inventario
                </button>
            </header>

            <Divider />

            <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="inventario-select">
                    Inventario ativo
                </label>
                <select
                    id="inventario-select"
                    className="bg-neutral-200 rounded px-2 py-1"
                    value={selectedInventoryId}
                    onChange={(event) => {
                        const nextId = event.target.value
                        if (nextId === selectedInventoryId) return
                        if (!window.confirm("Trocar inventario ativo?")) return
                        setSelectedInventoryId(nextId)
                    }}
                >
                    {(openInventories ?? []).length === 0 && (
                        <option value="" disabled>
                            Nenhum inventario aberto
                        </option>
                    )}
                    {(openInventories ?? []).map((inventario) => (
                        <option key={inventario.id} value={inventario.id}>
                            {inventario.nome ?? "Inventario sem nome"} - {inventario.id}
                        </option>
                    ))}
                </select>
            </div>

            <form onSubmit={handleSubmit}>
                <Input
                    ref={inputRef}
                    id="scan-code"
                    label="Codigo do produto ou codigo de barras"
                    icon={Barcode}
                    placeholder="Escaneie o codigo"
                    type="text"
                    autoFocus
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    // onBlur={() => {
                    //     if (!mutation.isPending) {
                    //         window.setTimeout(() => inputRef.current?.focus(), 0)
                    //     }
                    // }}
                    disabled={mutation.isPending || closeMutation.isPending}
                />
            </form>

            {message && (
                <div
                    className={`text-sm ${message.type === "success"
                        ? "text-green-700"
                        : "text-red-600"
                        }`}
                >
                    {message.text}
                </div>
            )}

            <div className="flex flex-col gap-4 h-full overflow-hidden rounded">
                <div className="flex flex-col overflow-hidden rounded">
                    <div className="flex-1 overflow-y-auto">
                        <Table className="uppercase overflow-visible rounded">
                            <TableHeader>
                                <TableRow className="sticky top-0 bg-neutral-200">
                                    <TableHead className="text-left">cod.</TableHead>
                                    <TableHead className="text-left">nome</TableHead>
                                    <TableHead className="text-right">preco</TableHead>
                                    <TableHead className="text-left">horario</TableHead>
                                    <TableHead className="text-right">acao</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {recentReads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">
                                            Nenhuma leitura recente
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    recentReads.map((read, index) => {
                                        const produto = read.produto
                                        const codigoProduto = String(produto?.codigo ?? read.id_produto ?? "")
                                        const rowKey = `${read.id_inventario}-${read.id_produto}-${index}`
                                        return (
                                            <TableRow key={rowKey} className="hover:bg-neutral-400/20 duration-200">
                                                <TableCell className="text-left">{codigoProduto}</TableCell>
                                                <TableCell className="text-left">{produto?.nome ?? "-"}</TableCell>
                                                <TableCell className="text-right">
                                                    {new Intl.NumberFormat("pt-BR", {
                                                        style: "currency",
                                                        currency: "BRL",
                                                    }).format(Number(read.preco_unitario ?? 0))}
                                                </TableCell>
                                                <TableCell className="text-left">
                                                    {formatDateTime(read.created_at)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <button
                                                        type="button"
                                                        className="text-xs text-red-600 hover:text-red-800"
                                                        onClick={() => {
                                                            if (!read.id) return
                                                            if (!window.confirm("Remover leitura?")) return
                                                            deleteMutation.mutate({ id: read.id })
                                                        }}
                                                        disabled={!read.id || deleteMutation.isPending}
                                                    >
                                                        Excluir
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="flex flex-col overflow-hidden rounded">
                    <div className="flex-1 overflow-y-auto">
                        <Table className="uppercase overflow-visible rounded">
                            <TableHeader>
                                <TableRow className="sticky top-0 bg-neutral-200">
                                    <TableHead className="text-left">cod.</TableHead>
                                    {/* <TableHead className="text-left">cod. barras</TableHead> */}
                                    <TableHead className="text-left">nome</TableHead>
                                    <TableHead className="text-center">qtd.</TableHead>
                                    <TableHead className="text-right">ultima leitura</TableHead>
                                    <TableHead className="text-right">remover</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {isPending ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center">
                                            Carregando
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center">
                                            Nenhuma leitura ainda
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item) => {
                                        const produto = item.produto
                                        const codigoProduto = String(produto?.codigo ?? "")
                                        const codigoBarras = String(produto?.codigo_barras ?? "")
                                        const rowKey = `${item.id_inventario}-${item.id_produto}`
                                        const highlight =
                                            highlightId && highlightId === item.id_produto
                                        const qtdConferida = Number(
                                            item.qtd_conferida ?? item.quantidade ?? 0
                                        )
                                        const draftQuantidade =
                                            removeQuantities[item.id_produto] ?? "1"
                                        return (
                                            <TableRow
                                                key={rowKey}
                                                className={`hover:bg-neutral-400/20 duration-200 ${highlight ? "bg-orange-200/50" : ""
                                                    }`}
                                            >
                                                <TableCell className="text-left">{codigoProduto}</TableCell>
                                                {/* <TableCell className="text-left">{codigoBarras}</TableCell> */}
                                                <TableCell className="text-left">
                                                    {produto?.nome ?? "-"}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {qtdConferida}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatDateTime(item.last_read)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <input
                                                            className="w-14 bg-neutral-200 rounded px-2 py-1 text-center text-sm"
                                                            type="number"
                                                            min={1}
                                                            max={qtdConferida}
                                                            value={draftQuantidade}
                                                            onChange={(event) => {
                                                                setRemoveQuantities((prev) => ({
                                                                    ...prev,
                                                                    [item.id_produto]: event.target.value,
                                                                }))
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="text-xs text-red-600 hover:text-red-800"
                                                            onClick={() => {
                                                                const quantidade = Math.max(
                                                                    1,
                                                                    Math.floor(
                                                                        Number(
                                                                            removeQuantities[item.id_produto] ?? 1
                                                                        )
                                                                    )
                                                                )
                                                                if (quantidade > qtdConferida) {
                                                                    window.alert("Quantidade invalida")
                                                                    return
                                                                }
                                                                const confirmText =
                                                                    quantidade >= qtdConferida
                                                                        ? "Remover todas as leituras?"
                                                                        : `Remover ${quantidade} leitura(s)?`
                                                                if (!window.confirm(confirmText)) return
                                                                deleteMutation.mutate({
                                                                    id: item.id_produto,
                                                                    inventoryId: item.id_inventario,
                                                                    quantidade,
                                                                })
                                                            }}
                                                            disabled={deleteMutation.isPending}
                                                        >
                                                            Remover
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
                                    <TableCell className="text-left">
                                        {data?.inventario?.nome ?? "Inventario aberto"}
                                    </TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-center">{totalQuantidade}</TableCell>
                                    <TableCell className="text-right"></TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </div>

            </div>
            <div>
                {error ? (
                    <div className="flex flex-row items-center gap-2 text-red-600">
                        Falha ao carregar leituras
                    </div>
                ) : isFetching ? (
                    <div className="flex flex-row items-center gap-2">
                        Carregando
                    </div>
                ) : (
                    <div className="flex flex-row items-center gap-2">
                        {items.length} itens lidos
                    </div>
                )}
            </div>
        </>
    )
}

export default InventoryScan
