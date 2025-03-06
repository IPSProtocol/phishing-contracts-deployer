import assert from "assert";
import { AddressZero } from "@ethersproject/constants";
import { expect } from "chai";
import hre, { deployments, ethers } from "hardhat";

describe("DelegatecallGuard Integration Tests", function () {
    let user1: any, user2: any;
    const abiCoder = new ethers.utils.AbiCoder();

    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();

        const avatarFactory = await hre.ethers.getContractFactory("TestAvatar");
        const avatar = await avatarFactory.deploy();
        await avatar.deployed();
        console.log("avatar deployed", avatar.address);

        const delayFactory = await hre.ethers.getContractFactory("Delay");
        const delay = await delayFactory.deploy(
            avatar.address,
            avatar.address,
            86400, // cooldown
            0      // expiration
        );
        await delay.deployed();
        console.log("delay deployed", delay.address);
        const delegateCallAccessControlFactory = await hre.ethers.getContractFactory("DelegatecallAccessControl");
        const delegateCallAccessControlModule = await delegateCallAccessControlFactory.deploy(
            avatar.address,
            delay.address
        );
        await delegateCallAccessControlModule.deployed();
        console.log("delegateCallAccessControlModule deployed", delegateCallAccessControlModule.address);

        const setGuardTx = await avatar.populateTransaction.setGuard(delegateCallAccessControlModule.address);
        await expect(
            avatar.execTransactionFromModule(avatar.address, 0, setGuardTx.data, 0)
        ).not.to.be.reverted;

        return {
            avatar,
            delay,
            delegateCallAccessControlModule
        };
    });

    // Get signers once before all tests (good for cases where you want the same addresses across all tests)
    before(async () => {
        [user1, user2] = await ethers.getSigners();
    });

    describe("Authorization Management", function () {
        it("should authorize a batch of addresses and finalize the transaction", async function () {
            const { avatar, delay, delegateCallAccessControlModule } = await setupTests();
            const authorizedTargets = [user1.address, user2.address];
            console.log("authorizedTargets", authorizedTargets);

            const tx = await delegateCallAccessControlModule.requestBatchAuthorization(authorizedTargets);
            console.log("tx", tx);
            
            let res = await tx.wait();
            console.log("tx", res);

            await expect(tx).to.emit(delegateCallAccessControlModule, "BatchAuthorizationRequested").withArgs(authorizedTargets);

            // Check not authorized yet
            for (const target of authorizedTargets) {
                expect(await delegateCallAccessControlModule.authorizedAddresses(target)).to.be.false;
            }

            // Fast forward time and finalize via Delay
            await ethers.provider.send("evm_increaseTime", [86401]);

            const data = delegateCallAccessControlModule.interface.encodeFunctionData(
                "confirmBatchAuthorization",
                [authorizedTargets]
            );

            await delay.executeNextTx(
                delegateCallAccessControlModule.address,
                0,
                data,
                0 // Call
            );

            // Ensure the event is emitted after confirmation
            await expect(delegateCallAccessControlModule.confirmBatchAuthorization(authorizedTargets))
                .to.emit(delegateCallAccessControlModule, "BatchAddressAuthorized")
                .withArgs(authorizedTargets);

            // Confirm they are now authorized
            for (const target of authorizedTargets) {
                expect(await delegateCallAccessControlModule.authorizedAddresses(target)).to.be.true;
            }
        });

        it("should deauthorize addresses immediately after owner consensus", async function () {
            const { delegateCallAccessControlModule } = await setupTests();
            const authorizedTargets = [user1.address, user2.address];

            // Authorize and confirm
            await delegateCallAccessControlModule.requestBatchAuthorization(authorizedTargets);
            await ethers.provider.send("evm_increaseTime", [86401]);
            await delegateCallAccessControlModule.confirmBatchAuthorization(authorizedTargets);

            // Confirm they are authorized
            for (const target of authorizedTargets) {
                expect(await delegateCallAccessControlModule.authorizedAddresses(target)).to.be.true;
            }

            // Deauthorize directly
            const tx = await delegateCallAccessControlModule.requestBatchDeauthorization(authorizedTargets);
            await expect(tx).to.emit(delegateCallAccessControlModule, "BatchAddressRemoved").withArgs(authorizedTargets);

            // Confirm they are no longer authorized
            for (const target of authorizedTargets) {
                expect(await delegateCallAccessControlModule.authorizedAddresses(target)).to.be.false;
            }
        });

        it("should revert on delegatecall to unauthorized address", async function () {
            const { delegateCallAccessControlModule } = await setupTests();
            const unauthorizedAddress = AddressZero;

            await expect(
                delegateCallAccessControlModule.checkTransaction(
                    unauthorizedAddress,
                    0,
                    "0x",
                    1, // delegatecall
                    0, 0, 0,
                    AddressZero,
                    AddressZero,
                    "0x",
                    user1.address
                )
            ).to.be.revertedWith("Target address not authorized for delegatecall");
        });

        it("should allow regular calls to unauthorized addresses", async function () {
            const { delegateCallAccessControlModule } = await setupTests();
            const unauthorizedAddress = AddressZero;

            await delegateCallAccessControlModule.checkTransaction(
                unauthorizedAddress,
                0,
                "0x",
                0, // regular call
                0, 0, 0,
                AddressZero,
                AddressZero,
                "0x",
                user1.address
            );
        });

        it("should allow delegatecall after authorization", async function () {
            const { delegateCallAccessControlModule, delay } = await setupTests();
            const authorizedAddress = user1.address;

            await delegateCallAccessControlModule.requestBatchAuthorization([authorizedAddress]);
            await ethers.provider.send("evm_increaseTime", [86401]);

            const data = delegateCallAccessControlModule.interface.encodeFunctionData(
                "confirmBatchAuthorization",
                [[authorizedAddress]]
            );

            await delay.executeNextTx(
                delegateCallAccessControlModule.address,
                0,
                data,
                0
            );

            expect(await delegateCallAccessControlModule.authorizedAddresses(authorizedAddress)).to.be.true;

            await delegateCallAccessControlModule.checkTransaction(
                authorizedAddress,
                0,
                "0x",
                1, // delegatecall
                0, 0, 0,
                AddressZero,
                AddressZero,
                "0x",
                user1.address
            );
        });

        it("should deauthorize an address and block future delegatecalls", async function () {
            const { delegateCallAccessControlModule } = await setupTests();
            const authorizedAddress = user1.address;

            await delegateCallAccessControlModule.requestBatchAuthorization([authorizedAddress]);
            await ethers.provider.send("evm_increaseTime", [86401]);
            await delegateCallAccessControlModule.confirmBatchAuthorization([authorizedAddress]);

            expect(await delegateCallAccessControlModule.authorizedAddresses(authorizedAddress)).to.be.true;

            await delegateCallAccessControlModule.requestBatchDeauthorization([authorizedAddress]);

            expect(await delegateCallAccessControlModule.authorizedAddresses(authorizedAddress)).to.be.false;

            await expect(
                delegateCallAccessControlModule.checkTransaction(
                    authorizedAddress,
                    0,
                    "0x",
                    1, // delegatecall
                    0, 0, 0,
                    AddressZero,
                    AddressZero,
                    "0x",
                    user1.address
                )
            ).to.be.revertedWith("Target address not authorized for delegatecall");
        });
    });
});
