import { AddressZero } from "@ethersproject/constants";
import { expect } from "chai";
import hre, { deployments, ethers } from "hardhat";



describe("Delay Contract Tests", function () {
    let delayModule: any;
    let owner: any;

    before(async () => {
        [owner] = await ethers.getSigners();
        const DelayFactory = await ethers.getContractFactory("Delay");
        delayModule = await DelayFactory.deploy(
            owner.address,
            owner.address,
            owner.address,
            86400,
            0
        );
        await delayModule.deployed();
    });

    it("should set up the contract correctly", async function () {
        expect((await delayModule.txCooldown()).toString()).to.eq("86400");
        expect((await delayModule.txExpiration()).toString()).to.equal("0");
    });
});



describe("delegatecallGuard Integration Tests", function () {
    let user1: any, user2: any;

    const deployContractsAndSetupModuleAndGuard = deployments.createFixture(async () => {
        // await deployments.fixture();
        const DummyFactory = await hre.ethers.getContractFactory("Dummy");
        const dummy = await DummyFactory.deploy();
        await dummy.deployed();


        const avatarFactory = await hre.ethers.getContractFactory("TestAvatar");
        const avatar = await avatarFactory.deploy();
        await avatar.deployed();


        const delayFactory = await hre.ethers.getContractFactory("Delay");
        const delayModule = await delayFactory.deploy(
            avatar.address,
            avatar.address,
            avatar.address,
            86400, // cooldown
            0      // expiration
        );
        await delayModule.deployed();

        await (await avatar.enableModule(delayModule.address)).wait();


        const DelegatecallGuardFactory = await hre.ethers.getContractFactory("DelegatecallGuard");
        const delegatecallGuard = await DelegatecallGuardFactory.deploy(
            avatar.address,
            delayModule.address
        );
        await delegatecallGuard.deployed();

        //enable the Guard on the DelayModule
        // Enable the module after deployment
        const moduleAddress = delegatecallGuard.address; // Replace with the actual module address
        const enableModuleData = avatar.interface.encodeFunctionData("enableModule", [moduleAddress]);

        // Call execTransaction from the itself to set the guard
        const tx = await callExecTransaction(avatar, delayModule, enableModuleData);

        expect(await delayModule.isModuleEnabled(delegatecallGuard.address)).to.equal(true);

        const setGuardData = avatar.interface.encodeFunctionData("setGuard", [delegatecallGuard.address]);

        // Call execTransaction from the owner to set the guard
        await callExecTransaction(avatar, avatar, setGuardData);
        
        // expect the guard address to be set correctly.
        expect(await avatar.getGuardAddress()).to.equal(delegatecallGuard.address);

        return {
            avatar,
            delayModule,
            delegatecallGuard,
            dummy
        };
    });

    const deploySetupAndAuthorize = deployments.createFixture(async () => {

        const { avatar, delayModule, delegatecallGuard, dummy } = await deployContractsAndSetupModuleAndGuard();
        const authorizedTargets = [user1.address, user2.address, dummy.address];


        // Prepare the transaction data for requestBatchAuthorization
        const requestBatchAuthorizationData = delegatecallGuard.interface.encodeFunctionData("requestBatchAuthorization", [authorizedTargets]);

        // Call execTransaction from the avatar to request batch authorization
        await callExecTransaction(avatar, delegatecallGuard, requestBatchAuthorizationData);

        // Check not authorized yet
        for (const target of authorizedTargets) {
            expect(await delegatecallGuard.authorizedAddresses(target)).to.be.false;
        }

        // Fast forward time and finalize via Delay
        await ethers.provider.send("evm_increaseTime", [86401]);

        // Prepare the transaction data for confirmBatchAuthorization
        const confirmBatchAuthorizationData = delegatecallGuard.interface.encodeFunctionData("confirmBatchAuthorization", [authorizedTargets]);

        // Call executeNextTx directly on the delayModule
        const executeNextTxResponse = await delayModule.executeNextTx(
            delegatecallGuard.address, // to
            0,                          // value
            confirmBatchAuthorizationData, // data
            0                           // operation
        );
        await executeNextTxResponse.wait();

        // Confirm they are now authorized
        for (const target of authorizedTargets) {
            expect(await delegatecallGuard.authorizedAddresses(target)).to.be.true;
        }
        return {
            avatar,
            delayModule,
            delegatecallGuard,
            dummy
        };
    });

    // Get signers once before all tests
    before(async () => {
        [user1, user2] = await ethers.getSigners();
    });

    describe("Authorization Management", function () {
        it("should authorize a batch of addresses and finalize the transaction", async function () {
            const { avatar, delayModule, delegatecallGuard } = await deployContractsAndSetupModuleAndGuard();
            const authorizedTargets = [user1.address, user2.address];


            // Prepare the transaction data for requestBatchAuthorization
            const requestBatchAuthorizationData = delegatecallGuard.interface.encodeFunctionData("requestBatchAuthorization", [authorizedTargets]);

            // Call execTransaction from the avatar to request batch authorization
            await callExecTransaction(avatar, delegatecallGuard, requestBatchAuthorizationData);

            // Check not authorized yet
            for (const target of authorizedTargets) {
                expect(await delegatecallGuard.authorizedAddresses(target)).to.be.false;
            }

            // Fast forward time and finalize via Delay
            await ethers.provider.send("evm_increaseTime", [86401]);

            // Prepare the transaction data for confirmBatchAuthorization
            const confirmBatchAuthorizationData = delegatecallGuard.interface.encodeFunctionData("confirmBatchAuthorization", [authorizedTargets]);

            // Call executeNextTx directly on the delayModule
            const executeNextTxResponse = await delayModule.executeNextTx(
                delegatecallGuard.address, // to
                0,                          // value
                confirmBatchAuthorizationData, // data
                0                           // operation
            );
            await executeNextTxResponse.wait();

            // Confirm they are now authorized
            for (const target of authorizedTargets) {
                expect(await delegatecallGuard.authorizedAddresses(target)).to.be.true;
            }
        });

        it("should deauthorize addresses immediately after owner consensus", async function () {
            const { avatar, delegatecallGuard } = await deploySetupAndAuthorize();

            const authorizedTargets = [user1.address, user2.address];


            // Prepare the transaction data for requestBatchAuthorization
            const requestBatchDeauthorizationData = delegatecallGuard.interface.encodeFunctionData("requestBatchDeauthorization", [authorizedTargets]);

            // Call execTransaction from the avatar to request batch authorization
            await callExecTransaction(avatar, delegatecallGuard, requestBatchDeauthorizationData);

            // Check not authorized yet
            for (const target of authorizedTargets) {
                expect(await delegatecallGuard.authorizedAddresses(target)).to.be.false;
            }

        });

        it("should revert on delegatecall to unauthorized address", async function () {
            const { avatar, dummy } = await deployContractsAndSetupModuleAndGuard();
            const unauthorizedAddress = dummy.address;
            const dummyFunctionData = dummy.interface.encodeFunctionData("dummy", []);

            await expect(
                avatar.execTransaction(
                    unauthorizedAddress,
                    0,
                    dummyFunctionData, // Use an empty byte string instead of an empty string
                    1, // delegatecall
                    0, // safeTxGas
                    0, // base gas
                    0, // gas price
                    "0x0000000000000000000000000000000000000002", // dummy gas token
                    "0x0000000000000000000000000000000000000003", // dummy refund receiver
                    "0x0000000000000000000000000000000000000004" // dummy signatures
                )
            ).to.be.revertedWith("Target address not authorized for delegatecall");
        });

        it("should allow regular calls to unauthorized addresses", async function () {
            const { avatar, dummy } = await deployContractsAndSetupModuleAndGuard();
            const unauthorizedAddress = dummy.address;
            const dummyFunctionData = dummy.interface.encodeFunctionData("dummy", []);

            expect(avatar.execTransaction(
                unauthorizedAddress,
                0,
                dummyFunctionData, // Use an empty byte string instead of an empty string
                0, // call
                0, // safeTxGas
                0, // base gas
                0, // gas price
                "0x0000000000000000000000000000000000000002", // dummy gas token
                "0x0000000000000000000000000000000000000003", // dummy refund receiver
                "0x0000000000000000000000000000000000000004" // dummy signatures
            )).to.not.be.reverted;
        });

        it("should allow delegatecall after authorization", async function () {
            const { avatar, dummy } = await deploySetupAndAuthorize();
            const authorizedAddress = dummy.address;

            const dummyFunctionData = dummy.interface.encodeFunctionData("dummy", []);


            await avatar.execTransaction(
                authorizedAddress,
                0,
                dummyFunctionData, // Use an empty byte string instead of an empty string
                1, // delegatecall
                0, // safeTxGas
                0, // base gas
                0, // gas price
                "0x0000000000000000000000000000000000000002", // dummy gas token
                "0x0000000000000000000000000000000000000003", // dummy refund receiver
                "0x0000000000000000000000000000000000000004" // dummy signatures
            )

        });

    });
});







async function callExecTransaction(avatar: any, to: any, data: any) {
    const txResponse = await avatar.execTransaction(
        to.address, // to
        0,              // value
        data,   // data
        0,              // operation (0 for call)
        0,              // safeTxGas
        0,              // baseGas
        0,              // gasPrice
        AddressZero,    // gasToken
        AddressZero,    // refundReceiver
        "0x"            // signatures
    );
    return await txResponse.wait();

}