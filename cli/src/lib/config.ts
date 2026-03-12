import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parse } from 'yaml'
import type { ProveChainConfig } from './types.js'

const DEFAULT_CONFIG = `# ProveChain Configuration
# https://provechain.aramantos.dev

# File extensions to include in snapshots
include_extensions:
  - .py
  - .js
  - .ts
  - .tsx
  - .jsx
  - .java
  - .go
  - .rs
  - .c
  - .cpp
  - .h
  - .cs
  - .rb
  - .php
  - .swift
  - .kt
  - .md
  - .yaml
  - .yml
  - .json
  - .toml
  - .sql
  - .sh
  - .css
  - .html
  - .svg

# Paths to ignore (relative to project root)
ignore_paths:
  - .git
  - .venv
  - venv
  - node_modules
  - __pycache__
  - dist
  - build
  - .next
  - target
  - provechain
  - .provechain
`

const DEFAULT_EXTENSIONS = [
  '.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.go', '.rs', '.c', '.cpp',
  '.h', '.cs', '.rb', '.php', '.swift', '.kt', '.md', '.yaml', '.yml',
  '.json', '.toml', '.sql', '.sh', '.css', '.html', '.svg',
]

const DEFAULT_IGNORE = [
  '.git', '.venv', 'venv', 'node_modules', '__pycache__', 'dist', 'build',
  '.next', 'target', 'provechain', '.provechain',
]

export function loadConfig(projectRoot: string): ProveChainConfig {
  const configPath = join(projectRoot, 'provechain.yaml')

  if (!existsSync(configPath)) {
    return {
      include_extensions: DEFAULT_EXTENSIONS,
      ignore_paths: DEFAULT_IGNORE,
    }
  }

  const raw = readFileSync(configPath, 'utf-8')
  const parsed = parse(raw) as Partial<ProveChainConfig>

  return {
    include_extensions: parsed.include_extensions || DEFAULT_EXTENSIONS,
    ignore_paths: parsed.ignore_paths || DEFAULT_IGNORE,
  }
}

export function createDefaultConfig(projectRoot: string, force: boolean): boolean {
  const configPath = join(projectRoot, 'provechain.yaml')

  if (existsSync(configPath) && !force) {
    return false
  }

  writeFileSync(configPath, DEFAULT_CONFIG, 'utf-8')
  return true
}
