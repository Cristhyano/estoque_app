import { useState } from "react"
import type { ChangeEvent } from "react"
import Divider from "../components/Divider"
import Input from "../components/Input"
import InventoryTable from "../templates/InventoryTable"
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    PackageSearch,
    Tag,
} from "lucide-react"
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

const InventoryList = () => {
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
            const nextPage = Math.max(1, current + delta)
            return {
                ...prev,
                page: String(nextPage),
            }
        })
    }

    return (
        <main className="flex flex-col gap-4 min-h-screen p-4 bg-neutral-100 overflow-hidden">
            <header className="flex flex-row justify-between">
                <h1 className="text-2xl font-semibold">Inventarios</h1>
                <div className="flex flex-row gap-4">
                    <Link
                        to="/produtos"
                        className="bg-neutral-800 px-2 rounded text-white flex flex-row items-center gap-2 cursor-pointer"
                    >
                        Produtos
                    </Link>
                    <Link
                        to="/scan"
                        className="bg-neutral-800 px-2 rounded text-white flex flex-row items-center gap-2 cursor-pointer"
                    >
                        Leitura
                    </Link>
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
            />

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

export default InventoryList
