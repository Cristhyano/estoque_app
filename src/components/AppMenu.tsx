import { Link, useRouterState } from "@tanstack/react-router"

type MenuItem = {
    label: string
    to: string
}

const menuItems: MenuItem[] = [
    { label: "Home", to: "/" },
    { label: "Produtos", to: "/produtos" },
    { label: "Inventarios", to: "/inventarios" },
    { label: "Leitura", to: "/scan" },
    { label: "Relatorios", to: "/relatorios" },
]

const AppMenu = () => {
    const pathname = useRouterState({
        select: (state) => state.location.pathname,
    })

    return (
        <nav className="sticky top-0 z-20 bg-white border-b border-neutral-200">
            <div className="flex flex-row items-center gap-3 px-4 py-2">
                {menuItems.map((item) => {
                    const isActive =
                        item.to === "/"
                            ? pathname === "/"
                            : pathname.startsWith(item.to)
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`px-2 py-1 rounded text-sm font-medium ${
                                isActive
                                    ? "bg-neutral-800 text-white"
                                    : "text-neutral-700 hover:bg-neutral-200"
                            }`}
                        >
                            {item.label}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

export default AppMenu
