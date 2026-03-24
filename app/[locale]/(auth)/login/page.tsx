"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { Link } from "@/i18n/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function LoginPage() {
  const t = useTranslations('auth.login')
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error(t('invalidCredentials'))
      } else {
        toast.success(t('success'))
        router.push("/")
        router.refresh()
      }
    } catch (error) {
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 px-4">
      <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900 text-zinc-100">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">{t('title')}</CardTitle>
          <CardDescription className="text-zinc-400">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:ring-zinc-700"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:ring-zinc-700"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200" type="submit" disabled={loading}>
              {loading ? t('loading') : t('submit')}
            </Button>
            <div className="text-sm text-center text-zinc-400">
              {t('noAccount')}{" "}
              <Link href="/register" className="text-zinc-100 hover:underline">
                {t('register')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
