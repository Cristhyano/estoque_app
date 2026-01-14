import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import AppMenu from "./components/AppMenu"
import ProductList from "./pages/ProductList"
import InventoryScan from "./pages/InventoryScan"
import InventoryList from "./pages/InventoryList"
import InventoryDetail from "./pages/InventoryDetail"

const rootRoute = createRootRoute({
    component: () => (
        <main className="flex flex-col gap-4 h-screen p-4 bg-neutral-100 ">
            <AppMenu />
            <Outlet />
        </main>
    ),
})

const productRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: ProductList,
})

const scanRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/scan",
    component: InventoryScan,
})

const inventoryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/inventarios",
    component: InventoryList,
})

const inventoryDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/inventarios/$id",
    component: InventoryDetail,
})

const routeTree = rootRoute.addChildren([
    productRoute,
    scanRoute,
    inventoryRoute,
    inventoryDetailRoute
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router
    }
}
