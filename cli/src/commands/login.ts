import { Command } from 'commander'
import chalk from 'chalk'
import { createInterface } from 'readline'
import { login, getStoredSession, logout } from '../lib/auth.js'

function prompt(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    if (hidden && process.stdin.isTTY) {
      process.stdout.write(question)
      const stdin = process.stdin
      stdin.setRawMode?.(true)
      stdin.resume()
      let input = ''
      const onData = (ch: Buffer) => {
        const c = ch.toString()
        if (c === '\n' || c === '\r') {
          stdin.setRawMode?.(false)
          stdin.removeListener('data', onData)
          process.stdout.write('\n')
          rl.close()
          resolve(input)
        } else if (c === '\u0003') {
          process.exit(130)
        } else if (c === '\u007f' || c === '\b') {
          input = input.slice(0, -1)
        } else {
          input += c
        }
      }
      stdin.on('data', onData)
    } else {
      rl.question(question, (answer) => { rl.close(); resolve(answer) })
    }
  })
}

export const loginCommand = new Command('login')
  .description('Login to ProveChain cloud')
  .action(async (opts) => {
    const json = opts.parent?.opts()?.json || false

    const existing = getStoredSession()
    if (existing) {
      if (!json) {
        console.log(chalk.yellow(`Already logged in as ${existing.user.email}`))
        console.log(chalk.dim("Run 'provechain logout' first to switch accounts"))
      } else {
        console.log(JSON.stringify({ success: true, already_logged_in: true, email: existing.user.email }))
      }
      return
    }

    if (!json) {
      console.log()
      console.log(chalk.cyan.bold('ProveChain Cloud Login'))
      console.log()
    }

    const email = await prompt('Email: ')
    const password = await prompt('Password: ', true)

    try {
      const session = await login(email, password)
      if (json) {
        console.log(JSON.stringify({ success: true, email: session.user.email, user_id: session.user.id }))
      } else {
        console.log()
        console.log(chalk.green.bold('Logged in successfully!'))
        console.log(`  ${chalk.dim('Email:')} ${session.user.email}`)
        console.log()
      }
    } catch (err: any) {
      if (json) {
        console.log(JSON.stringify({ success: false, error: err.message }))
      } else {
        console.log(chalk.red(`Login failed: ${err.message}`))
      }
      process.exit(1)
    }
  })
