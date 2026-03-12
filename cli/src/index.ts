import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { snapshotCommand } from './commands/snapshot.js'
import { verifyCommand } from './commands/verify.js'
import { listCommand } from './commands/list.js'
import { diffCommand } from './commands/diff.js'
import { logCommand } from './commands/log.js'
import { loginCommand } from './commands/login.js'
import { logoutCommand } from './commands/logout.js'
import { whoamiCommand } from './commands/whoami.js'

const program = new Command()

program
  .name('provechain')
  .description('ProveChain - Cryptographic proof of existence for your files')
  .version('1.0.0')
  .option('--json', 'Output results in JSON format')
  .option('--project-root <path>', 'Project root directory (default: cwd)')

program.addCommand(initCommand)
program.addCommand(snapshotCommand)
program.addCommand(verifyCommand)
program.addCommand(listCommand)
program.addCommand(diffCommand)
program.addCommand(logCommand)
program.addCommand(loginCommand)
program.addCommand(logoutCommand)
program.addCommand(whoamiCommand)

program.parse()
