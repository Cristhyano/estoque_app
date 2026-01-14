import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import AppMenu from "./components/AppMenu"
import Home from "./pages/Home"
import ProductList from "./pages/ProductList"
import InventoryScan from "./pages/InventoryScan"
import InventoryList from "./pages/InventoryList"
import InventoryDetail from "./pages/InventoryDetail"
import Reports from "./pages/Reports"

const rootRoute = createRootRoute({
    component: () => (
        <div className="min-h-screen bg-neutral-100">
            <AppMenu />
            <Outlet />
        </div>
    ),
})

const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: Home,
})

const productRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/produtos",
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

const reportsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/relatorios",
    component: Reports,
})

const routeTree = rootRoute.addChildren([
    homeRoute,
    productRoute,
    scanRoute,
    inventoryRoute,
    inventoryDetailRoute,
    reportsRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router
    }
}
