import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";

describe("FireSale7702 Contract Tests", function () {
    // Contracts
    let fireSale: Contract;
    let weth: Contract;
    let feth: Contract; // Using a mock ERC20 for FETH

    // Signers
    let owner: SignerWithAddress;
    let user: SignerWithAddress;

    // Test constants
    const initialSupply = ethers.utils.parseUnits("1000000", 18);
    const userWethAmount = ethers.utils.parseUnits("100", 18);
    const contractFethLiquidity = ethers.utils.parseUnits("1000", 18);

    beforeEach(async () => {
        [owner, user] = await ethers.getSigners();

        // Deploy mock ERC20 tokens with an initial supply for the owner
        const TokenFactory = await ethers.getContractFactory("WETH", owner); // Assuming WETH and FETH use the same mock contract
        weth = await TokenFactory.deploy(initialSupply);
        feth = await TokenFactory.deploy(initialSupply);

        // Deploy FireSale7702 contract
        const FireSaleFactory = await ethers.getContractFactory("FireSale7702", owner);
        fireSale = await FireSaleFactory.deploy(weth.address, feth.address);
        await fireSale.deployed();

        // Fund user with WETH for the swap from the owner's balance
        await weth.connect(owner).transfer(user.address, userWethAmount);

        // Fund FireSale contract with FETH liquidity from the owner's balance
        await feth.connect(owner).transfer(fireSale.address, contractFethLiquidity);
    });

    describe("Deployment and Initial State", function () {
        it("should set the correct owner", async function () {
            expect(await fireSale.owner()).to.equal(owner.address);
        });

        it("should have initial FETH liquidity for swaps", async function () {
            expect(await feth.balanceOf(fireSale.address)).to.equal(contractFethLiquidity);
        });

        it("should have set the correct WETH and FETH token addresses", async function () {
            expect(await fireSale.WETH()).to.equal(weth.address);
            expect(await fireSale.FETH()).to.equal(feth.address);
        });
    });

    describe("swapWETHforFETH Function", function () {
        const amountToSwap = ethers.utils.parseUnits("10", 18);
        const amountToReceive = ethers.utils.parseUnits("10", 18); // Assuming 1:1 swap for this test

        it("should fail if the user has not approved the contract to spend WETH", async function () {
            await expect(
                fireSale.connect(user).swapWETHforFETH(amountToSwap, amountToReceive)
            ).to.be.reverted;
        });

        it("should fail if the contract has insufficient FETH liquidity", async function () {
            const excessiveAmount = contractFethLiquidity.add(1); // Try to get more FETH than the contract has
            await weth.connect(user).approve(fireSale.address, amountToSwap);

            await expect(
                fireSale.connect(user).swapWETHforFETH(amountToSwap, excessiveAmount)
            ).to.be.reverted;
        });

        it("should successfully swap WETH for FETH when conditions are met", async function () {
            // 1. User approves the contract
            await weth.connect(user).approve(fireSale.address, amountToSwap);
            // Get balances before the transaction
            const wethUserBalanceBefore = await weth.balanceOf(user.address);
            const fethUserBalanceBefore = await feth.balanceOf(user.address);
            const wethContractBalanceBefore = await weth.balanceOf(fireSale.address);
            const fethContractBalanceBefore = await feth.balanceOf(fireSale.address);
            
            // 2. Execute the swap and check balances change
            await fireSale.connect(user).swapWETHforFETH(amountToSwap, amountToReceive,[],[]);

            // Assert the changes using BigNumber methods .add() and .sub()
            const userNewWeth = await weth.balanceOf(user.address);
            const userNewFeth = await feth.balanceOf(user.address);
            const contractNewWeth = await weth.balanceOf(fireSale.address);
            const contractNewFeth = await feth.balanceOf(fireSale.address);

            expect(userNewWeth).to.equal(wethUserBalanceBefore.sub(amountToSwap));
            expect(userNewFeth).to.equal(fethUserBalanceBefore.add(amountToReceive));
            expect(contractNewWeth).to.equal(wethContractBalanceBefore.add(amountToSwap));
            expect(contractNewFeth).to.equal(fethContractBalanceBefore.sub(amountToReceive));
        });

        it("should emit WETHReceived and FETHSent events on successful swap", async function () {
            await weth.connect(user).approve(fireSale.address, amountToSwap);

            await expect(fireSale.connect(user).swapWETHforFETH(amountToSwap, amountToReceive,[],[]))
                .to.emit(fireSale, "WETHReceived").withArgs(user.address, amountToSwap)
                .and.to.emit(fireSale, "FETHSent").withArgs(user.address, amountToReceive);
        });
    });
});
