'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { FileCode2, Star, Copy, Database, ArrowRight, TrendingUp } from 'lucide-react'

import { AppHeader } from '@/components/app-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryCard } from '@/components/query-card'
import { useQueryStore } from '@/store/query-store'
import { DATABASE_LABELS, DATABASE_COLORS, type DatabaseType } from '@/types/query'

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: number | string
  icon: React.ElementType
  description?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32 mt-2" />
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { isLoading, listQueries, getStats, initialize, queries } = useQueryStore()
  
  useEffect(() => {
    if (queries.length === 0 && !isLoading) {
      initialize()
    }
  }, [initialize, queries.length, isLoading])

  const stats = getStats()
  const recentQueries = listQueries().slice(0, 4)
  const topCopiedQueries = [...listQueries()]
    .sort((a, b) => b.copyCount - a.copyCount)
    .slice(0, 3)

  const databaseStats = Object.entries(stats.databaseCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])

  if (isLoading) {
    return (
      <>
        <AppHeader title="Dashboard" showSearch={false} showNewButton />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AppHeader title="Dashboard" showSearch={false} showNewButton />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total de Consultas"
              value={stats.totalQueries}
              icon={FileCode2}
              description="Consultas salvas"
            />
            <StatCard
              title="Favoritas"
              value={stats.favoriteCount}
              icon={Star}
              description="Consultas marcadas"
            />
            <StatCard
              title="Total de Cópias"
              value={stats.totalCopies}
              icon={Copy}
              description="SQL copiado"
            />
            <StatCard
              title="Bancos de Dados"
              value={Object.keys(stats.databaseCounts).filter(k => stats.databaseCounts[k as DatabaseType] > 0).length}
              icon={Database}
              description="Tipos diferentes"
            />
          </div>

          {/* Database distribution */}
          {databaseStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Banco de Dados</CardTitle>
                <CardDescription>
                  Quantidade de consultas por tipo de banco
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {databaseStats.map(([db, count]) => {
                    const percentage = Math.round((count / stats.totalQueries) * 100)
                    const color = DATABASE_COLORS[db as DatabaseType]
                    return (
                      <div key={db} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {DATABASE_LABELS[db as DatabaseType]}
                          </span>
                          <span className="text-muted-foreground">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent queries */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Consultas Recentes</CardTitle>
                  <CardDescription>
                    Últimas consultas atualizadas
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/consultas">
                    Ver todas
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentQueries.length > 0 ? (
                  <div className="space-y-3">
                    {recentQueries.map((query) => (
                      <Link
                        key={query.id}
                        href={`/consultas/${query.id}`}
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: DATABASE_COLORS[query.database],
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{query.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {DATABASE_LABELS[query.database]}
                          </p>
                        </div>
                        {query.isFavorite && (
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Nenhuma consulta ainda
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Top copied */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Mais Copiadas</CardTitle>
                  <CardDescription>
                    Consultas mais utilizadas
                  </CardDescription>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {topCopiedQueries.length > 0 ? (
                  <div className="space-y-3">
                    {topCopiedQueries.map((query, index) => (
                      <Link
                        key={query.id}
                        href={`/consultas/${query.id}`}
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{query.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {query.copyCount} cópias
                          </p>
                        </div>
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Nenhuma consulta copiada ainda
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  )
}
