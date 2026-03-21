import { vi } from 'vitest'

const createDbMock = () => ({
  findMany: vi.fn().mockResolvedValue([]),
  findUnique: vi.fn().mockResolvedValue(null),
  findFirst: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
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
  user: createDbMock(),
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
