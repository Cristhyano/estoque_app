import { useState } from "react"
import type { ChangeEvent } from "react"
import Divider from "../components/Divider"
import Input from "../components/Input"
import ProductTable from "../templates/ProductTable"
import { ArrowDown, ArrowUp, BanknoteArrowDown, BanknoteArrowUp, Barcode, ChevronLeft, ChevronRight, Text, Upload } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import * as Dialog from "@radix-ui/react-dialog"

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

const ProductList = () => {
    const queryClient = useQueryClient()
    const [filters, setFilters] = useState<ProductFilters>({
        codigo: "",
        nome: "",
        quantidade_min: "",
        quantidade_max: "",
        preco_decimal_min: "",
        preco_decimal_max: "",
        page: "1",
        limit: "20",
    })
    const [isImporting, setIsImporting] = useState(false)
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importStatus, setImportStatus] = useState<string | null>(null)
    const [importResult, setImportResult] = useState<{ created: number, updated: number, skipped: number } | null>(null)
    const [importInputKey, setImportInputKey] = useState(0)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleFilterChange = (key: keyof ProductFilters) =>
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

    const handleImport = async () => {
        if (isImporting || !importFile) return
        setIsImporting(true)
        setImportStatus(null)
        setImportResult(null)
        try {
            const formData = new FormData()
            formData.append("file", importFile)
            const response = await fetch("http://localhost:3001/import", {
                method: "POST",
                body: formData,
            })
            if (!response.ok) {
                throw new Error("Falha ao importar")
            }
            const result = await response.json()
            await queryClient.invalidateQueries({ queryKey: ["products"] })
            setImportFile(null)
            setImportInputKey((prev) => prev + 1)
            setImportStatus("Importacao concluida")
            setImportResult(result)
        } catch (error) {
            console.error(error)
            setImportStatus("Erro na importacao")
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
        }
    }

    return (
        <main className="flex flex-col gap-4 h-screen p-4 bg-neutral-100 overflow-hidden">
            <header className="flex flex-row justify-between">
                <h1 className="text-2xl font-semibold">Estoque atual</h1>
                <div className="flex flex-row gap-4">
                    <Link
                        to="/scan"
                        className="bg-neutral-800 px-2 rounded text-white flex flex-row items-center gap-2 cursor-pointer"
                    >
                        Inventario
                    </Link>
                    <Dialog.Root open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                        <Dialog.Trigger asChild>
                            <button
                                type="button"
                                className="bg-orange-600 px-2 rounded text-white flex flex-row items-center gap-2 cursor-pointer"
                            >
                                <Upload />
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
                                <Dialog.Title className="text-lg font-semibold">Importacao</Dialog.Title>
                                <Dialog.Description className="text-sm text-neutral-600">
                                    Selecione o arquivo de produtos (PDF) ou inventario (CSV).
                                </Dialog.Description>
                                <div className="mt-4 flex flex-col gap-3">
                                    <label className="flex flex-col gap-1 text-sm font-medium">
                                        Arquivo
                                        <input
                                            key={importInputKey}
                                            className="bg-neutral-200 px-2 py-1 rounded"
                                            type="file"
                                            accept=".pdf,.csv,application/pdf,text/csv"
                                            onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                                        />
                                    </label>
                                    {importStatus && (
                                        <span className="text-sm text-neutral-700">{importStatus}</span>
                                    )}
                                    {importResult && (
                                        <div className="text-sm text-neutral-700">
                                            Criados: {importResult.created}, Atualizados: {importResult.updated}, Ignorados: {importResult.skipped}
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
                                        className="bg-orange-600 px-3 py-1 rounded text-white"
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
                </div>
            </header>

            <Divider />

            <form className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <Input
                    id="code"
                    label="Codigo do Produto"
                    icon={Barcode}
                    placeholder="00000"
                    type="text"
                    value={filters.codigo}
                    onChange={handleFilterChange("codigo")}
                />
                <Input
                    id="name"
                    label="Nome do Produto"
                    icon={Text}
                    placeholder="PRODUTO 01"
                    type="text"
                    value={filters.nome}
                    onChange={handleFilterChange("nome")}
                />
                <Input
                    id="amount-min"
                    label="Quantidade minima"
                    icon={ArrowDown}
                    placeholder="0"
                    type="number"
                    min={0}
                    value={filters.quantidade_min}
                    onChange={handleFilterChange("quantidade_min")}
                />
                <Input
                    id="amount-max"
                    label="Quantidade maxima"
                    icon={ArrowUp}
                    placeholder="999"
                    type="number"
                    min={0}
                    value={filters.quantidade_max}
                    onChange={handleFilterChange("quantidade_max")}
                />
                <Input
                    id="price-decimal-min"
                    label="Preco minimo (decimal)"
                    icon={BanknoteArrowDown}
                    placeholder="0.00"
                    type="number"
                    min={0}
                    step="0.01"
                    value={filters.preco_decimal_min}
                    onChange={handleFilterChange("preco_decimal_min")}
                />
                <Input
                    id="price-decimal-max"
                    label="Preco maximo (decimal)"
                    icon={BanknoteArrowUp}
                    placeholder="9999.99"
                    type="number"
                    min={0}
                    step="0.01"
                    value={filters.preco_decimal_max}
                    onChange={handleFilterChange("preco_decimal_max")}
                />
            </form>

            <ProductTable filters={filters} />

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

export default ProductList
