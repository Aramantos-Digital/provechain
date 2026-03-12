import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import { listProofs } from '../lib/proof.js'

export const listCommand = new Command('list')
  .description('List all proof files')
  .action((opts) => {
    const root = opts.parent?.opts()?.projectRoot || process.cwd()
    const json = opts.parent?.opts()?.json || false

    const proofs = listProofs(root)

    if (json) {
      console.log(JSON.stringify({
        success: true,
        total_proofs: proofs.length,
        proofs: proofs.map(p => ({
          proof_id: p.proof.proof_id,
          timestamp: p.proof.timestamp,
          description: p.proof.description,
          total_files: p.proof.files_processed,
          file: p.file,
        })),
      }, null, 2))
      return
    }

    if (proofs.length === 0) {
      console.log()
      console.log(chalk.yellow('No proofs found'))
      console.log(chalk.dim("Run 'provechain snapshot' to create your first proof"))
      console.log()
      return
    }

    const table = new Table({
      head: ['#', 'Date', 'Description', 'Files', 'Proof ID'].map(h => chalk.cyan(h)),
    })

    proofs.forEach((p, i) => {
      table.push([
        String(i + 1),
        p.proof.timestamp.slice(0, 10),
        (p.proof.description || chalk.dim('(none)')).slice(0, 40),
        String(p.proof.files_processed),
        p.proof.proof_id.slice(0, 12) + '...',
      ])
    })

    console.log()
    console.log(chalk.bold(`Proofs (${proofs.length} total)`))
    console.log(table.toString())
    console.log()
  })
