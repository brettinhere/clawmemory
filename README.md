# ClawMemory

**Decentralized AI agent memory layer on BNB Smart Chain.**

For the first time in human history, you can share your AI memory — across devices, across models, across agents.

- **Users**: Store AI agent memory permanently, free (≤10KB × 10 slots). Authorize other agents to read your memory.
- **Miners**: Host encrypted memory files, earn `$MMP` tokens via proof-of-work — same mechanism as Bitcoin.

**Website**: [clawmemory.ai](https://clawmemory.ai)  
**Miner dashboard**: [clawmemory.ai/dashboard.html](https://clawmemory.ai/dashboard.html)

---

## Contracts (BSC Mainnet — permanent)

| Contract | Address |
|---|---|
| MemoryProtocol Proxy | `0x3BD7945d18FE6B68D273109902616BF17eb40F44` |
| MMPToken ($MMP) | `0x30b8Bf35679E024331C813Be4bDfDB784E8E9a1E` |

---

## Packages

| Package | npm | Description |
|---|---|---|
| `packages/memory-client` | [`clawmemory-cli`](https://npmjs.com/package/clawmemory-cli) | User CLI — save, load, grant, revoke memory |
| `packages/miner` | [`clawmemory-miner`](https://npmjs.com/package/clawmemory-miner) | Miner — host memory files, earn $MMP via PoW |
| `contracts` | — | Solidity contracts — MemoryProtocol + MMPToken |
| `skill` | [ClawHub](https://clawhub.com/skills/clawmemory) | OpenClaw AI Agent skill |

---

## Quick Start — Users

```bash
npm install -g clawmemory-cli
clawmemory init              # create wallet (one-time)
clawmemory save notes.md     # store memory on-chain (free ≤10KB)
clawmemory load <root>       # retrieve from P2P network
clawmemory grant 0xAddress   # authorize another agent
```

Free tier: 10 named slots × 10KB each. Permanent. Zero tokens required.

---

## Quick Start — Miners

```bash
npm install -g clawmemory-miner
clawmemory-miner --init   # create miner wallet
# Send ~0.1 BNB to your miner address for gas
clawmemory-miner          # start mining $MMP
```

**Mining mechanics**: Every ~12.5 minutes, the protocol challenges miners to prove they hold a specific random chunk of each active memory tree (Merkle proof + PoW hash). Valid proofs mint 50 $MMP directly to your wallet.

**Economics**:
- Max supply: 210,000,000 MMP (hard cap)
- Initial reward: 50 MMP per proof
- Halving: every 21,000,000 proofs (same model as Bitcoin)
- No presale. No whitelist. Zero team allocation.
- 89% of user fees permanently burned → deflationary

---

## Protocol Design

```
User device                BNB Smart Chain            P2P Network (miners)
─────────────             ─────────────────────      ──────────────────────
encrypt(memory)     ───►  storeRoot(merkleRoot)  ◄── miner downloads chunks
AES-256-GCM               MMPToken.mint(miner)        miner proves storage
                          access control              every 256 blocks (~12.5min)
```

Three-stage on-chain proof verification per submission:
1. **PoW hash**: `keccak256(nonce ++ miner ++ targetRoot ++ epochSeed) < currentTarget`
2. **Forced random chunk**: `epochSeed % totalChunks` — must match exactly, can't be faked without the data
3. **Merkle proof**: `MerkleProof.verify(proof, targetRoot, keccak256(chunkIndex ++ chunkData))`

---

## Directory Structure

```
clawmemory/
├── packages/
│   ├── memory-client/       # User CLI (clawmemory-cli on npm)
│   │   ├── bin/cli.js       # CLI entry point
│   │   └── src/
│   │       ├── wallet.js    # AES-256-GCM encrypted keystore (~/.clawmemory/)
│   │       ├── crypto.js    # Encryption / chunk splitting
│   │       ├── merkle.js    # Merkle tree builder
│   │       ├── chain.js     # BSC contract interactions
│   │       ├── hypercore.js # P2P data distribution
│   │       ├── slots.js     # Named slot manager (free tier)
│   │       └── permit.js    # EIP-2612 permit helper
│   └── miner/               # Miner daemon (clawmemory-miner on npm)
│       ├── index.js         # Main miner loop
│       ├── wallet.js        # Miner wallet (~/.clawmemory/)
│       ├── chain.js         # Proof submission
│       ├── pow-worker.js    # PoW solver (worker thread)
│       ├── merkle-prover.js # Chunk + Merkle proof builder
│       └── hypercore-server.js # P2P chunk server
├── contracts/               # Solidity (Hardhat)
│   ├── contracts/           # MemoryProtocol.sol, MMPToken.sol
│   ├── test/                # Full test suite
│   └── scripts/             # Deploy scripts
└── skill/                   # OpenClaw AI Agent skill
    ├── SKILL.md             # Skill definition
    └── scripts/             # Headless scripts for AI invocation
```

---

## Changelog

### v1.1.0 (2026-03-13)
- **Fix**: All paths migrated from `~/.omp/` to `~/.clawmemory/` (rebrand complete)
- **Fix**: `onboarding.sh` now uses headless `init-wallet.js` (no TTY required)
- **Fix**: `check-status.sh` detects wallet from `wallet.enc` presence, not env var
- **Fix**: `append-and-save.js` passes correct `cwd` so dotenv finds `.env`
- **Fix**: `cli.js` wallet path updated to `~/.clawmemory/`
- **Fix**: Miner wallet path updated to `~/.clawmemory/`
- `HALVING_INTERVAL` confirmed on-chain: 21,000,000 proofs

### v1.0.0 (2026-03-07)
- Initial release
- `clawmemory-cli` and `clawmemory-miner` published to npm
- MemoryProtocol deployed to BSC Mainnet

---

## License

MIT — See [LICENSE](LICENSE)

Built on BNB Smart Chain · [clawmemory.ai](https://clawmemory.ai)
