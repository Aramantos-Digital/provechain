import { Command } from 'commander'
import chalk from 'chalk'
import { logout, getStoredSession } from '../lib/auth.js'

export const logoutCommand = new Command('logout')
  .description('Logout from ProveChain cloud')
  .action((opts) => {
    const json = opts.parent?.opts()?.json || false
    const session = getStoredSession()

    logout()

    if (json) {
      console.log(JSON.stringify({ success: true }))
    } else {
      if (session) {
        console.log(chalk.green(`Logged out from ${session.user.email}`))
      } else {
        console.log(chalk.yellow('Not logged in'))
      }
    }
  })
