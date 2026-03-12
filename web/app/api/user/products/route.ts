import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { getUserProducts } from '@/lib/core'

export async function GET() {
  try {
    const auth = await getAuthContext()

    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const activations = await getUserProducts(auth.user.id)

    return NextResponse.json({ activations })
  } catch (error: any) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
