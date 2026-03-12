import { NextRequest, NextResponse } from 'next/server'
import { createDataClient } from '@/lib/supabase/server'
import { upgradeOTSProof } from '@/lib/opentimestamps'

// OTS upgrade queries calendar servers for each pending proof — needs extended timeout
export const maxDuration = 120

// POST /api/cron/upgrade-ots — Check pending OTS proofs for Bitcoin confirmations
// Runs every 6 hours via Vercel Cron
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createDataClient()

    // Fetch all proofs with pending OTS status
    const { data: pendingProofs, error: fetchError } = await supabase
      .from('proofs')
      .select('id, ots_proof, file_hash')
      .eq('ots_status', 'pending')
      .not('ots_proof', 'is', null)

    if (fetchError) {
      console.error('Error fetching pending OTS proofs:', fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    if (!pendingProofs || pendingProofs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending OTS proofs to upgrade',
        processed: 0,
      })
    }

    const results = { processed: 0, confirmed: 0, still_pending: 0, failed: 0 }

    for (const proof of pendingProofs) {
      results.processed++

      try {
        const { upgraded, otsProof } = await upgradeOTSProof(proof.ots_proof)

        if (upgraded) {
          // Confirmed on Bitcoin blockchain — save upgraded proof
          await supabase
            .from('proofs')
            .update({ ots_proof: otsProof, ots_status: 'confirmed' })
            .eq('id', proof.id)

          results.confirmed++
        } else {
          // Still pending — save any partial upgrade data (merged calendar responses)
          await supabase
            .from('proofs')
            .update({ ots_proof: otsProof })
            .eq('id', proof.id)

          results.still_pending++
        }
      } catch (error: any) {
        console.error(`OTS upgrade failed for proof ${proof.id}:`, error.message)
        results.failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} pending OTS proofs`,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error in OTS upgrade cron:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
