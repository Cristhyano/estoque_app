import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import ProductList from "./pages/ProductList"
import InventoryScan from "./pages/InventoryScan"
import InventoryList from "./pages/InventoryList"
import InventoryDetail from "./pages/InventoryDetail"

const rootRoute = createRootRoute({
    component: () => <Outlet />,
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
    inventoryDetailRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router
    }
}
