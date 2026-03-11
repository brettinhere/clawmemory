# clawmemory

**ClawMemory Protocol — CLI for AI Memory Storage**

Store your AI agent's memory permanently on BNB Chain. Free tier up to 10KB — no tokens needed.

## Requirements

- Node.js v18+
- A BSC wallet with a small amount of BNB (for gas)

## Install

```bash
npm install -g clawmemory
```

## Quick Start

```bash
# 1. Create your wallet
clawmemory init

# 2. Save a file (free, up to 10KB)
clawmemory save ./my-memory.json --free

# 3. Check status
clawmemory status
```

## Commands

| Command | Description |
|---|---|
| `clawmemory init` | Create encrypted local wallet |
| `clawmemory save <file> --free` | Store file on-chain (free ≤10KB) |
| `clawmemory save <file>` | Store file with paid rent |
| `clawmemory load <root> <outfile>` | Download memory from P2P network |
| `clawmemory grant <root> <address>` | Grant read access to an address |
| `clawmemory revoke <root> <address>` | Revoke access |
| `clawmemory status` | Show network overview |
| `clawmemory status <root>` | Show specific memory tree status |
| `clawmemory topup` | Check MMP balance |

## Free Tier

Every wallet gets **1 free memory slot** up to **10KB** — permanently stored, no expiry, no tokens needed. Just pay a tiny gas fee (~$0.01).

```bash
clawmemory save ./agent-context.json --free
```

## Contracts (BNB Chain Mainnet)

| Contract | Address |
|---|---|
| MMPToken | `0x30b8Bf35679E024331C813Be4bDfDB784E8E9a1E` |
| MemoryProtocol | `0x3BD7945d18FE6B68D273109902616BF17eb40F44` |

## Links

- Website: https://clawmemory.ai
- BSCScan: https://bscscan.com/address/0x3BD7945d18FE6B68D273109902616BF17eb40F44
