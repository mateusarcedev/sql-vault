import "dotenv/config"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const DEMO_EMAIL = "demo@sqlvault.local"
const DEMO_PASSWORD = "DemoVault2026!"

if (process.env.ALLOW_DEMO_SEED !== "true") {
  console.error(
    "Demo seed blocked. Re-run with ALLOW_DEMO_SEED=true to explicitly allow fictitious demo data."
  )
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to run the demo seed.")
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function upsertTag(userId, { name, color }) {
  return prisma.tag.upsert({
    where: {
      name_userId: {
        name,
        userId,
      },
    },
    update: { color },
    create: {
      id: `demo-tag-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      color,
      userId,
    },
  })
}

async function main() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 12)

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: "SQL Vault Demo",
      password,
    },
    create: {
      id: "demo-user-sql-vault",
      name: "SQL Vault Demo",
      email: DEMO_EMAIL,
      password,
    },
  })

  const [analytics, performance, reporting, maintenance] = await Promise.all([
    upsertTag(user.id, { name: "Analytics", color: "#3B82F6" }),
    upsertTag(user.id, { name: "Performance", color: "#22C55E" }),
    upsertTag(user.id, { name: "Reporting", color: "#A855F7" }),
    upsertTag(user.id, { name: "Maintenance", color: "#F97316" }),
  ])

  const context = await prisma.databaseContext.upsert({
    where: { id: "demo-context-postgresql" },
    update: {
      name: "Demo Analytics PostgreSQL",
      description: "Fictitious schema used only to demonstrate SQL Vault database context features.",
      type: "postgresql",
      schemaFormat: "sql",
      schemaDefinition: `CREATE TABLE demo_customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  segment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE demo_orders (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES demo_customers(id),
  total NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`,
      isPublic: true,
      userId: user.id,
    },
    create: {
      id: "demo-context-postgresql",
      name: "Demo Analytics PostgreSQL",
      description: "Fictitious schema used only to demonstrate SQL Vault database context features.",
      type: "postgresql",
      schemaFormat: "sql",
      schemaDefinition: `CREATE TABLE demo_customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  segment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE demo_orders (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES demo_customers(id),
  total NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`,
      isPublic: true,
      userId: user.id,
    },
  })

  const postgresQuery = await prisma.query.upsert({
    where: { id: "demo-query-postgresql-monthly-revenue" },
    update: {
      title: "Monthly revenue by segment",
      description: "Fictitious PostgreSQL report grouped by month and customer segment.",
      sql: `SELECT
  DATE_TRUNC('month', o.created_at) AS month,
  c.segment,
  SUM(o.total) AS revenue
FROM demo_orders o
JOIN demo_customers c ON c.id = o.customer_id
WHERE o.status = 'paid'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;`,
      database: "postgresql",
      databaseId: context.id,
      isPublic: true,
      isFavorite: true,
      status: "active",
      userId: user.id,
      deletedAt: null,
      tags: {
        set: [{ id: analytics.id }, { id: reporting.id }],
      },
    },
    create: {
      id: "demo-query-postgresql-monthly-revenue",
      title: "Monthly revenue by segment",
      description: "Fictitious PostgreSQL report grouped by month and customer segment.",
      sql: `SELECT
  DATE_TRUNC('month', o.created_at) AS month,
  c.segment,
  SUM(o.total) AS revenue
FROM demo_orders o
JOIN demo_customers c ON c.id = o.customer_id
WHERE o.status = 'paid'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;`,
      database: "postgresql",
      databaseId: context.id,
      isPublic: true,
      isFavorite: true,
      status: "active",
      userId: user.id,
      tags: {
        connect: [{ id: analytics.id }, { id: reporting.id }],
      },
    },
  })

  const mysqlQuery = await prisma.query.upsert({
    where: { id: "demo-query-mysql-active-customers" },
    update: {
      title: "Active customers in the last 30 days",
      description: "Fictitious MySQL query for activity analysis.",
      sql: `SELECT
  customer_id,
  COUNT(*) AS orders_count,
  SUM(total) AS total_spent
FROM orders
WHERE created_at >= NOW() - INTERVAL 30 DAY
GROUP BY customer_id
HAVING COUNT(*) >= 2
ORDER BY total_spent DESC
LIMIT 50;`,
      database: "mysql",
      databaseId: null,
      isPublic: false,
      isFavorite: false,
      status: "active",
      userId: user.id,
      deletedAt: null,
      tags: {
        set: [{ id: performance.id }],
      },
    },
    create: {
      id: "demo-query-mysql-active-customers",
      title: "Active customers in the last 30 days",
      description: "Fictitious MySQL query for activity analysis.",
      sql: `SELECT
  customer_id,
  COUNT(*) AS orders_count,
  SUM(total) AS total_spent
FROM orders
WHERE created_at >= NOW() - INTERVAL 30 DAY
GROUP BY customer_id
HAVING COUNT(*) >= 2
ORDER BY total_spent DESC
LIMIT 50;`,
      database: "mysql",
      isPublic: false,
      isFavorite: false,
      status: "active",
      userId: user.id,
      tags: {
        connect: [{ id: performance.id }],
      },
    },
  })

  await prisma.query.upsert({
    where: { id: "demo-query-sqlserver-inventory" },
    update: {
      title: "Products below reorder level",
      description: "Fictitious SQL Server inventory report.",
      sql: `SELECT TOP 25
  product_id,
  product_name,
  quantity_on_hand,
  reorder_level
FROM inventory
WHERE quantity_on_hand <= reorder_level
ORDER BY quantity_on_hand ASC;`,
      database: "sqlserver",
      databaseId: null,
      isPublic: false,
      isFavorite: true,
      status: "active",
      userId: user.id,
      deletedAt: null,
      tags: {
        set: [{ id: maintenance.id }, { id: reporting.id }],
      },
    },
    create: {
      id: "demo-query-sqlserver-inventory",
      title: "Products below reorder level",
      description: "Fictitious SQL Server inventory report.",
      sql: `SELECT TOP 25
  product_id,
  product_name,
  quantity_on_hand,
  reorder_level
FROM inventory
WHERE quantity_on_hand <= reorder_level
ORDER BY quantity_on_hand ASC;`,
      database: "sqlserver",
      isPublic: false,
      isFavorite: true,
      status: "active",
      userId: user.id,
      tags: {
        connect: [{ id: maintenance.id }, { id: reporting.id }],
      },
    },
  })

  await prisma.queryVersion.upsert({
    where: { id: "demo-query-version-postgres-v1" },
    update: {
      queryId: postgresQuery.id,
      sql: `SELECT DATE_TRUNC('day', created_at) AS day, SUM(total) AS revenue
FROM demo_orders
GROUP BY 1
ORDER BY 1 DESC;`,
      description: "Initial daily revenue draft before segmentation was added.",
    },
    create: {
      id: "demo-query-version-postgres-v1",
      queryId: postgresQuery.id,
      sql: `SELECT DATE_TRUNC('day', created_at) AS day, SUM(total) AS revenue
FROM demo_orders
GROUP BY 1
ORDER BY 1 DESC;`,
      description: "Initial daily revenue draft before segmentation was added.",
    },
  })

  await prisma.queryVersion.upsert({
    where: { id: "demo-query-version-mysql-v1" },
    update: {
      queryId: mysqlQuery.id,
      sql: `SELECT customer_id, COUNT(*) AS orders_count
FROM orders
WHERE created_at >= NOW() - INTERVAL 30 DAY
GROUP BY customer_id;`,
      description: "Initial draft before adding spend and activity thresholds.",
    },
    create: {
      id: "demo-query-version-mysql-v1",
      queryId: mysqlQuery.id,
      sql: `SELECT customer_id, COUNT(*) AS orders_count
FROM orders
WHERE created_at >= NOW() - INTERVAL 30 DAY
GROUP BY customer_id;`,
      description: "Initial draft before adding spend and activity thresholds.",
    },
  })

  const routine = await prisma.routine.upsert({
    where: { id: "demo-routine-postgresql-paid-orders-view" },
    update: {
      name: "Paid orders reporting view",
      description: "Fictitious PostgreSQL view for demo reporting workflows.",
      type: "view",
      database: "postgresql",
      databaseId: context.id,
      isPublic: true,
      sql: `CREATE OR REPLACE VIEW demo_paid_orders AS
SELECT
  o.id,
  o.customer_id,
  c.segment,
  o.total,
  o.created_at
FROM demo_orders o
JOIN demo_customers c ON c.id = o.customer_id
WHERE o.status = 'paid';`,
      parameters: null,
      returnType: null,
      status: "active",
      isFavorite: true,
      userId: user.id,
      deletedAt: null,
      tags: {
        set: [{ id: reporting.id }, { id: maintenance.id }],
      },
    },
    create: {
      id: "demo-routine-postgresql-paid-orders-view",
      name: "Paid orders reporting view",
      description: "Fictitious PostgreSQL view for demo reporting workflows.",
      type: "view",
      database: "postgresql",
      databaseId: context.id,
      isPublic: true,
      sql: `CREATE OR REPLACE VIEW demo_paid_orders AS
SELECT
  o.id,
  o.customer_id,
  c.segment,
  o.total,
  o.created_at
FROM demo_orders o
JOIN demo_customers c ON c.id = o.customer_id
WHERE o.status = 'paid';`,
      parameters: null,
      returnType: null,
      status: "active",
      isFavorite: true,
      userId: user.id,
      tags: {
        connect: [{ id: reporting.id }, { id: maintenance.id }],
      },
    },
  })

  await prisma.routineVersion.upsert({
    where: { id: "demo-routine-version-postgres-v1" },
    update: {
      routineId: routine.id,
      sql: `CREATE VIEW demo_paid_orders AS
SELECT id, customer_id, total, created_at
FROM demo_orders
WHERE status = 'paid';`,
    },
    create: {
      id: "demo-routine-version-postgres-v1",
      routineId: routine.id,
      sql: `CREATE VIEW demo_paid_orders AS
SELECT id, customer_id, total, created_at
FROM demo_orders
WHERE status = 'paid';`,
    },
  })

  console.log("")
  console.log("SQL Vault demo seed completed.")
  console.log(`Login:    ${DEMO_EMAIL}`)
  console.log(`Password: ${DEMO_PASSWORD}`)
  console.log("The dataset is fictitious and contains no API keys or AI provider credentials.")
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
