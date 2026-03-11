/**
 * deploy-v2.js — Deploy MemoryProtocol v2 (UUPS upgradeable)
 *
 * Deploys:
 *   1. MemoryProtocol implementation + ERC1967 proxy
 *   2. Calls proxy.initialize(mmpToken, treasury)
 *   3. Calls mmpToken.setMiner(proxy.address) to wire up minting
 *
 * Usage:
 *   PRIVATE_KEY=0x... node scripts/deploy-v2.js
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// ── Config ────────────────────────────────────────────────────────────────────
const RPC_URL     = "https://bsc-dataseed.binance.org/";
const CHAIN_ID    = 56;

// Deploy a fresh MMPToken (old one has minerLocked=true, can't update miner)
const DEPLOY_NEW_MMP = true;
// Treasury wallet
const TREASURY    = "0xcC44eE5cc70c99C9E22ff62DDBe5193522fB1Cee";
// Brett's wallet — will become the true owner after deployment
const BRETT_WALLET = "0x571d447f4f24688ec35ccf07f1d6993655f6af15";

const ARTIFACTS_DIR = path.join(__dirname, "../artifacts/contracts");

// ── Load artifacts ────────────────────────────────────────────────────────────
function loadArtifact(name) {
  const file = path.join(ARTIFACTS_DIR, `${name}.sol`, `${name}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// ── ERC1967 Proxy bytecode (minimal) ─────────────────────────────────────────
// We deploy a standard ERC1967Proxy pointing to the implementation
function loadProxyArtifact() {
  // OZ ERC1967Proxy artifact
  const candidates = [
    path.join(__dirname, "../node_modules/@openzeppelin/contracts/build/contracts/ERC1967Proxy.json"),
    path.join(__dirname, "../artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return JSON.parse(fs.readFileSync(c, "utf8"));
  }
  throw new Error("ERC1967Proxy artifact not found — run hardhat compile first");
}

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) { console.error("Set PRIVATE_KEY env var"); process.exit(1); }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(pk, provider);
  console.log("Deployer:", wallet.address);

  const bal = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(bal), "BNB");

  // 0. Deploy fresh MMPToken
  console.log("[0] Deploying fresh MMPToken...");
  const mmpArtifact  = loadArtifact("MMPToken");
  const MmpFactory   = new ethers.ContractFactory(mmpArtifact.abi, mmpArtifact.bytecode, wallet);
  const newMmp       = await MmpFactory.deploy();
  await newMmp.waitForDeployment();
  const MMP_TOKEN    = await newMmp.getAddress();
  console.log("    New MMPToken:", MMP_TOKEN);

  // 1. Deploy implementation
  console.log("\n[1] Deploying MemoryProtocol implementation...");
  const implArtifact = loadArtifact("MemoryProtocol");
  const ImplFactory  = new ethers.ContractFactory(implArtifact.abi, implArtifact.bytecode, wallet);
  const impl         = await ImplFactory.deploy();
  await impl.waitForDeployment();
  const implAddr = await impl.getAddress();
  console.log("    Implementation:", implAddr);

  // 2. Encode initialize() calldata
  const mpIface    = new ethers.Interface(implArtifact.abi);
  const initData   = mpIface.encodeFunctionData("initialize", [MMP_TOKEN, TREASURY]);

  // 3. Deploy ERC1967Proxy
  console.log("[2] Deploying ERC1967Proxy...");
  const proxyArtifact = loadProxyArtifact();
  const ProxyFactory  = new ethers.ContractFactory(proxyArtifact.abi, proxyArtifact.bytecode, wallet);
  const proxy         = await ProxyFactory.deploy(implAddr, initData);
  await proxy.waitForDeployment();
  const proxyAddr = await proxy.getAddress();
  console.log("    Proxy (use this address everywhere):", proxyAddr);

  // 4. Verify proxy is initialized
  const mp = new ethers.Contract(proxyAddr, implArtifact.abi, wallet);
  const owner = await mp.owner();
  console.log("[3] Proxy owner:", owner);
  console.log("    EPOCH_BLOCKS:", (await mp.EPOCH_BLOCKS()).toString());
  console.log("    upgradeabilityRenounced:", await mp.upgradeabilityRenounced());

  // 4b. Transfer ownership to Brett's wallet
  console.log("\n[4b] Transferring ownership to Brett's wallet...");
  const transferTx = await mp.transferOwnership(BRETT_WALLET);
  await transferTx.wait();
  const newOwner = await mp.owner();
  console.log("    ✅ New owner:", newOwner);
  console.log("    Match?", newOwner.toLowerCase() === BRETT_WALLET.toLowerCase());

  // 5. Wire MMPToken minter → proxy
  console.log("\n[4] Setting proxy as MMPToken minter...");
  const mmp    = newMmp.connect(wallet);
  const setTx  = await mmp.setMiner(proxyAddr);
  await setTx.wait();
  console.log("    ✅ setMiner tx:", setTx.hash);
  console.log("    miner locked to proxy:", proxyAddr);

  // 6. Save addresses
  const out = {
    network: "bsc-mainnet",
    chainId: CHAIN_ID,
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
    mmpToken: MMP_TOKEN,
    mmpTokenOld: "0x05A4a20c49002cAecA3e19Fde57125C94a8aD6B3",
    treasury: TREASURY,
    implementation: implAddr,
    proxy: proxyAddr,
    epochBlocks: 1000,
    note: "UUPS upgradeable. Call renounceUpgradeability() to lock forever."
  };
  const outPath = path.join(__dirname, "../deployed-v2.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("\n✅ Saved to deployed-v2.json");
  console.log("\n── Summary ──────────────────────────────────────────");
  console.log("  Proxy (use this):     ", proxyAddr);
  console.log("  Implementation:       ", implAddr);
  console.log("  Update miner config → PROTOCOL_ADDR =", proxyAddr);
  console.log("─────────────────────────────────────────────────────");
}

main().catch(e => { console.error(e); process.exit(1); });
