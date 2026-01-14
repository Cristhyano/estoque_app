import ProductList from "./pages/ProductList"
import InventoryScan from "./pages/InventoryScan"

import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query"

const queryClient = new QueryClient()

function App() {
    const path =
        typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "/"
    const Screen = path.includes("scan") ? InventoryScan : ProductList
    return (
        <QueryClientProvider client={queryClient}>
            <Screen />
        </QueryClientProvider>
    )
}

export default App
