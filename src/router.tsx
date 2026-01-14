import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import ProductList from "./pages/ProductList"
import InventoryScan from "./pages/InventoryScan"

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

const routeTree = rootRoute.addChildren([productRoute, scanRoute])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router
    }
}
