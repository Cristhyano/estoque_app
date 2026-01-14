import { useState } from "react"
import type { ChangeEvent } from "react"
import Divider from "../components/Divider"
import Input from "../components/Input"
import { TablePagination } from "../components/Table"
import InventoryTable from "../templates/InventoryTable"
import { Calendar, PackageSearch, Tag } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import * as Dialog from "@radix-ui/react-dialog"

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

const InventoryList = () => {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const [filters, setFilters] = useState<InventoryFilters>({
        status: "",
        inicio: "",
        fim: "",
        produto: "",
        sort_by: "inicio",
        sort_dir: "desc",
        page: "1",
        limit: "20",
    })
    const [isImporting, setIsImporting] = useState(false)
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importStatus, setImportStatus] = useState<string | null>(null)
    const [importResult, setImportResult] = useState<{
        total_produtos: number
        total_leituras: number
        errors?: Array<{ linha?: number; codigo?: string; erro: string }>
        inventario?: { id: string }
    } | null>(null)
    const [importInputKey, setImportInputKey] = useState(0)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isMergeOpen, setIsMergeOpen] = useState(false)
    const [mergeFromId, setMergeFromId] = useState("")
    const [mergeToId, setMergeToId] = useState("")
    const [mergeStatus, setMergeStatus] = useState<string | null>(null)
    const [isMerging, setIsMerging] = useState(false)
    const [selectedImportInventoryId, setSelectedImportInventoryId] = useState("")
    const [paginationMeta, setPaginationMeta] = useState({ totalPages: 0, totalItems: 0 })

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

    const handleFilterChange = (key: keyof InventoryFilters) =>
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
            const maxPage = paginationMeta.totalPages > 0 ? paginationMeta.totalPages : undefined
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

    const handleImport = async () => {
        if (isImporting || !importFile) return
        setIsImporting(true)
        setImportStatus(null)
        setImportResult(null)
        try {
            const formData = new FormData()
            formData.append("file", importFile)
            if (selectedImportInventoryId) {
                formData.append("inventario_id", selectedImportInventoryId)
            }
            const response = await fetch("http://localhost:3001/inventarios/import", {
                method: "POST",
                body: formData,
            })
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}))
                const errorMessage = errorBody?.error || "Falha ao importar"
                throw new Error(errorMessage)
            }
            const result = await response.json()
            await queryClient.invalidateQueries({ queryKey: ["inventarios"] })
            setImportFile(null)
            setImportInputKey((prev) => prev + 1)
            setImportStatus("Importacao concluida")
            setImportResult(result)
            if (result?.inventario?.id) {
                navigate({ to: "/inventarios/$id", params: { id: result.inventario.id } })
            }
        } catch (error) {
            console.error(error)
            setImportStatus(error instanceof Error ? error.message : "Erro na importacao")
        } finally {
            setIsImporting(false)
        }
    }

    const handleDialogOpenChange = (open: boolean) => {
        if (isImporting) return
        setIsDialogOpen(open)
        if (!open) {
            setImportStatus(null)
            setImportFile(null)
            setImportResult(null)
            setImportInputKey((prev) => prev + 1)
            setSelectedImportInventoryId("")
        }
    }

    const handleMerge = async () => {
        if (isMerging || !mergeFromId || !mergeToId) return
        if (mergeFromId === mergeToId) {
            setMergeStatus("Inventarios iguais")
            return
        }
        setIsMerging(true)
        setMergeStatus(null)
        try {
            const response = await fetch("http://localhost:3001/inventarios/merge", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fromInventarioId: mergeFromId,
                    toInventarioId: mergeToId,
                }),
            })
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}))
                const errorMessage = errorBody?.error || "Falha ao mesclar"
                throw new Error(errorMessage)
            }
            await queryClient.invalidateQueries({ queryKey: ["inventarios"] })
            setMergeStatus("Mesclagem concluida")
            setMergeFromId("")
            setMergeToId("")
        } catch (error) {
            console.error(error)
            setMergeStatus(error instanceof Error ? error.message : "Erro na mesclagem")
        } finally {
            setIsMerging(false)
        }
    }

    return (
        <>
            <header className="flex flex-row justify-between">
                <h1 className="text-2xl font-semibold">Inventarios</h1>
                <div className="flex items-center gap-2">
                    <Dialog.Root open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                        <Dialog.Trigger asChild>
                            <button
                                type="button"
                                className="bg-neutral-800 px-2 rounded text-white flex flex-row items-center gap-2 cursor-pointer"
                            >
                                Importar inventario
                            </button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 bg-black/40" />
                            <Dialog.Content
                                className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded bg-white p-4 shadow-lg"
                                onInteractOutside={(event) => {
                                    if (isImporting) event.preventDefault()
                                }}
                                onEscapeKeyDown={(event) => {
                                    if (isImporting) event.preventDefault()
                                }}
                            >
                                <Dialog.Title className="text-lg font-semibold">Importar inventario</Dialog.Title>
                                <Dialog.Description className="text-sm text-neutral-600">
                                    Selecione o arquivo XLSX exportado pelo sistema.
                                </Dialog.Description>
                                <div className="mt-4 flex flex-col gap-3">
                                    <label className="flex flex-col gap-1 text-sm font-medium">
                                        Arquivo
                                        <input
                                            key={importInputKey}
                                            className="bg-neutral-200 px-2 py-1 rounded"
                                            type="file"
                                            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                            onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm font-medium">
                                        Inventario destino (opcional)
                                        <select
                                            className="bg-neutral-200 px-2 py-1 rounded"
                                            value={selectedImportInventoryId}
                                            onChange={(event) => setSelectedImportInventoryId(event.target.value)}
                                        >
                                            <option value="">Criar novo inventario</option>
                                            {(openInventories ?? []).map((inventario) => (
                                                <option key={inventario.id} value={inventario.id}>
                                                    {inventario.nome ?? "Inventario sem nome"} - {inventario.id}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    {importStatus && (
                                        <span className="text-sm text-neutral-700">{importStatus}</span>
                                    )}
                                    {importResult && (
                                        <div className="text-sm text-neutral-700">
                                            Produtos: {importResult.total_produtos}, Leituras: {importResult.total_leituras}
                                        </div>
                                    )}
                                    {importResult?.errors && importResult.errors.length > 0 && (
                                        <div className="text-xs text-red-600">
                                            {importResult.errors.slice(0, 3).map((item, index) => (
                                                <div key={`${item.codigo ?? "linha"}-${index}`}>
                                                    {item.linha ? `Linha ${item.linha}: ` : ""}{item.codigo ?? ""} {item.erro}
                                                </div>
                                            ))}
                                            {importResult.errors.length > 3 && (
                                                <div>+{importResult.errors.length - 3} erros</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <Dialog.Close asChild>
                                        <button
                                            type="button"
                                            className="bg-neutral-200 px-3 py-1 rounded"
                                            disabled={isImporting}
                                        >
                                            Cancelar
                                        </button>
                                    </Dialog.Close>
                                    <button
                                        type="button"
                                        className="bg-neutral-800 px-3 py-1 rounded text-white"
                                        onClick={handleImport}
                                        disabled={isImporting || !importFile}
                                        aria-busy={isImporting}
                                    >
                                        {isImporting ? "Importando" : "Confirmar"}
                                    </button>
                                </div>
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>

                    <Dialog.Root open={isMergeOpen} onOpenChange={setIsMergeOpen}>
                        <Dialog.Trigger asChild>
                            <button
                                type="button"
                                className="bg-neutral-200 px-2 rounded text-neutral-800 flex flex-row items-center gap-2 cursor-pointer"
                            >
                                Mesclar inventarios
                            </button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 bg-black/40" />
                            <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded bg-white p-4 shadow-lg">
                                <Dialog.Title className="text-lg font-semibold">Mesclar inventarios</Dialog.Title>
                                <Dialog.Description className="text-sm text-neutral-600">
                                    Mova leituras de um inventario aberto para outro.
                                </Dialog.Description>
                                <div className="mt-4 flex flex-col gap-3">
                                    <label className="flex flex-col gap-1 text-sm font-medium">
                                        Origem
                                        <select
                                            className="bg-neutral-200 px-2 py-1 rounded"
                                            value={mergeFromId}
                                            onChange={(event) => setMergeFromId(event.target.value)}
                                        >
                                            <option value="">Selecione</option>
                                            {(openInventories ?? []).map((inventario) => (
                                                <option key={inventario.id} value={inventario.id}>
                                                    {inventario.nome ?? "Inventario sem nome"} - {inventario.id}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="flex flex-col gap-1 text-sm font-medium">
                                        Destino
                                        <select
                                            className="bg-neutral-200 px-2 py-1 rounded"
                                            value={mergeToId}
                                            onChange={(event) => setMergeToId(event.target.value)}
                                        >
                                            <option value="">Selecione</option>
                                            {(openInventories ?? []).map((inventario) => (
                                                <option key={inventario.id} value={inventario.id}>
                                                    {inventario.nome ?? "Inventario sem nome"} - {inventario.id}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    {mergeStatus && (
                                        <span className="text-sm text-neutral-700">{mergeStatus}</span>
                                    )}
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <Dialog.Close asChild>
                                        <button
                                            type="button"
                                            className="bg-neutral-200 px-3 py-1 rounded"
                                            disabled={isMerging}
                                        >
                                            Cancelar
                                        </button>
                                    </Dialog.Close>
                                    <button
                                        type="button"
                                        className="bg-neutral-800 px-3 py-1 rounded text-white"
                                        onClick={() => {
                                            if (!window.confirm("Mesclar inventarios?")) return
                                            handleMerge()
                                        }}
                                        disabled={isMerging || !mergeFromId || !mergeToId}
                                        aria-busy={isMerging}
                                    >
                                        {isMerging ? "Mesclando" : "Confirmar"}
                                    </button>
                                </div>
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>
                </div>
            </header>

            <Divider />

            <form className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <Input
                    id="status"
                    label="Status"
                    icon={Tag}
                    placeholder="aberto"
                    type="text"
                    value={filters.status}
                    onChange={handleFilterChange("status")}
                />
                <Input
                    id="inicio"
                    label="Data inicial"
                    icon={Calendar}
                    type="date"
                    value={filters.inicio}
                    onChange={handleFilterChange("inicio")}
                />
                <Input
                    id="fim"
                    label="Data final"
                    icon={Calendar}
                    type="date"
                    value={filters.fim}
                    onChange={handleFilterChange("fim")}
                />
                <Input
                    id="produto"
                    label="Codigo ou nome do produto"
                    icon={PackageSearch}
                    placeholder="PRODUTO"
                    type="text"
                    value={filters.produto}
                    onChange={handleFilterChange("produto")}
                />
            </form>

            <InventoryTable
                filters={filters}
                onSortChange={(next) =>
                    setFilters((prev) => ({
                        ...prev,
                        sort_by: next.sort_by,
                        sort_dir: next.sort_dir,
                    }))
                }
                onMetaChange={setPaginationMeta}
            />

            <TablePagination
                page={filters.page}
                limit={filters.limit}
                maxPage={paginationMeta.totalPages > 0 ? paginationMeta.totalPages : undefined}
                onPageChange={handlePageValueChange}
                onLimitChange={handleLimitValueChange}
                onDelta={changePage}
            />
        </>
    )
}

export default InventoryList
