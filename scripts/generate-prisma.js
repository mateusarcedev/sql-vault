#!/usr/bin/env node

/**
 * Script para regenerar o Prisma client
 * Deve ser executado após mudanças no schema.prisma
 */

const { exec } = require('child_process')
const path = require('path')

const command = 'npx prisma generate'
const cwd = path.join(__dirname, '..')

console.log('🔄 Regenerando Prisma client...')
exec(command, { cwd }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Erro ao regenerar:', error.message)
    console.error(stderr)
    process.exit(1)
  }

  console.log('✅ Prisma client regenerado!')
  console.log(stdout)
})
