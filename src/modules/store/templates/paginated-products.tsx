"use client"

import { useProducts } from "@lib/hooks/use-products"
import ProductPreview from "@modules/products/components/product-preview"

export default function PaginatedProducts() {
  const { products, isLoading, error } = useProducts() as { products: any[]; isLoading: boolean; error: string | null }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-ui-fg-muted">Ürünler yükleniyor...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-ui-fg-error">Hata: {error}</div>
      </div>
    )
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-ui-fg-muted">Ürün bulunamadı</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center w-full">
      <ul className="grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8" data-testid="products-list">
        {products.map((product) => (
          <li key={product.id}>
            <ProductPreview 
              product={product} 
              region={undefined as any}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
