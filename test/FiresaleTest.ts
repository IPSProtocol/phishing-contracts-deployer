import { expect } from "chai";
import { ethers } from "hardhat";

describe("FireSale Contract Tests", function () {
    let fireSale: any;
    let owner: any;
    let addr1: any;
    let addr2: any;
    let WBTC: any;
    let WETH: any;

    before(async () => {
        [owner, addr1, addr2] = await ethers.getSigners();
        const wbtcFactory = await ethers.getContractFactory("WBTC");
        const wethFactory = await ethers.getContractFactory("WETH");
        const FireSaleFactory = await ethers.getContractFactory("FireSale");
        const wbtc = await wbtcFactory.deploy();
        const weth = await wethFactory.deploy();
        WBTC = wbtc.address;
        WETH = weth.address;
        fireSale = await FireSaleFactory.deploy(WETH, WBTC);
        await fireSale.deployed();
        await wbtc.connect(owner).transfer(fireSale.address, ethers.utils.parseEther("1000"));
        await weth.connect(owner).transfer(fireSale.address, ethers.utils.parseEther("1000"));
    });

    describe("Deployment", function () {
        it("should set the right owner", async function () {
            expect(await fireSale.owner()).to.equal(owner.address);
        });

        it("should initialize fireSale to true", async function () {
            expect(await fireSale.fireSale()).to.equal(true);
        });
    });

    describe("Token Purchase", function () {
        it("should allow purchasing WETH tokens", async function () {
            const purchaseAmount = ethers.utils.parseEther("1.0");
            await fireSale.connect(addr1).buyTokens(WETH, { value: purchaseAmount });
            // Add assertions to check the balance of addr1 and emitted events
        });

        it("should allow purchasing WBTC tokens", async function () {
            const purchaseAmount = ethers.utils.parseEther("1.0");
            await fireSale.connect(addr1).buyTokens(WBTC, { value: purchaseAmount });
            // Add assertions to check the balance of addr1 and emitted events
        });

    });

    describe("Toggle Fire Sale", function () {
        it("should allow the owner to toggle fireSale", async function () {
            let prev = await fireSale.fireSale();
            await fireSale.toggle();
            expect(await fireSale.fireSale()).to.equal(!prev);
        });

        it("should revert if non-owner tries to toggle fireSale", async function () {
            await expect(fireSale.connect(addr1).toggle()).to.be.revertedWith("Not Allowed");
        });
    });

    describe("Withdrawals", function () {
        it("should allow the owner to withdraw funds", async function () {
            const initialBalance = await ethers.provider.getBalance(owner.address);
            await fireSale.withdrawFunds();
            const finalBalance = await ethers.provider.getBalance(owner.address);
            expect(finalBalance).to.be.gt(initialBalance); // Check if balance increased
        });

        it("should allow the owner to withdraw tokens", async function () {
            const withdrawAmount = ethers.utils.parseUnits("1.0", 18);

            // First, transfer some tokens to the FireSale contract for testing
            const wbtc = await ethers.getContractAt("WBTC", WBTC);
            await wbtc.transfer(fireSale.address, withdrawAmount);

            // Check the balance of the owner before withdrawal
            const initialOwnerBalance = await wbtc.balanceOf(owner.address);

            // Withdraw tokens
            await fireSale.withdrawTokens(WBTC, withdrawAmount);

            // Check the balance of the owner after withdrawal
            const finalOwnerBalance = await wbtc.balanceOf(owner.address);
            expect(finalOwnerBalance).to.equal(initialOwnerBalance.add(withdrawAmount));
        });
    });
});
