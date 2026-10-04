import { spawnSync } from "node:child_process"

const allowedToolingPackages = new Set([
  "@next/eslint-plugin-next",
  "@prisma/config",
  "braces",
  "deepmerge-ts",
  "eslint-config-next",
  "fast-glob",
  "micromatch",
  "mysql2",
  "prisma",
])

const result = spawnSync("npm", ["audit", "--json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
})

let report
try {
  report = JSON.parse(result.stdout)
} catch (error) {
  console.error(result.stdout)
  console.error(result.stderr)
  throw new Error("Unable to parse npm audit JSON output", { cause: error })
}

const vulnerabilities = Object.entries(report.vulnerabilities ?? {})
  .filter(([, value]) => value && ["high", "critical"].includes(value.severity))
  .map(([name, value]) => ({ name, severity: value.severity }))

const unexpected = vulnerabilities.filter(
  ({ name }) => !allowedToolingPackages.has(name)
)

if (unexpected.length > 0) {
  console.error("Unexpected high/critical npm audit findings:")
  for (const finding of unexpected) {
    console.error(`- ${finding.name}: ${finding.severity}`)
  }
  process.exit(1)
}

if (vulnerabilities.length === 0) {
  console.log("No high or critical npm audit findings.")
  process.exit(0)
}

console.log("Only explicitly allowlisted tooling findings remain:")
for (const finding of vulnerabilities) {
  console.log(`- ${finding.name}: ${finding.severity}`)
}

console.log(
  "These packages are monitored separately and must remain absent from the traffic-serving runtime image."
)
