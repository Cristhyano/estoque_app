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

type ProdutoInventarioOpenResponse = {
    inventario: {
        id: string
        nome: string
        inicio: string
        fim: string | null
        status: string
    }
    items: ProdutoInventarioItem[]
    recent_reads?: ProdutoInventarioRead[]
}

type ProdutoInventarioRead = {
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
        nome: string
        inicio: string
        fim: string | null
        status: string
    }
    leitura: {
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
    const [code, setCode] = useState("")
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const [highlightId, setHighlightId] = useState<string | null>(null)

    const { data, isPending, isFetching, error } = useQuery<ProdutoInventarioOpenResponse>({
        queryKey: ["produto-inventario-open"],
        queryFn: async () => {
            const response = await fetch("http://localhost:3001/produto-inventario/aberto")
            if (!response.ok) {
                throw new Error("Falha ao carregar leituras")
            }
            return await response.json()
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
                body: JSON.stringify(payload),
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

    const closeMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch("http://localhost:3001/inventarios/aberto/fechar", {
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
        if (!mutation.isPending) {
            inputRef.current?.focus()
        }
    }, [mutation.isPending])

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
                    onBlur={() => {
                        if (!mutation.isPending) {
                            window.setTimeout(() => inputRef.current?.focus(), 0)
                        }
                    }}
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
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {recentReads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">
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
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {isPending ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">
                                            Carregando
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">
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
