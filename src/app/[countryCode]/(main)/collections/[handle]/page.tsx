import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle, listCollections } from "@lib/data/collections"
import { listRegions } from "@lib/data/regions"
import { StoreCollection, StoreRegion } from "@medusajs/types"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<{
    page?: string
    sortBy?: SortOptions
  }>
}

export const PRODUCT_LIMIT = 12

export async function generateStaticParams() {
  try {
    const { collections } = await listCollections({
      fields: "*products",
    })

    if (!collections) {
      return []
    }

    const regions = await listRegions()
    const countryCodes = regions
      ?.map((r: StoreRegion) => r.countries?.map((c) => c.iso_2))
      .flat()
      .filter(Boolean) as string[]

    const collectionHandles = collections.map(
      (collection: StoreCollection) => collection.handle
    )

    const staticParams = countryCodes
      ?.map((countryCode: string) =>
        collectionHandles.map((handle: string | undefined) => ({
          countryCode,
          handle,
        }))
      )
      .flat()

    return staticParams || []
  } catch (error) {
    console.warn('Failed to generate static params for collections, using empty array:', error)
    return []
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    const collection = await getCollectionByHandle(params.handle)

    if (!collection) {
      return {
        title: "Collection | Medusa Store",
        description: "Browse our collections.",
      }
    }

    const metadata = {
      title: `${collection.title} | Medusa Store`,
      description: `${collection.title} collection`,
    } as Metadata

    return metadata
  } catch (error) {
    console.warn('Failed to generate metadata for collection, using fallback:', error)
    return {
      title: "Collection | Medusa Store",
      description: "Browse our collections.",
    }
  }
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams

  try {
    const collection = await getCollectionByHandle(params.handle).then(
      (collection: StoreCollection) => collection
    )

    if (!collection) {
      notFound()
    }

    return (
      <CollectionTemplate
        collection={collection}
        page={page}
        sortBy={sortBy}
        countryCode={params.countryCode}
      />
    )
  } catch (error) {
    console.warn('Failed to load collection, returning not found:', error)
    notFound()
  }
}
