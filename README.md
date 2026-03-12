# ProveChain

**Cryptographic file integrity verification made simple.**

ProveChain generates SHA-256 cryptographic proofs of your files with timestamps, providing tamper-proof evidence of file existence and integrity.

---

## 🚀 Quick Start

### Web App (Instant)
Visit [provechain.io](https://provechain.io) to generate proofs instantly in your browser. Your files never leave your device.

### CLI Tool
```bash
pip install provechain
provechain generate file.pdf
```

---

## 📦 What's Included

This repository contains:

- **`/web`** - Next.js 14 web application
- **`/cli`** - Python CLI tool (published to PyPI)

---

## 🛠️ Local Development

### Web App
```bash
cd web
npm install
npm run dev
```

Visit `http://localhost:3000`

### CLI Tool
```bash
cd cli
pip install -e .
provechain --help
```

---

## 🔐 How It Works

1. **Hash**: Generate SHA-256 hash of your file
2. **Timestamp**: Add RFC 3339 timestamp
3. **Proof**: Create tamper-proof JSON proof file

**Privacy**: All hashing happens locally. Your files never leave your machine.

---

## 💻 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **CLI**: Python 3.8+, cryptography library
- **Deployment**: Vercel
- **Payments**: Stripe (for paid tiers)

---

## 📄 License

MIT License - See LICENSE file for details.

Copyright (c) 2025 John Doyle / Aramantos Digital

---

## 🔗 Links

- **Website**: [provechain.io](https://provechain.io)
- **CLI on PyPI**: [pypi.org/project/provechain](https://pypi.org/project/provechain)
- **Documentation**: [provechain.io/faq](https://provechain.io/faq)

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

For major changes, please open an issue first to discuss.

---

**ProveChain** - Because integrity matters.
