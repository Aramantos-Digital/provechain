import { Command } from 'commander'
import chalk from 'chalk'
import { getStoredSession } from '../lib/auth.js'
import { getCloudStatus } from '../lib/api.js'

export const whoamiCommand = new Command('whoami')
  .description('Show current login status')
  .action(async (opts) => {
    const json = opts.parent?.opts()?.json || false
    const session = getStoredSession()

    if (!session) {
      if (json) {
        console.log(JSON.stringify({ logged_in: false }))
      } else {
        console.log(chalk.yellow('Not logged in. Run "provechain login" to authenticate.'))
      }
      return
    }

    // Try to get cloud status (tier info)
    const status = await getCloudStatus()

    if (json) {
      console.log(JSON.stringify({
        logged_in: true,
        email: session.user.email,
        user_id: session.user.id,
        tier: status.tier || null,
      }, null, 2))
    } else {
      console.log()
      console.log(chalk.cyan.bold('ProveChain Account'))
      console.log(`  ${chalk.dim('Email:')}  ${session.user.email}`)
      console.log(`  ${chalk.dim('User:')}   ${session.user.id}`)
      if (status.tier) {
        console.log(`  ${chalk.dim('Plan:')}   ${status.tier}`)
      }
      console.log()
    }
  })
