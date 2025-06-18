import { NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  // Basit region yönlendirmesi
  const pathname = request.nextUrl.pathname
  
  // Eğer zaten region varsa devam et
  if (pathname.startsWith('/us') || pathname.startsWith('/tr')) {
    return NextResponse.next()
  }
  
  // Ana sayfaya gidiyorsa /us'e yönlendir
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/us', request.url))
  }
  
  // Diğer tüm istekler için /us ekle
  return NextResponse.redirect(new URL(`/us${pathname}`, request.url))
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
