/**
 * deploy.js — Deploy MMPToken + MemoryProtocol to BSC / BSC Testnet
 *
 * Steps:
 *   1. Deploy MMPToken
 *   2. Deploy MemoryProtocol(mmpAddr, treasuryAddr)
 *   3. setMiner(protocolAddr) → locks the miner forever
 *   4. Verify minerLocked == true
 *   5. (Optional) Register genesis file
 */

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance: ", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");

  // ── 1. Deploy MMPToken ─────────────────────────────────────────────────
  console.log("\n[1/5] Deploying MMPToken...");
  const TokenFactory = await ethers.getContractFactory("MMPToken");
  const token        = await TokenFactory.deploy();
  await token.waitForDeployment();
  const tokenAddr    = await token.getAddress();
  console.log("  MMPToken deployed at:", tokenAddr);

  // ── 2. Deploy MemoryProtocol ──────────────────────────────────────────
  console.log("\n[2/5] Deploying MemoryProtocol...");

  // Treasury defaults to deployer if not set in env
  const treasuryAddr = process.env.TREASURY_ADDRESS || deployer.address;
  console.log("  Treasury:", treasuryAddr);

  const ProtocolFactory = await ethers.getContractFactory("MemoryProtocol");
  const protocol        = await ProtocolFactory.deploy(tokenAddr, treasuryAddr);
  await protocol.waitForDeployment();
  const protocolAddr    = await protocol.getAddress();
  console.log("  MemoryProtocol deployed at:", protocolAddr);

  // ── 3. setMiner — lock MemoryProtocol as the sole minter ─────────────
  console.log("\n[3/5] Setting miner on MMPToken (locking)...");
  const tx = await token.setMiner(protocolAddr);
  await tx.wait();
  console.log("  setMiner tx:", tx.hash);

  // ── 4. Verify minerLocked ─────────────────────────────────────────────
  console.log("\n[4/5] Verifying minerLocked...");
  const locked = await token.minerLocked();
  if (!locked) throw new Error("minerLocked is false — something went wrong");
  const minerAddr = await token.miner();
  console.log("  minerLocked:", locked);
  console.log("  miner:      ", minerAddr);
  console.log("  miner == protocol:", minerAddr === protocolAddr);

  // ── 5. Optional: Register genesis file ───────────────────────────────
  if (process.env.GENESIS_ROOT && process.env.GENESIS_SIZE_KB) {
    console.log("\n[5/5] Registering genesis file...");
    const genesisRoot  = process.env.GENESIS_ROOT;
    const genesisSizeKB = BigInt(process.env.GENESIS_SIZE_KB);
    const genesisChunks = BigInt(process.env.GENESIS_CHUNKS || "1");

    // Genesis is free (≤10KB)
    const genesisTx = await protocol.storeMemory(
      genesisRoot,
      genesisSizeKB,
      genesisChunks,
      0 // rentBlocks = 0 for free tier
    );
    await genesisTx.wait();
    console.log("  Genesis file stored:", genesisRoot);
  } else {
    console.log("\n[5/5] (Skipping genesis file — GENESIS_ROOT not set)");
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Deployment Complete");
  console.log("  Network:         ", (await ethers.provider.getNetwork()).name);
  console.log("  MMPToken:        ", tokenAddr);
  console.log("  MemoryProtocol:  ", protocolAddr);
  console.log("  Treasury:        ", treasuryAddr);
  console.log("═══════════════════════════════════════════════════\n");

  // Output for .env
  console.log("# Add to .env:");
  console.log(`MMP_TOKEN_ADDRESS=${tokenAddr}`);
  console.log(`PROTOCOL_ADDRESS=${protocolAddr}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
