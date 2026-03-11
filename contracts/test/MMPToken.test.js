const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MMPToken", function () {
  let token, owner, miner, alice, bob;

  beforeEach(async () => {
    [owner, miner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MMPToken");
    token = await Factory.deploy();
  });

  describe("Deployment", () => {
    it("should set correct name and symbol", async () => {
      expect(await token.name()).to.equal("Memory Protocol Token");
      expect(await token.symbol()).to.equal("MMP");
    });

    it("should have 18 decimals", async () => {
      expect(await token.decimals()).to.equal(18);
    });

    it("should set MAX_SUPPLY correctly", async () => {
      expect(await token.MAX_SUPPLY()).to.equal(ethers.parseEther("210000000"));
    });

    it("should start with zero totalMinted and totalBurned", async () => {
      expect(await token.totalMinted()).to.equal(0n);
      expect(await token.totalBurned()).to.equal(0n);
    });

    it("should not have miner set", async () => {
      expect(await token.miner()).to.equal(ethers.ZeroAddress);
      expect(await token.minerLocked()).to.equal(false);
    });
  });

  describe("setMiner", () => {
    it("owner can set miner and lock", async () => {
      await token.setMiner(miner.address);
      expect(await token.miner()).to.equal(miner.address);
      expect(await token.minerLocked()).to.equal(true);
    });

    it("emits MinerSet event", async () => {
      await expect(token.setMiner(miner.address))
        .to.emit(token, "MinerSet")
        .withArgs(miner.address);
    });

    it("rejects zero address", async () => {
      await expect(token.setMiner(ethers.ZeroAddress))
        .to.be.revertedWith("MMP: zero address");
    });

    it("non-owner cannot set miner", async () => {
      await expect(token.connect(alice).setMiner(alice.address))
        .to.be.reverted;
    });

    it("cannot set miner twice (already locked)", async () => {
      await token.setMiner(miner.address);
      await expect(token.setMiner(bob.address))
        .to.be.revertedWith("MMP: already locked");
    });
  });

  describe("mint", () => {
    beforeEach(async () => {
      await token.setMiner(miner.address);
    });

    it("miner can mint tokens", async () => {
      const amount = ethers.parseEther("1000");
      await token.connect(miner).mint(alice.address, amount);
      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    it("increments totalMinted", async () => {
      const amount = ethers.parseEther("500");
      await token.connect(miner).mint(alice.address, amount);
      expect(await token.totalMinted()).to.equal(amount);
    });

    it("non-miner cannot mint", async () => {
      await expect(token.connect(alice).mint(alice.address, 100n))
        .to.be.revertedWith("MMP: only miner");
    });

    it("cannot exceed MAX_SUPPLY", async () => {
      const max = await token.MAX_SUPPLY();
      await token.connect(miner).mint(alice.address, max);
      await expect(token.connect(miner).mint(alice.address, 1n))
        .to.be.revertedWith("MMP: cap exceeded");
    });
  });

  describe("burn", () => {
    beforeEach(async () => {
      await token.setMiner(miner.address);
      await token.connect(miner).mint(alice.address, ethers.parseEther("1000"));
    });

    it("tracks totalBurned on burn", async () => {
      const burnAmt = ethers.parseEther("100");
      await token.connect(alice).burn(burnAmt);
      expect(await token.totalBurned()).to.equal(burnAmt);
    });

    it("reduces balance after burn", async () => {
      const before = await token.balanceOf(alice.address);
      const burnAmt = ethers.parseEther("200");
      await token.connect(alice).burn(burnAmt);
      expect(await token.balanceOf(alice.address)).to.equal(before - burnAmt);
    });
  });

  describe("ERC20Permit", () => {
    it("supports DOMAIN_SEPARATOR", async () => {
      const ds = await token.DOMAIN_SEPARATOR();
      expect(ds).to.match(/^0x[0-9a-f]{64}$/i);
    });
  });
});
