import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../lib/config.js'
import { hashFiles } from '../lib/hasher.js'
import { createProof, saveProof, logEvent } from '../lib/proof.js'
import { syncProof } from '../lib/api.js'

export const snapshotCommand = new Command('snapshot')
  .description('Create a proof snapshot of current project')
  .argument('[description]', 'Description of this snapshot')
  .option('--sync', 'Upload proof to ProveChain cloud')
  .action(async (description, opts) => {
    const root = opts.parent?.opts()?.projectRoot || process.cwd()
    const json = opts.parent?.opts()?.json || false
    const sync = opts.sync || false

    const config = loadConfig(root)

    const spinner = json ? null : ora('Hashing files...').start()

    const { hashes, skipped } = hashFiles(root, config, (current, _total, path) => {
      if (spinner) spinner.text = `Hashing files... ${current} (${path.split('/').pop()})`
    })

    if (spinner) spinner.succeed(`Hashed ${hashes.length} files (${skipped} skipped)`)

    const proof = createProof(root, hashes, skipped, description || null)
    const filePath = saveProof(root, proof)

    // Log to ledger
    logEvent(root, 'snapshot_created', description || 'Snapshot created', {
      proof_id: proof.proof_id,
      total_files: proof.files_processed,
    })

    // Cloud sync
    let syncResult: { success: boolean; proofId?: string; error?: string } | null = null
    if (sync) {
      const syncSpinner = json ? null : ora('Syncing to cloud...').start()
      try {
        syncResult = await syncProof(proof)
        if (syncResult.success) {
          if (syncSpinner) syncSpinner.succeed('Synced to ProveChain cloud')
        } else {
          if (syncSpinner) syncSpinner.fail(`Sync failed: ${syncResult.error}`)
        }
      } catch (err: any) {
        syncResult = { success: false, error: err.message }
        if (syncSpinner) syncSpinner.fail(`Sync failed: ${err.message}`)
      }
    }

    if (json) {
      console.log(JSON.stringify({
        success: true,
        proof_id: proof.proof_id,
        timestamp: proof.timestamp,
        description: proof.description,
        files_hashed: proof.files_processed,
        files_skipped: proof.files_skipped,
        total_files: proof.total_files,
        proof_file: filePath,
        ...(sync ? { sync: syncResult } : {}),
      }, null, 2))
    } else {
      console.log()
      console.log(chalk.green.bold('Proof Created!'))
      console.log(`  ${chalk.cyan('Proof ID:')} ${chalk.dim(proof.proof_id.slice(0, 16))}...`)
      console.log(`  ${chalk.cyan('Files:')}    ${proof.files_processed} hashed, ${proof.files_skipped} skipped`)
      console.log(`  ${chalk.cyan('Saved:')}    ${filePath}`)
      if (description) console.log(`  ${chalk.cyan('Note:')}     ${description}`)
      if (sync && syncResult?.success) {
        console.log(`  ${chalk.cyan('Cloud:')}    ${chalk.green('Synced')} (${syncResult.proofId})`)
      }
      console.log()
    }
  })
