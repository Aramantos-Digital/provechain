import { getAuthContext } from '@/lib/auth-context'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getProviderToken, getUserTier } from '@/lib/core'
import { generateCloudProof, getProviderDisplayName, type WorkspaceHash } from '@/lib/cloud-proof'
import { createOTSProof } from '@/lib/opentimestamps'

// POST /api/automated-sources/generate-proof — Manually trigger proof generation for a cloud automation
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const body = await request.json()
    const { automated_source_id, workspace_hashes } = body

    if (!automated_source_id) {
      return NextResponse.json({ error: 'Missing automated_source_id' }, { status: 400 })
    }

    // Validate workspace_hashes if provided
    let validatedWorkspaceHashes: WorkspaceHash[] | undefined
    if (workspace_hashes && Array.isArray(workspace_hashes)) {
      validatedWorkspaceHashes = workspace_hashes
        .filter((wh: any) => wh.fileId && wh.path && wh.hash && typeof wh.size === 'number')
        .map((wh: any) => ({
          fileId: String(wh.fileId),
          path: String(wh.path),
          hash: String(wh.hash).toLowerCase(),
          size: Number(wh.size),
          exportedAs: wh.exportedAs ? String(wh.exportedAs) : undefined,
          headRevisionId: wh.headRevisionId ? String(wh.headRevisionId) : undefined,
        }))
    }

    // Get automation details
    const { data: automation, error: sourceError } = await supabase
      .from('automated_sources')
      .select('*')
      .eq('id', automated_source_id)
      .eq('user_id', user.id)
      .single()

    if (sourceError || !automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    if (!automation.is_active) {
      return NextResponse.json({ error: 'Automation is not active' }, { status: 400 })
    }

    const providerName = getProviderDisplayName(automation.provider)

    // Get provider token from Core
    const providerToken = await getProviderToken(user.id, automation.provider)

    if (!providerToken) {
      await supabase
        .from('automated_sources')
        .update({
          last_status: 'error',
          last_error: `${providerName} not connected. Please connect in Connected Services.`,
        })
        .eq('id', automated_source_id)

      return NextResponse.json({
        error: `${providerName} not connected. Please connect ${providerName} in Connected Services.`
      }, { status: 403 })
    }

    // Generate cloud proof (expand selections, hash files via provider API)
    // workspace_hashes are browser-provided hashes for Google Workspace files (Docs/Sheets/Slides)
    const cloudProof = await generateCloudProof(
      automation.provider,
      providerToken,
      automation.selections,
      automation.name,
      validatedWorkspaceHashes,
    )

    // Check if anything changed since last proof
    if (automation.last_manifest_hash && automation.last_manifest_hash === cloudProof.manifest_hash) {
      await supabase
        .from('automated_sources')
        .update({
          last_run_at: new Date().toISOString(),
          last_status: 'skipped',
          last_error: null,
        })
        .eq('id', automated_source_id)

      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'No changes detected since last proof',
      })
    }

    // Version chaining: link to previous proof if one exists
    let parentProofId: string | null = null
    let versionNumber = 1
    let proofGroupId: string | null = null

    if (automation.last_proof_id) {
      const { data: lastProof } = await supabase
        .from('proofs')
        .select('id, proof_group_id, version_number')
        .eq('id', automation.last_proof_id)
        .single()

      if (lastProof) {
        parentProofId = lastProof.id
        versionNumber = (lastProof.version_number || 1) + 1
        proofGroupId = lastProof.proof_group_id || lastProof.id

        if (!lastProof.proof_group_id) {
          await supabase
            .from('proofs')
            .update({ proof_group_id: lastProof.id, version_number: 1 })
            .eq('id', lastProof.id)
        }
      }
    }

    // Create proof in database
    const { data: proof, error: proofError } = await supabase
      .from('proofs')
      .insert({
        user_id: user.id,
        file_name: automation.name,
        file_hash: cloudProof.proof_id,
        file_size: cloudProof.total_size,
        timestamp: cloudProof.timestamp,
        proof_json: cloudProof,
        is_automated: true,
        automated_source_id: automated_source_id,
        proof_name: automation.name,
        description_title: 'Automated Proof',
        description_body: `Automated proof from ${providerName} — ${automation.name} (${cloudProof.total_files} files)`,
        hash_version: 1,
        parent_proof_id: parentProofId,
        version_number: versionNumber,
        proof_group_id: proofGroupId,
        version_notes: parentProofId
          ? `Automated update from ${providerName}`
          : null,
      })
      .select()
      .single()

    if (proofError) {
      console.error('Error creating cloud proof:', proofError)

      await supabase
        .from('automated_sources')
        .update({
          last_run_at: new Date().toISOString(),
          last_status: 'error',
          last_error: `Failed to save proof: ${proofError.message}`,
        })
        .eq('id', automated_source_id)

      return NextResponse.json({
        error: `Failed to create proof: ${proofError.message}`
      }, { status: 500 })
    }

    // Update automation with success
    await supabase
      .from('automated_sources')
      .update({
        last_run_at: new Date().toISOString(),
        last_status: 'success',
        last_error: null,
        last_proof_id: proof.id,
        last_manifest_hash: cloudProof.manifest_hash,
      })
      .eq('id', automated_source_id)

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'automated_proof_created',
      resource_type: 'proof',
      resource_id: proof.id,
      details: {
        provider: automation.provider,
        automation_name: automation.name,
        total_files: cloudProof.total_files,
        total_size: cloudProof.total_size,
        hash_algorithm: cloudProof.hash_algorithm,
      }
    })

    // Create OpenTimestamps proof for paid tier users (async, don't block response)
    const tier = await getUserTier(user.id)
    if (tier !== 'free') {
      createOTSProofAsync(supabase, proof.id, cloudProof.proof_id)
        .catch((error) => {
          console.error('Failed to create OTS proof for cloud automation:', error)
        })
    }

    // Success notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'automated_repo_success',
      title: 'Automated Proof Created',
      message: `Proof generated from ${providerName} — ${automation.name} (${cloudProof.total_files} files)`,
      action_url: '/dashboard',
      metadata: {
        provider: automation.provider,
        automation_name: automation.name,
        proof_id: proof.id,
      },
    })

    return NextResponse.json({
      success: true,
      proof,
      cloudProof,
      message: `Proof created successfully for ${automation.name}`,
    })
  } catch (error: any) {
    console.error('Error in POST /api/automated-sources/generate-proof:', error)

    // Try to update automation with error (best effort)
    try {
      const auth = await getAuthContext()
      const body = await request.json()
      if (auth && body.automated_source_id) {
        await auth.supabase
          .from('automated_sources')
          .update({
            last_run_at: new Date().toISOString(),
            last_status: 'error',
            last_error: error.message || 'Unknown error occurred',
          })
          .eq('id', body.automated_source_id)
          .eq('user_id', auth.user.id)
      }
    } catch (updateError) {
      console.error('Failed to update automation error status:', updateError)
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function createOTSProofAsync(
  supabase: any,
  proofId: string,
  fileHash: string
): Promise<void> {
  try {
    const otsResult = await createOTSProof(fileHash)

    if (!otsResult.success || !otsResult.otsProof) {
      throw new Error(otsResult.error || 'Failed to create OTS proof')
    }

    const { error } = await supabase
      .from('proofs')
      .update({
        ots_proof: otsResult.otsProof,
        ots_status: 'pending'
      })
      .eq('id', proofId)

    if (error) {
      throw new Error(`Failed to save OTS proof: ${error.message}`)
    }
  } catch (error: any) {
    console.error(`OTS creation failed for ${proofId}:`, error.message)
  }
}
