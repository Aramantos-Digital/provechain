import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../lib/config.js'
import { hashFiles, generateProofHash } from '../lib/hasher.js'
import { loadProof } from '../lib/proof.js'

export const verifyCommand = new Command('verify')
  .description('Verify a proof file against current state')
  .argument('<proof_file>', 'Path to proof JSON file')
  .action((proofFile, opts) => {
    const root = opts.parent?.opts()?.projectRoot || process.cwd()
    const json = opts.parent?.opts()?.json || false

    const proof = loadProof(proofFile)
    const config = loadConfig(root)

    const spinner = json ? null : ora('Re-hashing files...').start()
    const { hashes } = hashFiles(root, config)
    if (spinner) spinner.succeed(`Re-hashed ${hashes.length} files`)

    const currentMap = new Map(hashes.map(h => [h.path, h.hash]))
    const proofMap = proof.file_hashes

    let matches = 0
    let mismatches = 0
    let missing = 0
    const mismatchDetails: { path: string; expected: string; actual: string }[] = []
    const missingFiles: string[] = []

    for (const [path, expectedHash] of Object.entries(proofMap)) {
      const actualHash = currentMap.get(path)
      if (!actualHash) {
        missing++
        missingFiles.push(path)
      } else if (actualHash !== expectedHash) {
        mismatches++
        mismatchDetails.push({ path, expected: expectedHash, actual: actualHash })
      } else {
        matches++
      }
    }

    // New files not in proof
    const newFiles: string[] = []
    for (const h of hashes) {
      if (!(h.path in proofMap)) newFiles.push(h.path)
    }

    const total = Object.keys(proofMap).length
    const pct = total > 0 ? Math.round((matches / total) * 100) : 0
    const passed = mismatches === 0 && missing === 0

    if (json) {
      console.log(JSON.stringify({
        success: true,
        proof_id: proof.proof_id,
        timestamp: proof.timestamp,
        verification_passed: passed,
        matches,
        mismatches,
        missing,
        new_files: newFiles.length,
        total_files: total,
        match_percentage: pct,
        mismatch_details: mismatchDetails,
        missing_files: missingFiles,
        new_file_list: newFiles,
      }, null, 2))
    } else {
      console.log()
      if (passed) {
        console.log(chalk.green.bold('Verification PASSED'))
      } else {
        console.log(chalk.red.bold('Verification FAILED'))
      }
      console.log(`  ${chalk.green('Matches:')}    ${matches} (${pct}%)`)
      if (mismatches > 0) console.log(`  ${chalk.red('Mismatches:')} ${mismatches}`)
      if (missing > 0) console.log(`  ${chalk.yellow('Missing:')}    ${missing}`)
      if (newFiles.length > 0) console.log(`  ${chalk.cyan('New files:')}  ${newFiles.length}`)

      if (mismatchDetails.length > 0) {
        console.log()
        console.log(chalk.red.bold('Modified files:'))
        for (const d of mismatchDetails.slice(0, 20)) {
          console.log(`  ${chalk.red('~')} ${d.path}`)
        }
        if (mismatchDetails.length > 20) console.log(chalk.dim(`  ... and ${mismatchDetails.length - 20} more`))
      }

      if (missingFiles.length > 0) {
        console.log()
        console.log(chalk.yellow.bold('Missing files:'))
        for (const f of missingFiles.slice(0, 20)) {
          console.log(`  ${chalk.yellow('?')} ${f}`)
        }
        if (missingFiles.length > 20) console.log(chalk.dim(`  ... and ${missingFiles.length - 20} more`))
      }
      console.log()
    }

    process.exit(passed ? 0 : 1)
  })
