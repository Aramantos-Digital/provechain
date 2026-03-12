import { Command } from 'commander'
import chalk from 'chalk'
import { loadProof } from '../lib/proof.js'

export const diffCommand = new Command('diff')
  .description('Compare two proof files')
  .argument('<proof1>', 'Path to first proof file')
  .argument('<proof2>', 'Path to second proof file')
  .action((proof1Path, proof2Path, opts) => {
    const json = opts.parent?.opts()?.json || false

    const p1 = loadProof(proof1Path)
    const p2 = loadProof(proof2Path)

    const files1 = p1.file_hashes
    const files2 = p2.file_hashes
    const allFiles = new Set([...Object.keys(files1), ...Object.keys(files2)])

    const added: string[] = []
    const removed: string[] = []
    const modified: string[] = []
    let unchanged = 0

    for (const file of [...allFiles].sort()) {
      if (!(file in files1)) added.push(file)
      else if (!(file in files2)) removed.push(file)
      else if (files1[file] !== files2[file]) modified.push(file)
      else unchanged++
    }

    if (json) {
      console.log(JSON.stringify({
        success: true,
        proof1: { id: p1.proof_id, timestamp: p1.timestamp, description: p1.description, files: Object.keys(files1).length },
        proof2: { id: p2.proof_id, timestamp: p2.timestamp, description: p2.description, files: Object.keys(files2).length },
        differences: { added, removed, modified, unchanged_count: unchanged },
        has_differences: added.length > 0 || removed.length > 0 || modified.length > 0,
      }, null, 2))
    } else {
      console.log()
      console.log(chalk.cyan.bold('Comparing Proofs'))
      console.log(`  ${chalk.dim('Proof 1:')} ${p1.description || 'Unnamed'} (${p1.timestamp.slice(0, 10)})`)
      console.log(`  ${chalk.dim('Proof 2:')} ${p2.description || 'Unnamed'} (${p2.timestamp.slice(0, 10)})`)
      console.log()
      console.log(`  ${chalk.green('Added:')} ${added.length}  ${chalk.red('Removed:')} ${removed.length}  ${chalk.yellow('Modified:')} ${modified.length}  ${chalk.dim('Unchanged:')} ${unchanged}`)

      if (added.length > 0) {
        console.log()
        console.log(chalk.green.bold('Added:'))
        for (const f of added.slice(0, 20)) console.log(`  ${chalk.green('+')} ${f}`)
        if (added.length > 20) console.log(chalk.dim(`  ... and ${added.length - 20} more`))
      }
      if (removed.length > 0) {
        console.log()
        console.log(chalk.red.bold('Removed:'))
        for (const f of removed.slice(0, 20)) console.log(`  ${chalk.red('-')} ${f}`)
        if (removed.length > 20) console.log(chalk.dim(`  ... and ${removed.length - 20} more`))
      }
      if (modified.length > 0) {
        console.log()
        console.log(chalk.yellow.bold('Modified:'))
        for (const f of modified.slice(0, 20)) console.log(`  ${chalk.yellow('~')} ${f}`)
        if (modified.length > 20) console.log(chalk.dim(`  ... and ${modified.length - 20} more`))
      }
      if (!added.length && !removed.length && !modified.length) {
        console.log()
        console.log(chalk.green.bold('No differences found'))
      }
      console.log()
    }

    process.exit(added.length || removed.length || modified.length ? 1 : 0)
  })
