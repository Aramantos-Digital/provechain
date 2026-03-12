import { getAuthContext } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { generateGitHubProof, hasRepoChanged } from '@/lib/github-integration'
import { getProviderToken, getUserTier } from '@/lib/core'
import { createOTSProof } from '@/lib/opentimestamps'

// POST /api/automated-repos/generate-proof - Manually trigger proof generation for a repo
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const body = await request.json()
    const { automated_repo_id } = body

    if (!automated_repo_id) {
      return NextResponse.json({
        error: 'Missing automated_repo_id'
      }, { status: 400 })
    }

    // Get automated repo details
    const { data: automatedRepo, error: repoError } = await supabase
      .from('automated_repos')
      .select('*')
      .eq('id', automated_repo_id)
      .eq('user_id', user.id)
      .single()

    if (repoError || !automatedRepo) {
      return NextResponse.json({
        error: 'Automated repo not found'
      }, { status: 404 })
    }

    if (!automatedRepo.is_active) {
      return NextResponse.json({
        error: 'Automated repo is not active'
      }, { status: 400 })
    }

    // Get GitHub access token: try session first, fall back to Core's connected services
    const authClient = createClient()
    const { data: { session } } = await authClient.auth.getSession()
    let providerToken = session?.provider_token

    if (!providerToken) {
      // Try Core's connected services (persisted GitHub token)
      providerToken = await getProviderToken(user.id, 'github')
    }

    if (!providerToken) {
      await supabase
        .from('automated_repos')
        .update({
          last_status: 'error',
          last_error: 'GitHub not connected. Please connect GitHub in Connected Services.',
        })
        .eq('id', automated_repo_id)

      return NextResponse.json({
        error: 'GitHub not connected. Please connect GitHub in Connected Services or sign in with GitHub.'
      }, { status: 403 })
    }

    // Get the default branch from GitHub API
    const repoInfoResponse = await fetch(
      `https://api.github.com/repos/${automatedRepo.repo_owner}/${automatedRepo.repo_name}`,
      {
        headers: {
          Authorization: `Bearer ${providerToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    )

    if (!repoInfoResponse.ok) {
      const errorData = await repoInfoResponse.json()
      throw new Error(`Failed to fetch repo info: ${errorData.message || repoInfoResponse.statusText}`)
    }

    const repoInfo = await repoInfoResponse.json()
    const branch = repoInfo.default_branch || 'main'

    // Check if repo has changed
    const { changed, currentSHA } = await hasRepoChanged(
      automatedRepo.repo_owner,
      automatedRepo.repo_name,
      branch,
      automatedRepo.last_commit_sha,
      providerToken
    )

    if (!changed && automatedRepo.last_commit_sha) {
      // No changes, update status and skip
      await supabase
        .from('automated_repos')
        .update({
          last_run_at: new Date().toISOString(),
          last_status: 'skipped',
          last_error: null,
        })
        .eq('id', automated_repo_id)

      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'No changes detected since last proof',
        currentSHA,
      })
    }

    // Generate proof
    const githubProof = await generateGitHubProof(
      automatedRepo.repo_owner,
      automatedRepo.repo_name,
      branch,
      providerToken
    )

    // Version chaining: link to previous proof if one exists
    let parentProofId: string | null = null
    let versionNumber = 1
    let proofGroupId: string | null = null
    const proofName = automatedRepo.repo_full_name

    if (automatedRepo.last_proof_id) {
      const { data: lastProof } = await supabase
        .from('proofs')
        .select('id, proof_group_id, version_number')
        .eq('id', automatedRepo.last_proof_id)
        .single()

      if (lastProof) {
        parentProofId = lastProof.id
        versionNumber = (lastProof.version_number || 1) + 1
        proofGroupId = lastProof.proof_group_id || lastProof.id

        // If the previous proof doesn't have a group yet, establish the chain
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
        file_name: automatedRepo.repo_full_name,
        file_hash: githubProof.proof_id,
        file_size: githubProof.total_size,
        timestamp: githubProof.timestamp,
        proof_json: githubProof,
        is_automated: true,
        automated_repo_id: automated_repo_id,
        commit_sha: githubProof.commit_sha,
        repo_url: githubProof.repo_url,
        branch_name: githubProof.branch,
        proof_name: proofName,
        description_title: `Automated Proof`,
        description_body: `Automated proof generated from GitHub repository ${automatedRepo.repo_full_name} at commit ${githubProof.commit_sha.substring(0, 7)}`,
        hash_version: 1,
        parent_proof_id: parentProofId,
        version_number: versionNumber,
        proof_group_id: proofGroupId,
        version_notes: parentProofId
          ? `Automated update — commit ${githubProof.commit_sha.substring(0, 7)}`
          : null,
      })
      .select()
      .single()

    if (proofError) {
      console.error('Error creating proof:', proofError)

      // Update automated repo with error
      await supabase
        .from('automated_repos')
        .update({
          last_run_at: new Date().toISOString(),
          last_status: 'error',
          last_error: `Failed to save proof: ${proofError.message}`,
        })
        .eq('id', automated_repo_id)

      return NextResponse.json({
        error: `Failed to create proof: ${proofError.message}`
      }, { status: 500 })
    }

    // Update automated repo with success
    await supabase
      .from('automated_repos')
      .update({
        last_commit_sha: githubProof.commit_sha,
        last_run_at: new Date().toISOString(),
        last_status: 'success',
        last_error: null,
        last_proof_id: proof.id,
      })
      .eq('id', automated_repo_id)

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'automated_proof_created',
      resource_type: 'proof',
      resource_id: proof.id,
      details: {
        repo_full_name: automatedRepo.repo_full_name,
        commit_sha: githubProof.commit_sha,
        total_files: githubProof.total_files,
        total_size: githubProof.total_size,
      }
    })

    // Create OpenTimestamps proof for paid tier users (async, don't block response)
    const tier = await getUserTier(user.id)
    if (tier !== 'free') {
      createOTSProofAsync(supabase, proof.id, githubProof.proof_id)
        .catch((error) => {
          console.error('Failed to create OTS proof for automated repo:', error)
        })
    }

    // Create success notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'automated_repo_success',
      title: 'Automated Proof Created',
      message: `Proof generated for ${automatedRepo.repo_full_name} (${githubProof.total_files} files)`,
      action_url: `/dashboard`,
      metadata: {
        repo_full_name: automatedRepo.repo_full_name,
        proof_id: proof.id,
        commit_sha: githubProof.commit_sha,
      },
    })

    return NextResponse.json({
      success: true,
      proof,
      githubProof,
      message: `Proof created successfully for ${automatedRepo.repo_full_name}`,
    })
  } catch (error: any) {
    console.error('Error in POST /api/automated-repos/generate-proof:', error)

    // Try to update automated repo with error (best effort)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const body = await request.json()

      if (user && body.automated_repo_id) {
        await supabase
          .from('automated_repos')
          .update({
            last_run_at: new Date().toISOString(),
            last_status: 'error',
            last_error: error.message || 'Unknown error occurred',
          })
          .eq('id', body.automated_repo_id)
          .eq('user_id', user.id)
      }
    } catch (updateError) {
      console.error('Failed to update automated repo error status:', updateError)
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Create OpenTimestamps proof asynchronously (doesn't block response)
 */
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
