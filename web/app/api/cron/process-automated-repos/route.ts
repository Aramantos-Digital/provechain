import { createDataClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { generateGitHubProof, hasRepoChanged } from '@/lib/github-integration'
import { getProviderToken, getUserTier } from '@/lib/core'
import { createOTSProof } from '@/lib/opentimestamps'

// Cron processes multiple repos sequentially with external API calls — needs extended timeout
export const maxDuration = 120

// POST /api/cron/process-automated-repos - Process all automated repos that are due
// Called by Vercel Cron or external scheduler
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createDataClient()
    const now = new Date()

    // Get all active automated repos that are due for processing
    const { data: dueRepos, error: fetchError } = await supabase
      .from('automated_repos')
      .select('*')
      .eq('is_active', true)
      .or(
        `last_run_at.is.null,` +
        `and(schedule.eq.daily,last_run_at.lt.${new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()}),` +
        `and(schedule.eq.weekly,last_run_at.lt.${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()})`
      )

    if (fetchError) {
      console.error('Error fetching due repos:', fetchError)
      return NextResponse.json({
        error: 'Failed to fetch due repos',
        details: fetchError.message
      }, { status: 500 })
    }

    if (!dueRepos || dueRepos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No repos due for processing',
        processed: 0,
      })
    }

    const results = {
      processed: 0,
      success: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const repo of dueRepos) {
      results.processed++

      try {
        // Get GitHub access token from Core's connected services
        const accessToken = await getProviderToken(repo.user_id, 'github')

        if (!accessToken) {
          await supabase
            .from('automated_repos')
            .update({
              last_run_at: new Date().toISOString(),
              last_status: 'error',
              last_error: 'GitHub not connected. Please connect GitHub in Connected Services.',
            })
            .eq('id', repo.id)

          await supabase.from('notifications').insert({
            user_id: repo.user_id,
            type: 'automated_repo_error',
            title: 'Automated Proof Failed',
            message: `Unable to generate proof for ${repo.repo_full_name} — please connect GitHub in Connected Services`,
            action_url: '/connected-services',
            metadata: {
              repo_full_name: repo.repo_full_name,
              error: 'GitHub not connected via Connected Services',
            },
          })

          results.failed++
          results.errors.push(`${repo.repo_full_name}: GitHub not connected`)
          continue
        }

        // Get the default branch
        const repoInfoResponse = await fetch(
          `https://api.github.com/repos/${repo.repo_owner}/${repo.repo_name}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        )

        if (!repoInfoResponse.ok) {
          const errorData = await repoInfoResponse.json().catch(() => ({}))
          throw new Error(`GitHub API error: ${errorData.message || repoInfoResponse.statusText}`)
        }

        const repoInfo = await repoInfoResponse.json()
        const branch = repoInfo.default_branch || 'main'

        // Check if repo has changed
        const { changed, currentSHA } = await hasRepoChanged(
          repo.repo_owner,
          repo.repo_name,
          branch,
          repo.last_commit_sha,
          accessToken
        )

        if (!changed && repo.last_commit_sha) {
          await supabase
            .from('automated_repos')
            .update({
              last_run_at: new Date().toISOString(),
              last_status: 'skipped',
              last_error: null,
            })
            .eq('id', repo.id)

          results.skipped++
          continue
        }

        // Generate proof
        const githubProof = await generateGitHubProof(
          repo.repo_owner,
          repo.repo_name,
          branch,
          accessToken
        )

        // Version chaining: link to previous proof if one exists
        let parentProofId: string | null = null
        let versionNumber = 1
        let proofGroupId: string | null = null
        const proofName = repo.repo_full_name

        if (repo.last_proof_id) {
          const { data: lastProof } = await supabase
            .from('proofs')
            .select('id, proof_group_id, version_number')
            .eq('id', repo.last_proof_id)
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
            user_id: repo.user_id,
            file_name: repo.repo_full_name,
            file_hash: githubProof.proof_id,
            file_size: githubProof.total_size,
            timestamp: githubProof.timestamp,
            proof_json: githubProof,
            is_automated: true,
            automated_repo_id: repo.id,
            commit_sha: githubProof.commit_sha,
            repo_url: githubProof.repo_url,
            branch_name: githubProof.branch,
            proof_name: proofName,
            description_title: 'Automated Proof',
            description_body: `Automated proof generated from GitHub repository ${repo.repo_full_name} at commit ${githubProof.commit_sha.substring(0, 7)}`,
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
          throw new Error(`Failed to save proof: ${proofError.message}`)
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
          .eq('id', repo.id)

        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: repo.user_id,
          action: 'automated_proof_created',
          resource_type: 'proof',
          resource_id: proof.id,
          details: {
            repo_full_name: repo.repo_full_name,
            commit_sha: githubProof.commit_sha,
            total_files: githubProof.total_files,
            total_size: githubProof.total_size,
            triggered_by: 'cron',
          }
        })

        // Create OpenTimestamps proof for paid tier users (async, don't block)
        const userTier = await getUserTier(repo.user_id)
        if (userTier !== 'free') {
          createOTSProofAsync(supabase, proof.id, githubProof.proof_id)
            .catch((err) => console.error('OTS failed for cron proof:', err))
        }

        // Success notification
        await supabase.from('notifications').insert({
          user_id: repo.user_id,
          type: 'automated_repo_success',
          title: 'Automated Proof Created',
          message: `Proof generated for ${repo.repo_full_name} (${githubProof.total_files} files)`,
          action_url: '/dashboard',
          metadata: {
            repo_full_name: repo.repo_full_name,
            proof_id: proof.id,
            commit_sha: githubProof.commit_sha,
          },
        })

        results.success++
      } catch (error: any) {
        console.error(`Error processing ${repo.repo_full_name}:`, error)

        await supabase
          .from('automated_repos')
          .update({
            last_run_at: new Date().toISOString(),
            last_status: 'error',
            last_error: error.message,
          })
          .eq('id', repo.id)

        await supabase.from('notifications').insert({
          user_id: repo.user_id,
          type: 'automated_repo_error',
          title: 'Automated Proof Failed',
          message: `Error generating proof for ${repo.repo_full_name}: ${error.message}`,
          action_url: '/dashboard',
          metadata: {
            repo_full_name: repo.repo_full_name,
            error: error.message,
          },
        })

        results.failed++
        results.errors.push(`${repo.repo_full_name}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} automated repos`,
      results,
    })
  } catch (error: any) {
    console.error('Error in POST /api/cron/process-automated-repos:', error)
    return NextResponse.json({
      error: 'Failed to process automated repos',
      details: error.message
    }, { status: 500 })
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

// Vercel Cron sends GET requests
export async function GET(req: NextRequest) {
  return POST(req)
}
