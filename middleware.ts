import NextAuth from 'next-auth'
import createMiddleware from 'next-intl/middleware'
import { authConfig } from './auth.config'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const pathname = nextUrl.pathname
  const isLoggedIn = !!req.auth

  if (pathname.startsWith('/api/auth')) return undefined

  const localeMatch = pathname.match(/^\/(en|pt-BR)/)
  const locale = localeMatch ? localeMatch[1] : 'en'
  const pathWithoutLocale = localeMatch
    ? pathname.slice(localeMatch[0].length) || '/'
    : pathname

  const isAuthRoute = ['/login', '/register'].includes(pathWithoutLocale)

  if (isAuthRoute) {
    if (isLoggedIn) return Response.redirect(new URL(`/${locale}`, nextUrl))
    return intlMiddleware(req)
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL(`/${locale}/login`, nextUrl))
  }

  return intlMiddleware(req)
})

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.ico$).*)',
  ],
}
