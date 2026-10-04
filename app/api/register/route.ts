import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"

import db from "@/lib/db"

const registrationSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(6).max(128),
  name: z.string().trim().min(1).max(100).optional(),
})

export async function POST(req: Request) {
  try {
    const parsed = registrationSchema.safeParse(await req.json())

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid registration data" },
        { status: 400 }
      )
    }

    const { email, password, name } = parsed.data

    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("[REGISTER_ERROR]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
