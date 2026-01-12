import { useState } from "react"
import type { ChangeEvent } from "react"
import Divider from "../components/Divider"
import Input from "../components/Input"
import ProductTable from "../templates/ProductTable"

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
        <main className="flex flex-col gap-4 min-h-screen p-4 bg-neutral-100">
            <header className="flex flex-row justify-between">
                <h1 className="text-2xl font-semibold">Estoque atual</h1>
                <button
                    type="button"
                    className="bg-green-600 px-2 rounded text-white"
                >
                    Importar produto
                </button>
            </header>

            <Divider />

            <form className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <Input
                    id="code"
                    label="Codigo do Produto"
                    placeholder="00000"
                    type="text"
                    value={filters.codigo}
                    onChange={handleFilterChange("codigo")}
                />
                <Input
                    id="name"
                    label="Nome do Produto"
                    placeholder="PRODUTO 01"
                    type="text"
                    value={filters.nome}
                    onChange={handleFilterChange("nome")}
                />
                <Input
                    id="amount-min"
                    label="Quantidade minima"
                    placeholder="0"
                    type="number"
                    min={0}
                    value={filters.quantidade_min}
                    onChange={handleFilterChange("quantidade_min")}
                />
                <Input
                    id="amount-max"
                    label="Quantidade maxima"
                    placeholder="999"
                    type="number"
                    min={0}
                    value={filters.quantidade_max}
                    onChange={handleFilterChange("quantidade_max")}
                />
                <Input
                    id="price-decimal-min"
                    label="Preco minimo (decimal)"
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
                    placeholder="9999.99"
                    type="number"
                    min={0}
                    step="0.01"
                    value={filters.preco_decimal_max}
                    onChange={handleFilterChange("preco_decimal_max")}
                />
            </form>

            <Divider />

            <div className="flex flex-row justify-end gap-2">
                <button
                    type="button"
                    className="bg-neutral-800 p-1 rounded text-white"
                    onClick={() => changePage(-1)}
                >
                    ◀
                </button>
                <input
                    id="page"
                    placeholder="1"
                    type="number"
                    min={1}
                    className="w-12 bg-neutral-200 rounded text-center"
                    value={filters.page}
                    onChange={handleFilterChange("page")}
                />
                <input
                    id="limit"
                    placeholder="20"
                    type="number"
                    min={1}
                    className="w-12 bg-neutral-200 rounded text-center"
                    value={filters.limit}
                    onChange={handleFilterChange("limit")}
                />
                <button
                    type="button"
                    className="bg-neutral-800 p-1 rounded text-white"
                    onClick={() => changePage(1)}
                >
                    ▶
                </button>
            </div>

            <ProductTable filters={filters} />
        </main>
    )
}

export default ProductList
