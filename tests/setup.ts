import { vi } from 'vitest'

const createDbMock = () => ({
  findMany: vi.fn().mockResolvedValue([]),
  findUnique: vi.fn().mockResolvedValue(null),
  findFirst: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue({}),
  upsert: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  updateMany: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
  deleteMany: vi.fn().mockResolvedValue({})
});

const mockPrisma = {
  query: createDbMock(),
  queryVersion: createDbMock(),
  routine: createDbMock(),
  routineVersion: createDbMock(),
  tag: createDbMock(),
  apiKey: createDbMock(),
  userAIConfig: createDbMock(),
  user: createDbMock(),
  databaseContext: createDbMock(),
  $transaction: vi.fn().mockResolvedValue([{}, {}, {}]),
};

// Mock global do Prisma — nunca tocar no banco real nos testes
vi.mock('@/lib/db', () => {
  return {
    __esModule: true,
    default: mockPrisma,
    prisma: mockPrisma,
  }
})

// Mock do auth do NextAuth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// Mock parcial de getUserFromApiKey: usa implementação real por padrão,
// mas permite override com vi.mocked(...).mockResolvedValue(...) nos testes.
vi.mock('@/lib/auth-api-key', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth-api-key')>('@/lib/auth-api-key')

  return {
    ...actual,
    getUserFromApiKey: vi.fn(actual.getUserFromApiKey),
  }
})
