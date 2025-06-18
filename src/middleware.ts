import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"

// Safe URL validation and fallback
function getValidBackendUrl(): string | null {
  const url = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  
  if (!url) {
    return null
  }
  
  // Clean the URL - remove any extra characters like "echo," or quotes
  const cleanUrl = url.replace(/^(echo,|"|')+|["']+$/g, '').trim()
  
  // Validate URL format
  try {
    new URL(cleanUrl)
    return cleanUrl
  } catch (error) {
    console.error('Invalid BACKEND_URL format:', cleanUrl, error)
    return null
  }
}

const BACKEND_URL = getValidBackendUrl()
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "us"

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
}

async function getRegionMap(cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache

  if (!BACKEND_URL) {
    console.warn("BACKEND_URL not found, using default region mapping")
    // Fallback region mapping
    const defaultRegionMap = new Map<string, HttpTypes.StoreRegion>()
    defaultRegionMap.set("us", { id: "us", name: "United States", currency_code: "usd" } as HttpTypes.StoreRegion)
    defaultRegionMap.set("tr", { id: "tr", name: "Turkey", currency_code: "try" } as HttpTypes.StoreRegion)
    return defaultRegionMap
  }

  if (
    false && // Region fetch'i tamamen kapat
    (!regionMap.keys().next().value ||
    regionMapUpdated < Date.now() - 3600 * 1000)
  ) {
    try {
      // Fetch regions from Medusa. We can't use the JS client here because middleware is running on Edge and the client needs a Node environment.
      const response = await fetch(`${BACKEND_URL}/store/regions`, {
        headers: {
          "x-publishable-api-key": PUBLISHABLE_API_KEY!,
        },
        next: {
          revalidate: 3600,
          tags: [`regions-${cacheId}`],
        },
        cache: "force-cache",
      })

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`)
      }

      const { regions } = await response.json()

      if (!regions?.length) {
        throw new Error("No regions found from backend")
      }

      // Create a map of country codes to regions.
      regions.forEach((region: HttpTypes.StoreRegion) => {
        region.countries?.forEach((c) => {
          regionMapCache.regionMap.set(c.iso_2 ?? "", region)
        })
      })

      regionMapCache.regionMapUpdated = Date.now()
    } catch (error) {
      console.warn("Failed to fetch regions from backend:", error)
      // Fallback region mapping
      const defaultRegionMap = new Map<string, HttpTypes.StoreRegion>()
      defaultRegionMap.set("us", { id: "us", name: "United States", currency_code: "usd" } as HttpTypes.StoreRegion)
      defaultRegionMap.set("tr", { id: "tr", name: "Turkey", currency_code: "try" } as HttpTypes.StoreRegion)
      return defaultRegionMap
    }
  }

  return regionMapCache.regionMap
}

/**
 * Fetches regions from Medusa and sets the region cookie.
 * @param request
 * @param response
 */
async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
) {
  try {
    let countryCode

    const vercelCountryCode = request.headers
      .get("x-vercel-ip-country")
      ?.toLowerCase()

    const urlCountryCode = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

    if (urlCountryCode && regionMap.has(urlCountryCode)) {
      countryCode = urlCountryCode
    } else if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
      countryCode = vercelCountryCode
    } else if (regionMap.has(DEFAULT_REGION)) {
      countryCode = DEFAULT_REGION
    } else if (regionMap.keys().next().value) {
      countryCode = regionMap.keys().next().value
    }

    return countryCode
  } catch (error) {
    console.warn("Error getting country code:", error)
    return DEFAULT_REGION // Always return a fallback
  }
}

/**
 * Middleware to handle region selection and onboarding status.
 */
export async function middleware(request: NextRequest) {
  try {
    let redirectUrl = request.nextUrl.href

    let response = NextResponse.redirect(redirectUrl, 307)

    let cacheIdCookie = request.cookies.get("_medusa_cache_id")

    let cacheId = cacheIdCookie?.value || crypto.randomUUID()

    const regionMap = await getRegionMap(cacheId)

    const countryCode = regionMap && (await getCountryCode(request, regionMap))

    const urlHasCountryCode =
      countryCode && request.nextUrl.pathname.split("/")[1].includes(countryCode)

    // if one of the country codes is in the url and the cache id is set, return next
    if (urlHasCountryCode && cacheIdCookie) {
      return NextResponse.next()
    }

    // if one of the country codes is in the url and the cache id is not set, set the cache id and redirect
    if (urlHasCountryCode && !cacheIdCookie) {
      response.cookies.set("_medusa_cache_id", cacheId, {
        maxAge: 60 * 60 * 24,
      })

      return response
    }

    // check if the url is a static asset
    if (request.nextUrl.pathname.includes(".")) {
      return NextResponse.next()
    }

    const redirectPath =
      request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname

    const queryString = request.nextUrl.search ? request.nextUrl.search : ""

    // If no country code is set, we redirect to the relevant region.
    if (!urlHasCountryCode && countryCode) {
      // Sonsuz döngüyü önlemek için cache_id set et
      if (!cacheIdCookie) {
        response.cookies.set("_medusa_cache_id", cacheId, {
          maxAge: 60 * 60 * 24,
        })
      }
      
      redirectUrl = `${request.nextUrl.origin}/${countryCode}${redirectPath}${queryString}`
      response = NextResponse.redirect(`${redirectUrl}`, 307)
    }

    // Cache ID'yi her durumda set et
    if (!cacheIdCookie) {
      response.cookies.set("_medusa_cache_id", cacheId, {
        maxAge: 60 * 60 * 24,
      })
    }

    return response
  } catch (error) {
    console.error("Middleware error:", error)
    // If middleware fails completely, just pass through
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
