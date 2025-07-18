import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";

describe("FireSaleSwapTokens Contract Tests", function () {
    // Contracts
    let fireSale: Contract;
    let wbtc: Contract;
    let weth: Contract;

    // Signers
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;

    const exchangeRate = 20;
    const initialLiquidity = ethers.utils.parseUnits("1000", 18);

    beforeEach(async () => {
        [owner, addr1, addr2] = await ethers.getSigners();

        const initialSupply = ethers.utils.parseUnits("1000000", 18);

        // Deploy mock tokens with an initial supply
        const WBTCFactory = await ethers.getContractFactory("WBTC", owner);
        wbtc = await WBTCFactory.deploy(initialSupply);

        const WETHFactory = await ethers.getContractFactory("WETH", owner);
        weth = await WETHFactory.deploy(initialSupply);

        // Deploy FireSale contract
        const FireSaleFactory = await ethers.getContractFactory("FireSaleSwapTokens", owner);
        fireSale = await FireSaleFactory.deploy(wbtc.address, weth.address);
        await fireSale.deployed();

        // Fund contracts and users from the owner's initial supply
        await wbtc.transfer(fireSale.address, initialLiquidity);
        await weth.transfer(fireSale.address, initialLiquidity);
        
        const addr1Amount = ethers.utils.parseUnits("100", 18);
        await wbtc.transfer(addr1.address, addr1Amount);
        await weth.transfer(addr1.address, addr1Amount);
    });

    describe("Deployment", function () {
        it("should set the right owner", async function () {
            expect(await fireSale.owner()).to.equal(owner.address);
        });

        it("should initialize fireSale to true", async function () {
            expect(await fireSale.fireSale()).to.equal(true);
        });

        it("should have initial token liquidity", async function () {
            expect(await wbtc.balanceOf(fireSale.address)).to.equal(initialLiquidity);
            expect(await weth.balanceOf(fireSale.address)).to.equal(initialLiquidity);
        });
    });

    describe("Token Swaps", function () {
        const swapAmount = ethers.utils.parseUnits("10", 18);

        it("should fail to swap if tokens are not approved", async function () {
            // No approval is given, so this should fail
            await expect(
                fireSale.connect(addr1).swapExactInput(weth.address, swapAmount)
            ).to.be.revertedWith("ERC20InsufficientAllowance");
        });

        it("should swap WETH for WBTC correctly", async function () {
            await weth.connect(addr1).approve(fireSale.address, swapAmount);

            await expect(() =>
                fireSale.connect(addr1).swapExactInput(weth.address, swapAmount)
            ).to.changeTokenBalances(
                wbtc,
                [addr1, fireSale],
                [swapAmount.div(exchangeRate), swapAmount.div(exchangeRate).mul(-1)]
            );

            await expect(
                fireSale.connect(addr1).swapExactInput(weth.address, ethers.utils.parseUnits("0", 18))
            ).to.be.revertedWith("Amount must be greater than 0");
        });

        it("should swap WBTC for WETH correctly", async function () {
            await wbtc.connect(addr1).approve(fireSale.address, swapAmount);

            await expect(() =>
                fireSale.connect(addr1).swapExactInput(wbtc.address, swapAmount)
            ).to.changeTokenBalances(
                weth,
                [addr1, fireSale],
                [swapAmount.mul(exchangeRate), swapAmount.mul(exchangeRate).mul(-1)]
            );
        });

        it("should emit a WBTCpurchased event on successful WETH -> WBTC swap", async function () {
            await weth.connect(addr1).approve(fireSale.address, swapAmount);

            await expect(fireSale.connect(addr1).swapExactInput(weth.address, swapAmount))
                .to.emit(fireSale, "WBTCpurchased")
                .withArgs(addr1.address, wbtc.address, swapAmount.div(exchangeRate));
        });
    });

    describe("Toggle Fire Sale", function () {
        it("should allow the owner to toggle fireSale", async function () {
            expect(await fireSale.fireSale()).to.be.true;
            await fireSale.toggle();
            expect(await fireSale.fireSale()).to.be.false;
        });

        it("should revert if non-owner tries to toggle fireSale", async function () {
            await expect(fireSale.connect(addr1).toggle()).to.be.revertedWith("Not Allowed");
        });
    });

    describe("Withdrawals", function () {
        it("should allow the owner to withdraw ETH funds", async function () {
            const ethAmount = ethers.utils.parseEther("1.0");
            await addr2.sendTransaction({ to: fireSale.address, value: ethAmount });

            await fireSale.withdrawFunds();

            expect(await ethers.provider.getBalance(fireSale.address)).to.equal(0);
        });

        it("should allow the owner to withdraw tokens", async function () {
            const withdrawAmount = ethers.utils.parseUnits("100", 18);

            // Get balances before the transaction
            const ownerBalanceBefore = await wbtc.balanceOf(owner.address);
            const contractBalanceBefore = await wbtc.balanceOf(fireSale.address);

            // Perform the transaction
            await fireSale.withdrawTokens(wbtc.address, withdrawAmount);

            // Assert the changes using BigNumber methods .add() and .sub()
            expect(await wbtc.balanceOf(owner.address)).to.equal(ownerBalanceBefore.add(withdrawAmount));
            expect(await wbtc.balanceOf(fireSale.address)).to.equal(contractBalanceBefore.sub(withdrawAmount));
        });

        it("should revert if non-owner tries to withdraw ETH", async function () {
            await expect(fireSale.connect(addr1).withdrawFunds()).to.be.revertedWith("Not Allowed");
        });

        it("should revert if non-owner tries to withdraw tokens", async function () {
            const withdrawAmount = ethers.utils.parseUnits("100", 18);
            await expect(fireSale.connect(addr1).withdrawTokens(wbtc.address, withdrawAmount)).to.be.revertedWith("Not Allowed");
        });
    });
});
