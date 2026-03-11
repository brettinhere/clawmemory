require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
// FIX NN-H-01: storage layout plugin — run `npx hardhat storage-layout --contract MemoryProtocol`
// to get authoritative slot numbers whenever state variables change.
// Install: npm install --save-dev hardhat-storage-layout
try { require("hardhat-storage-layout"); } catch (_) {
  // Plugin optional — only needed for slot auditing, not for tests/deployment
}

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  networks: {
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : []
    },
    bsc: {
      url: process.env.BSC_RPC || "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      bsc:        process.env.BSCSCAN_API_KEY || "",
      bscTestnet: process.env.BSCSCAN_API_KEY || ""
    }
  }
};
