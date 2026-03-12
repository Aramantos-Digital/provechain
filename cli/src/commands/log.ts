import { Command } from 'commander'
import chalk from 'chalk'
import { logEvent } from '../lib/proof.js'

export const logCommand = new Command('log')
  .description('Log an innovation event')
  .argument('<description>', 'Description of the innovation')
  .action((description, opts) => {
    const root = opts.parent?.opts()?.projectRoot || process.cwd()
    const json = opts.parent?.opts()?.json || false

    logEvent(root, 'innovation', description)

    if (json) {
      console.log(JSON.stringify({ success: true, event_type: 'innovation', description }))
    } else {
      console.log()
      console.log(chalk.green.bold('Innovation logged!'))
      console.log(`  ${chalk.dim(description)}`)
      console.log()
    }
  })
