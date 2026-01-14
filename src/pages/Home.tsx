import { Link } from "@tanstack/react-router"
import Divider from "../components/Divider"

const Home = () => {
    return (
        <main className="flex flex-col gap-4 min-h-screen p-4 bg-neutral-100 overflow-hidden">
            <header>
                <h1 className="text-2xl font-semibold">Home</h1>
                <p className="text-sm text-neutral-600">
                    Acesso rapido aos principais modulos.
                </p>
            </header>

            <Divider />

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                    to="/produtos"
                    className="bg-white border border-neutral-200 rounded p-4 flex flex-col gap-2 hover:shadow-sm"
                >
                    <span className="text-lg font-semibold">Produtos</span>
                    <span className="text-sm text-neutral-600">
                        Listagem e gestao do cadastro.
                    </span>
                </Link>
                <Link
                    to="/inventarios"
                    className="bg-white border border-neutral-200 rounded p-4 flex flex-col gap-2 hover:shadow-sm"
                >
                    <span className="text-lg font-semibold">Inventarios</span>
                    <span className="text-sm text-neutral-600">
                        Acompanhe e feche inventarios.
                    </span>
                </Link>
                <Link
                    to="/scan"
                    className="bg-white border border-neutral-200 rounded p-4 flex flex-col gap-2 hover:shadow-sm"
                >
                    <span className="text-lg font-semibold">Leitura</span>
                    <span className="text-sm text-neutral-600">
                        Registro de leituras por codigo.
                    </span>
                </Link>
                <Link
                    to="/relatorios"
                    className="bg-white border border-neutral-200 rounded p-4 flex flex-col gap-2 hover:shadow-sm"
                >
                    <span className="text-lg font-semibold">Relatorios</span>
                    <span className="text-sm text-neutral-600">
                        Exportacoes e consolidacoes.
                    </span>
                </Link>
            </section>
        </main>
    )
}

export default Home
