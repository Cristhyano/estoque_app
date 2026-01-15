import { Link, useRouterState } from "@tanstack/react-router"

type MenuItem = {
    label: string
    to: string
}

const menuItems: MenuItem[] = [
    { label: "Produtos", to: "/" },
    { label: "Inventarios", to: "/inventarios" },
    { label: "Leitura", to: "/scan" }
]

const AppMenu = () => {
    const pathname = useRouterState({
        select: (state) => state.location.pathname,
    })

    return (
        <nav className="flex flex-row items-center gap-4">
            {menuItems.map((item) => {
                const isActive =
                    item.to === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.to)
                return (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={`px-2 py-1 rounded text-sm font-medium bg-neutral-200 ${isActive
                                ? "bg-neutral-800 text-white"
                                : "text-neutral-700 hover:bg-neutral-300"
                            }`}
                    >
                        {item.label}
                    </Link>
                )
            })}
        </nav>
    )
}

export default AppMenu
