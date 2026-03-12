import { Command } from 'commander'
import chalk from 'chalk'
import { createDefaultConfig } from '../lib/config.js'

export const initCommand = new Command('init')
  .description('Initialize ProveChain in current project')
  .option('--force', 'Overwrite existing config')
  .action((opts) => {
    const root = opts.parent?.opts()?.projectRoot || process.cwd()
    const json = opts.parent?.opts()?.json || false

    const created = createDefaultConfig(root, opts.force || false)

    if (!created) {
      if (json) {
        console.log(JSON.stringify({ success: false, error: 'provechain.yaml already exists. Use --force to overwrite.' }))
      } else {
        console.log(chalk.red('provechain.yaml already exists.') + ' Use --force to overwrite.')
      }
      process.exit(1)
    }

    if (json) {
      console.log(JSON.stringify({ success: true, message: 'ProveChain initialized' }))
    } else {
      console.log()
      console.log(chalk.green.bold('ProveChain Initialized!'))
      console.log(chalk.dim(`Config: provechain.yaml`))
      console.log()
      console.log(chalk.cyan.bold('Next steps:'))
      console.log(`  ${chalk.cyan('1.')} Edit provechain.yaml to customize settings`)
      console.log(`  ${chalk.cyan('2.')} Run: ${chalk.green('provechain snapshot "Initial commit"')}`)
      console.log(`  ${chalk.cyan('3.')} Add ${chalk.yellow('provechain/')} to your .gitignore`)
      console.log()
    }
  })
