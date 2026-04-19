import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const imagesDir = path.join(process.cwd(), 'public', 'images')

  if (!fs.existsSync(imagesDir)) {
    return NextResponse.json({ images: [] })
  }

  const files = fs.readdirSync(imagesDir).filter((f) =>
    /\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i.test(f)
  )

  return NextResponse.json({ images: files })
}
