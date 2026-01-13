import { useState } from "react"
import type { ChangeEvent } from "react"
import Divider from "../components/Divider"
import Input from "../components/Input"
import ProductTable from "../templates/ProductTable"
import { ArrowDown, ArrowUp, BanknoteArrowDown, BanknoteArrowUp, Barcode, ChevronLeft, ChevronRight, FileSpreadsheet, MoveDown, NotebookPen, NotebookTabs, Printer, Sheet, Text, Upload } from "lucide-react"

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

    return (
        <main className="flex flex-col gap-4 h-screen p-4 bg-neutral-100 overflow-hidden">
            <header className="flex flex-row justify-between">
                <h1 className="text-2xl font-semibold">Estoque atual</h1>
                <div className="flex flex-row gap-4">
                    <button
                        type="button"
                        className="bg-orange-600 px-2 rounded text-white flex flex-row items-center gap-2"
                    >
                        <Upload />
                        <span className="group-hover:w-16 group-hover:flex hidden duration-150">Importar</span>
                    </button>
                    <button
                        type="button"
                        className="bg-blue-600 px-2 rounded text-white flex flex-row items-center gap-2"
                    >
                        <FileSpreadsheet />
                    </button>
                    <button
                        type="button"
                        className="bg-green-600 px-2 rounded text-white flex flex-row items-center gap-2"
                    >
                        <NotebookPen />
                    </button>
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

