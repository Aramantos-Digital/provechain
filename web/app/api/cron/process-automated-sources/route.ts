import { createDataClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getProviderToken, getUserTier } from '@/lib/core'
import { generateCloudProof, getProviderDisplayName } from '@/lib/cloud-proof'
import { createOTSProof } from '@/lib/opentimestamps'

// Cron processes multiple automations sequentially with external API calls — needs extended timeout
export const maxDuration = 120

// POST /api/cron/process-automated-sources — Process all cloud automations that are due
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
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

    // Get all active cloud automations that are due for processing
    const { data: dueSources, error: fetchError } = await supabase
      .from('automated_sources')
      .select('*')
      .eq('is_active', true)
      .or(
        `last_run_at.is.null,` +
        `and(schedule.eq.daily,last_run_at.lt.${new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()}),` +
        `and(schedule.eq.weekly,last_run_at.lt.${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()})`
      )

    if (fetchError) {
      console.error('Error fetching due sources:', fetchError)
      return NextResponse.json({
        error: 'Failed to fetch due sources',
        details: fetchError.message
      }, { status: 500 })
    }

    if (!dueSources || dueSources.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No cloud automations due for processing',
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

    for (const source of dueSources) {
      results.processed++
      const providerName = getProviderDisplayName(source.provider)

      try {
        // Get provider token from Core
        const accessToken = await getProviderToken(source.user_id, source.provider)

        if (!accessToken) {
          await supabase
            .from('automated_sources')
            .update({
              last_run_at: new Date().toISOString(),
              last_status: 'error',
              last_error: `${providerName} not connected.`,
            })
            .eq('id', source.id)

          await supabase.from('notifications').insert({
            user_id: source.user_id,
            type: 'automated_repo_error',
            title: 'Automated Proof Failed',
            message: `Unable to generate proof for ${source.name} — please connect ${providerName} in Connected Services`,
            action_url: '/connected-services',
            metadata: {
              provider: source.provider,
              automation_name: source.name,
              error: `${providerName} not connected`,
            },
          })

          results.failed++
          results.errors.push(`${source.name}: ${providerName} not connected`)
          continue
        }

        // Generate cloud proof
        const cloudProof = await generateCloudProof(
          source.provider,
          accessToken,
          source.selections,
          source.name
        )

        // Check if anything changed
        if (source.last_manifest_hash && source.last_manifest_hash === cloudProof.manifest_hash) {
          await supabase
            .from('automated_sources')
            .update({
              last_run_at: new Date().toISOString(),
              last_status: 'skipped',
              last_error: null,
            })
            .eq('id', source.id)

          results.skipped++
          continue
        }

        // Version chaining
        let parentProofId: string | null = null
        let versionNumber = 1
        let proofGroupId: string | null = null

        if (source.last_proof_id) {
          const { data: lastProof } = await supabase
            .from('proofs')
            .select('id, proof_group_id, version_number')
            .eq('id', source.last_proof_id)
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
            user_id: source.user_id,
            file_name: source.name,
            file_hash: cloudProof.proof_id,
            file_size: cloudProof.total_size,
            timestamp: cloudProof.timestamp,
            proof_json: cloudProof,
            is_automated: true,
            automated_source_id: source.id,
            proof_name: source.name,
            description_title: 'Automated Proof',
            description_body: `Automated proof from ${providerName} — ${source.name} (${cloudProof.total_files} files)`,
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
          throw new Error(`Failed to save proof: ${proofError.message}`)
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
          .eq('id', source.id)

        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: source.user_id,
          action: 'automated_proof_created',
          resource_type: 'proof',
          resource_id: proof.id,
          details: {
            provider: source.provider,
            automation_name: source.name,
            total_files: cloudProof.total_files,
            total_size: cloudProof.total_size,
            hash_algorithm: cloudProof.hash_algorithm,
            triggered_by: 'cron',
          }
        })

        // Create OTS proof for paid tier users (async, don't block)
        const userTier = await getUserTier(source.user_id)
        if (userTier !== 'free') {
          createOTSProofAsync(supabase, proof.id, cloudProof.proof_id)
            .catch((err) => console.error('OTS failed for cloud cron proof:', err))
        }

        // Success notification
        await supabase.from('notifications').insert({
          user_id: source.user_id,
          type: 'automated_repo_success',
          title: 'Automated Proof Created',
          message: `Proof generated from ${providerName} — ${source.name} (${cloudProof.total_files} files)`,
          action_url: '/dashboard',
          metadata: {
            provider: source.provider,
            automation_name: source.name,
            proof_id: proof.id,
          },
        })

        results.success++
      } catch (error: any) {
        console.error(`Error processing ${source.name} (${source.provider}):`, error)

        await supabase
          .from('automated_sources')
          .update({
            last_run_at: new Date().toISOString(),
            last_status: 'error',
            last_error: error.message,
          })
          .eq('id', source.id)

        await supabase.from('notifications').insert({
          user_id: source.user_id,
          type: 'automated_repo_error',
          title: 'Automated Proof Failed',
          message: `Error generating proof for ${source.name}: ${error.message}`,
          action_url: '/dashboard',
          metadata: {
            provider: source.provider,
            automation_name: source.name,
            error: error.message,
          },
        })

        results.failed++
        results.errors.push(`${source.name}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} cloud automations`,
      results,
    })
  } catch (error: any) {
    console.error('Error in POST /api/cron/process-automated-sources:', error)
    return NextResponse.json({
      error: 'Failed to process cloud automations',
      details: error.message
    }, { status: 500 })
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

// Vercel Cron sends GET requests
export async function GET(req: NextRequest) {
  return POST(req)
}
