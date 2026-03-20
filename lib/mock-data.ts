import type { Query, Tag, DatabaseType } from '@/types/query'

export const MOCK_TAGS: Tag[] = [
  { id: 'tag-1', name: 'Relatórios', color: '#3B82F6', createdAt: '2024-01-15T10:00:00Z' },
  { id: 'tag-2', name: 'Performance', color: '#10B981', createdAt: '2024-01-16T11:00:00Z' },
  { id: 'tag-3', name: 'Backup', color: '#F59E0B', createdAt: '2024-01-17T12:00:00Z' },
  { id: 'tag-4', name: 'Manutenção', color: '#EF4444', createdAt: '2024-01-18T13:00:00Z' },
  { id: 'tag-5', name: 'Analytics', color: '#8B5CF6', createdAt: '2024-01-19T14:00:00Z' },
  { id: 'tag-6', name: 'Segurança', color: '#EC4899', createdAt: '2024-01-20T15:00:00Z' },
]

const createQuery = (
  id: string,
  title: string,
  description: string,
  sql: string,
  database: DatabaseType,
  tags: string[],
  isFavorite: boolean,
  copyCount: number,
  createdAt: string,
  deletedAt?: string
): Query => ({
  id,
  title,
  description,
  sql,
  database,
  tags,
  versions: [
    {
      id: `${id}-v1`,
      sql,
      description: 'Versão inicial',
      createdAt,
    },
  ],
  isFavorite,
  copyCount,
  createdAt,
  updatedAt: createdAt,
  deletedAt,
})

export const MOCK_QUERIES: Query[] = [
  // PostgreSQL queries (3)
  createQuery(
    'query-1',
    'Usuários Ativos por Mês',
    'Consulta para obter o número de usuários ativos agrupados por mês',
    `SELECT 
  DATE_TRUNC('month', last_login) AS mes,
  COUNT(DISTINCT user_id) AS usuarios_ativos
FROM users
WHERE last_login >= NOW() - INTERVAL '12 months'
  AND status = 'active'
GROUP BY DATE_TRUNC('month', last_login)
ORDER BY mes DESC;`,
    'postgresql',
    ['tag-1', 'tag-5'],
    true,
    45,
    '2024-02-10T09:00:00Z'
  ),
  createQuery(
    'query-2',
    'Índices Não Utilizados',
    'Identifica índices que não estão sendo utilizados e podem ser removidos',
    `SELECT 
  schemaname || '.' || relname AS tabela,
  indexrelname AS indice,
  pg_size_pretty(pg_relation_size(i.indexrelid)) AS tamanho,
  idx_scan AS leituras
FROM pg_stat_user_indexes ui
JOIN pg_index i ON ui.indexrelid = i.indexrelid
WHERE NOT indisunique
  AND idx_scan < 50
ORDER BY pg_relation_size(i.indexrelid) DESC;`,
    'postgresql',
    ['tag-2', 'tag-4'],
    false,
    23,
    '2024-02-15T14:30:00Z'
  ),
  createQuery(
    'query-3',
    'Bloqueios Ativos',
    'Mostra todas as transações bloqueadas e quem está bloqueando',
    `SELECT 
  blocked_locks.pid AS pid_bloqueado,
  blocked_activity.usename AS usuario_bloqueado,
  blocking_locks.pid AS pid_bloqueador,
  blocking_activity.usename AS usuario_bloqueador,
  blocked_activity.query AS query_bloqueada
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity 
  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
JOIN pg_catalog.pg_stat_activity blocking_activity 
  ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;`,
    'postgresql',
    ['tag-2', 'tag-6'],
    true,
    67,
    '2024-03-01T08:15:00Z'
  ),
  
  // MySQL queries (3)
  createQuery(
    'query-4',
    'Vendas por Categoria',
    'Relatório de vendas totais agrupadas por categoria de produto',
    `SELECT 
  c.category_name AS categoria,
  COUNT(o.order_id) AS total_pedidos,
  SUM(oi.quantity * oi.unit_price) AS valor_total,
  AVG(oi.quantity * oi.unit_price) AS ticket_medio
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
INNER JOIN categories c ON p.category_id = c.category_id
WHERE o.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY c.category_id, c.category_name
ORDER BY valor_total DESC;`,
    'mysql',
    ['tag-1', 'tag-5'],
    true,
    89,
    '2024-02-20T11:00:00Z'
  ),
  createQuery(
    'query-5',
    'Queries Lentas',
    'Lista as queries mais lentas do último dia',
    `SELECT 
  DIGEST_TEXT AS query_template,
  COUNT_STAR AS execucoes,
  ROUND(AVG_TIMER_WAIT/1000000000000, 2) AS tempo_medio_seg,
  ROUND(SUM_TIMER_WAIT/1000000000000, 2) AS tempo_total_seg,
  FIRST_SEEN,
  LAST_SEEN
FROM performance_schema.events_statements_summary_by_digest
WHERE LAST_SEEN >= DATE_SUB(NOW(), INTERVAL 1 DAY)
  AND DIGEST_TEXT NOT LIKE '%performance_schema%'
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 20;`,
    'mysql',
    ['tag-2'],
    false,
    34,
    '2024-02-25T16:45:00Z'
  ),
  createQuery(
    'query-6',
    'Backup de Tabela',
    'Script para criar backup de uma tabela específica',
    `-- Criar tabela de backup
CREATE TABLE customers_backup_20240301 AS
SELECT * FROM customers;

-- Verificar contagem
SELECT 
  (SELECT COUNT(*) FROM customers) AS original,
  (SELECT COUNT(*) FROM customers_backup_20240301) AS backup;`,
    'mysql',
    ['tag-3'],
    false,
    12,
    '2024-03-05T10:30:00Z'
  ),
  
  // SQLite queries (2)
  createQuery(
    'query-7',
    'Produtos Mais Vendidos',
    'Top 10 produtos mais vendidos na loja',
    `SELECT 
  p.product_name AS produto,
  p.sku,
  SUM(oi.quantity) AS quantidade_vendida,
  SUM(oi.quantity * oi.price) AS receita_total
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY p.id, p.product_name, p.sku
ORDER BY quantidade_vendida DESC
LIMIT 10;`,
    'sqlite',
    ['tag-1', 'tag-5'],
    true,
    56,
    '2024-02-18T13:20:00Z'
  ),
  createQuery(
    'query-8',
    'Tamanho das Tabelas',
    'Mostra o tamanho aproximado de cada tabela no banco SQLite',
    `SELECT 
  name AS tabela,
  SUM(pgsize) AS tamanho_bytes,
  ROUND(SUM(pgsize) / 1024.0, 2) AS tamanho_kb
FROM dbstat
GROUP BY name
ORDER BY tamanho_bytes DESC;`,
    'sqlite',
    ['tag-4'],
    false,
    8,
    '2024-03-10T09:00:00Z'
  ),
  
  // SQL Server queries (2)
  createQuery(
    'query-9',
    'Fragmentação de Índices',
    'Analisa a fragmentação de todos os índices do banco',
    `SELECT 
  DB_NAME() AS banco,
  OBJECT_SCHEMA_NAME(ips.object_id) + '.' + OBJECT_NAME(ips.object_id) AS tabela,
  i.name AS indice,
  ips.index_type_desc AS tipo,
  ROUND(ips.avg_fragmentation_in_percent, 2) AS fragmentacao_pct,
  ips.page_count AS paginas
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.avg_fragmentation_in_percent > 10
  AND ips.page_count > 1000
ORDER BY ips.avg_fragmentation_in_percent DESC;`,
    'sqlserver',
    ['tag-2', 'tag-4'],
    true,
    41,
    '2024-02-28T15:00:00Z'
  ),
  createQuery(
    'query-10',
    'Sessões Ativas',
    'Lista todas as sessões ativas com detalhes da query em execução',
    `SELECT 
  s.session_id,
  s.login_name,
  s.host_name,
  DB_NAME(r.database_id) AS banco,
  r.status,
  r.command,
  r.wait_type,
  r.wait_time,
  SUBSTRING(t.text, (r.statement_start_offset/2)+1,
    ((CASE r.statement_end_offset
      WHEN -1 THEN DATALENGTH(t.text)
      ELSE r.statement_end_offset
    END - r.statement_start_offset)/2)+1) AS query_atual
FROM sys.dm_exec_sessions s
LEFT JOIN sys.dm_exec_requests r ON s.session_id = r.session_id
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE s.is_user_process = 1
ORDER BY r.cpu_time DESC;`,
    'sqlserver',
    ['tag-2', 'tag-6'],
    false,
    29,
    '2024-03-08T11:30:00Z'
  ),
  
  // Oracle queries (2)
  createQuery(
    'query-11',
    'Espaço em Tablespaces',
    'Verifica o espaço utilizado e disponível em cada tablespace',
    `SELECT 
  df.tablespace_name AS tablespace,
  ROUND(df.bytes / 1024 / 1024, 2) AS tamanho_mb,
  ROUND((df.bytes - NVL(fs.bytes, 0)) / 1024 / 1024, 2) AS usado_mb,
  ROUND(NVL(fs.bytes, 0) / 1024 / 1024, 2) AS livre_mb,
  ROUND(((df.bytes - NVL(fs.bytes, 0)) / df.bytes) * 100, 2) AS pct_usado
FROM (
  SELECT tablespace_name, SUM(bytes) AS bytes
  FROM dba_data_files
  GROUP BY tablespace_name
) df
LEFT JOIN (
  SELECT tablespace_name, SUM(bytes) AS bytes
  FROM dba_free_space
  GROUP BY tablespace_name
) fs ON df.tablespace_name = fs.tablespace_name
ORDER BY pct_usado DESC;`,
    'oracle',
    ['tag-4'],
    false,
    15,
    '2024-03-12T14:00:00Z'
  ),
  createQuery(
    'query-12',
    'Top SQL por CPU',
    'Identifica as queries que mais consomem CPU',
    `SELECT 
  sql_id,
  SUBSTR(sql_text, 1, 100) AS sql_preview,
  executions AS execucoes,
  ROUND(cpu_time / 1000000, 2) AS cpu_segundos,
  ROUND(elapsed_time / 1000000, 2) AS tempo_total_seg,
  buffer_gets AS leituras_buffer,
  disk_reads AS leituras_disco
FROM v$sql
WHERE cpu_time > 0
ORDER BY cpu_time DESC
FETCH FIRST 20 ROWS ONLY;`,
    'oracle',
    ['tag-2', 'tag-5'],
    true,
    38,
    '2024-03-15T09:45:00Z'
  ),
]

// Soft-deleted queries for trash
export const MOCK_TRASHED_QUERIES: Query[] = [
  createQuery(
    'query-trash-1',
    'Query Obsoleta',
    'Esta query não é mais necessária',
    'SELECT * FROM old_table;',
    'postgresql',
    ['tag-4'],
    false,
    2,
    '2024-01-10T10:00:00Z',
    '2024-03-18T15:00:00Z'
  ),
  createQuery(
    'query-trash-2',
    'Teste Removido',
    'Query de teste que foi deletada',
    'SELECT 1 + 1 AS resultado;',
    'mysql',
    [],
    false,
    0,
    '2024-02-01T12:00:00Z',
    '2024-03-19T09:30:00Z'
  ),
]
