import { createDataClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/share/[shareId] — Public endpoint for TimeAnchor verification
// No authentication required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params

    if (!shareId || shareId.length < 6) {
      return NextResponse.json({ error: 'Invalid share ID' }, { status: 400 })
    }

    // Sanitize — short codes are alphanumeric + URL-safe base64 chars
    const sanitizedCode = shareId.replace(/[^a-zA-Z0-9_-]/g, '')
    if (sanitizedCode !== shareId) {
      return NextResponse.json({ error: 'Invalid share ID' }, { status: 400 })
    }

    const supabase = createDataClient()

    // Look up share by short_code
    const { data: share, error: shareError } = await supabase
      .from('proof_shares')
      .select('*')
      .eq('short_code', sanitizedCode)
      .maybeSingle()

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
    }

    // Check expiry
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 })
    }

    // Fetch the proof
    const { data: proof, error: proofError } = await supabase
      .from('proofs')
      .select('proof_name, file_name, file_hash, file_size, ots_proof, ots_status, created_at, version_number, proof_json, commit_sha, repo_url, branch_name')
      .eq('id', share.proof_id)
      .single()

    if (proofError || !proof) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
    }

    // Build the response matching TimeAnchor's expected shape
    const response = {
      mode: share.mode,
      proof: {
        proof_name: proof.proof_name,
        file_name: proof.file_name,
        file_hash: proof.file_hash,
        file_size: proof.file_size,
        ots_proof: proof.ots_proof,
        ots_status: proof.ots_status,
        created_at: proof.created_at,
        version_number: proof.version_number,
        proof_json: {
          file_hashes: proof.proof_json?.file_hashes || null,
          files: proof.proof_json?.files || null,
        },
        commit_sha: proof.commit_sha,
        repo_url: proof.repo_url,
        branch_name: proof.branch_name,
      },
      shared_by: share.shared_by_name,
      created_at: share.created_at,
      expires_at: share.expires_at,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error in GET /api/share/[shareId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
