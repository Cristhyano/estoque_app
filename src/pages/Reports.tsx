import Divider from "../components/Divider"

const Reports = () => {
    return (
        <main className="flex flex-col gap-4 min-h-screen p-4 bg-neutral-100 overflow-hidden">
            <header>
                <h1 className="text-2xl font-semibold">Relatorios</h1>
                <p className="text-sm text-neutral-600">
                    Exportacoes e relatorios do inventario.
                </p>
            </header>

            <Divider />

            <section className="bg-white border border-neutral-200 rounded p-4 text-sm text-neutral-700">
                Central de relatorios em preparacao.
            </section>
        </main>
    )
}

export default Reports
