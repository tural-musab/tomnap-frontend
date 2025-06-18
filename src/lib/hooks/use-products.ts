import { useState, useEffect } from "react"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

export function useProducts() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch(`${BACKEND_URL}/custom/products`)
        if (!response.ok) throw new Error("Failed to fetch products")
        
        const data = await response.json()
        setProducts(data.products || [])
      } catch (err) {
        setError((err as Error).message)
        console.error("Error fetching products:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  return { products, isLoading, error }
} 