import ProductList from "./pages/ProductList"

import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query"

const queryClient = new QueryClient()

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ProductList />
        </QueryClientProvider>
    )
}

export default App
