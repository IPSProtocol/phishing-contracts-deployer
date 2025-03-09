import { AddressZero } from "@ethersproject/constants";
import { expect } from "chai";
import hre, { deployments, ethers } from "hardhat";



describe("Delay Contract Tests", function () {
    let authorizationDelayModule: any
    let owner: any;
    let authorizationDelay = 86400;
    before(async () => {
        [owner] = await ethers.getSigners();
        const DelayFactory = await ethers.getContractFactory("Delay");
        authorizationDelayModule = await DelayFactory.deploy(
            owner.address,
            owner.address,
            owner.address,
            authorizationDelay,
            0
        );


    });

    it("should set up the authorization delay module correctly", async function () {
        expect((await authorizationDelayModule.txCooldown()).toString()).to.eq(authorizationDelay.toString());
        expect((await authorizationDelayModule.txExpiration()).toString()).to.equal("0");
    });

});



describe("delegatecallGuard Integration Tests", function () {
    let user1: any, user2: any;
    let authorizationDelay = 86400;
    let deauthorizationDelay = 1400;
    const deployContractsAndSetupGuardWithoutDelay = deployments.createFixture(async () => {

        const DummyFactory = await hre.ethers.getContractFactory("Dummy");
        const dummy = await DummyFactory.deploy();
        await dummy.deployed();


        const avatarFactory = await hre.ethers.getContractFactory("TestAvatar");
        const avatar = await avatarFactory.deploy();
        await avatar.deployed();




        const DelegatecallGuardFactory = await hre.ethers.getContractFactory("DelegatecallGuard");
        const delegatecallGuard = await DelegatecallGuardFactory.deploy(
            avatar.address,
            avatar.address, // authorization manager
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000"
        );
        await delegatecallGuard.deployed();


        const setGuardData = avatar.interface.encodeFunctionData("setGuard", [delegatecallGuard.address]);
        // Call execTransaction from the owner to set the guard
        await callExecTransaction(avatar, avatar, setGuardData);

        // expect the guard address to be set correctly.
        expect(await avatar.getGuardAddress()).to.equal(delegatecallGuard.address);

        return {
            avatar,
            delegatecallGuard,
            dummy
        };
    });
    const deployContractsAndSetupDelayModuleAndGuard = deployments.createFixture(async () => {

        const DummyFactory = await hre.ethers.getContractFactory("Dummy");
        const dummy = await DummyFactory.deploy();
        await dummy.deployed();


        const avatarFactory = await hre.ethers.getContractFactory("TestAvatar");
        const avatar = await avatarFactory.deploy();
        await avatar.deployed();


        const delayFactory = await hre.ethers.getContractFactory("Delay");
        const authorizationDelayModule = await delayFactory.deploy(
            avatar.address,
            avatar.address,
            avatar.address,
            authorizationDelay, // cooldown
            0      // expiration
        );
        await authorizationDelayModule.deployed();

        const deauthorizationDelayModule = await delayFactory.deploy(
            avatar.address,
            avatar.address,
            avatar.address,
            deauthorizationDelay,
            0
        );
        await deauthorizationDelayModule.deployed();

        //enable the delay modules on the avatar
        await (await avatar.enableModule(authorizationDelayModule.address)).wait();
        await (await avatar.enableModule(deauthorizationDelayModule.address)).wait();


        const DelegatecallGuardFactory = await hre.ethers.getContractFactory("DelegatecallGuard");
        const delegatecallGuard = await DelegatecallGuardFactory.deploy(
            avatar.address,
            avatar.address, // authorization manager
            authorizationDelayModule.address,
            deauthorizationDelayModule.address
        );
        await delegatecallGuard.deployed();

        const enableGuardData = authorizationDelayModule.interface.encodeFunctionData("enableModule", [delegatecallGuard.address]);
        //enable the Guard on the avatar
        await callExecTransaction(avatar, authorizationDelayModule, enableGuardData);
        await callExecTransaction(avatar, deauthorizationDelayModule, enableGuardData);

        // Enable the delays on avatar after deployment

        const enableAuthModuleData = authorizationDelayModule.interface.encodeFunctionData("enableModule", [authorizationDelayModule.address]);
        const enableDeauthModuleData = authorizationDelayModule.interface.encodeFunctionData("enableModule", [authorizationDelayModule.address]);

        await callExecTransaction(avatar, avatar, enableAuthModuleData);
        await callExecTransaction(avatar, avatar, enableDeauthModuleData);

        expect(await avatar.isModuleEnabled(authorizationDelayModule.address)).to.equal(true);
        expect(await avatar.isModuleEnabled(deauthorizationDelayModule.address)).to.equal(true);

        const setGuardData = avatar.interface.encodeFunctionData("setGuard", [delegatecallGuard.address]);

        // Call execTransaction from the owner to set the guard
        await callExecTransaction(avatar, avatar, setGuardData);

        // expect the guard address to be set correctly.
        expect(await avatar.getGuardAddress()).to.equal(delegatecallGuard.address);



        return {
            avatar,
            authorizationDelayModule,
            deauthorizationDelayModule,
            delegatecallGuard,
            dummy
        };
    });

    const deploySetupAndAuthorize = deployments.createFixture(async () => {

        const { avatar, authorizationDelayModule,deauthorizationDelayModule, delegatecallGuard, dummy } = await deployContractsAndSetupDelayModuleAndGuard();
        const authorizedTargets = [user1.address, user2.address, dummy.address];


        // Prepare the transaction data for requestBatchAuthorization
        const requestBatchAuthorizationData = delegatecallGuard.interface.encodeFunctionData("requestBatchAuthorization", [authorizedTargets]);

        // Call execTransaction from the avatar to request batch authorization
        await callExecTransaction(avatar, delegatecallGuard, requestBatchAuthorizationData);

        // Check not authorized yet
        for (const target of authorizedTargets) {
            expect(await delegatecallGuard.isAuthorized(target)).to.be.false;
        }

        // Fast forward time and finalize via Delay
        await ethers.provider.send("evm_increaseTime", [authorizationDelay + 1]);

        // Prepare the transaction data for confirmBatchAuthorization
        const confirmBatchAuthorizationData = delegatecallGuard.interface.encodeFunctionData("confirmBatchAuthorization", [authorizedTargets]);

        // Call executeNextTx directly on the authorizationDelayModule
        const executeNextTxResponse = await authorizationDelayModule.executeNextTx(
            delegatecallGuard.address, // to
            0,                          // value
            confirmBatchAuthorizationData, // data
            0                           // operation
        );
        await executeNextTxResponse.wait();

        // Confirm they are now authorized
        for (const target of authorizedTargets) {
            expect(await delegatecallGuard.isAuthorized(target)).to.be.true;
        }
        return {
            avatar,
            authorizationDelayModule,
            deauthorizationDelayModule,
            delegatecallGuard,
            dummy
        };
    });

    // Get signers once before all tests
    before(async () => {
        [user1, user2] = await ethers.getSigners();
    });

    describe("Authorization Management", function () {
        it("test deployContractsAndSetupDelayModuleAndGuard fixture", async function () {

            const DummyFactory = await hre.ethers.getContractFactory("Dummy");
            const dummy = await DummyFactory.deploy();
            await dummy.deployed();


            const avatarFactory = await hre.ethers.getContractFactory("TestAvatar");
            const avatar = await avatarFactory.deploy();
            await avatar.deployed();


            const delayFactory = await hre.ethers.getContractFactory("Delay");
            const authorizationDelayModule = await delayFactory.deploy(
                avatar.address,
                avatar.address,
                avatar.address,
                authorizationDelay, // cooldown
                0      // expiration
            );
            await authorizationDelayModule.deployed();

            const deauthorizationDelayModule = await delayFactory.deploy(
                avatar.address,
                avatar.address,
                avatar.address,
                deauthorizationDelay,
                0
            );
            await deauthorizationDelayModule.deployed();

            //enable the delay modules on the avatar
            await (await avatar.enableModule(authorizationDelayModule.address)).wait();
            await (await avatar.enableModule(deauthorizationDelayModule.address)).wait();


            const DelegatecallGuardFactory = await hre.ethers.getContractFactory("DelegatecallGuard");
            const delegatecallGuard = await DelegatecallGuardFactory.deploy(
                avatar.address,
                avatar.address, // authorization manager
                authorizationDelayModule.address,
                deauthorizationDelayModule.address
            );
            await delegatecallGuard.deployed();

            const enableGuardAuthData = authorizationDelayModule.interface.encodeFunctionData("enableModule", [delegatecallGuard.address]);
            const enableGuardDeauthData = deauthorizationDelayModule.interface.encodeFunctionData("enableModule", [delegatecallGuard.address]);
            //enable the Guard on the avatar
            await callExecTransaction(avatar, authorizationDelayModule, enableGuardAuthData);
            await callExecTransaction(avatar, deauthorizationDelayModule, enableGuardDeauthData);

            // Enable the delays on avatar after deployment

            const enableAuthModuleData = authorizationDelayModule.interface.encodeFunctionData("enableModule", [authorizationDelayModule.address]);
            const enableDeauthModuleData = authorizationDelayModule.interface.encodeFunctionData("enableModule", [deauthorizationDelayModule.address]);

            // Call execTransaction from the itself to set 
            await callExecTransaction(avatar, avatar, enableAuthModuleData);
            await callExecTransaction(avatar, avatar, enableDeauthModuleData);

            expect(await avatar.isModuleEnabled(authorizationDelayModule.address)).to.equal(true);
            expect(await avatar.isModuleEnabled(deauthorizationDelayModule.address)).to.equal(true);

            const setGuardData = avatar.interface.encodeFunctionData("setGuard", [delegatecallGuard.address]);

            // Call execTransaction from the owner to set the guard
            await callExecTransaction(avatar, avatar, setGuardData);

            // expect the guard address to be set correctly.
            expect(await avatar.getGuardAddress()).to.equal(delegatecallGuard.address);




        });
        it("should authorize a batch of addresses and finalize the tx without delay. Also deauthorize the same batch of addresses", async function () {
            const { avatar, delegatecallGuard } = await deployContractsAndSetupGuardWithoutDelay();
            const authorizedTargets = [user1.address, user2.address];


            // Prepare the transaction data for requestBatchAuthorization
            const requestBatchAuthorizationData = delegatecallGuard.interface.encodeFunctionData("requestBatchAuthorization", [authorizedTargets]);

            // Call execTransaction from the avatar to request batch authorization
            await callExecTransaction(avatar, delegatecallGuard, requestBatchAuthorizationData);

            // Check not authorized yet
            for (const target of authorizedTargets) {
                expect(await delegatecallGuard.isAuthorized(target)).to.be.true;
            }

            // Prepare the transaction data for requestBatchAuthorization
            const requestBatchDeauthorizationData = delegatecallGuard.interface.encodeFunctionData("requestBatchDeauthorization", [authorizedTargets]);

            // Call execTransaction from the avatar to request batch authorization
            await callExecTransaction(avatar, delegatecallGuard, requestBatchDeauthorizationData);

            // Check not authorized yet
            for (const target of authorizedTargets) {
                expect(await delegatecallGuard.isAuthorized(target)).to.be.false;
            }


        });

        it("should authorize a batch of addresses and finalize the transaction with delay", async function () {
            const { avatar, authorizationDelayModule, delegatecallGuard } = await deployContractsAndSetupDelayModuleAndGuard();
            const authorizedTargets = [user1.address, user2.address];


            // Prepare the transaction data for requestBatchAuthorization
            const requestBatchAuthorizationData = delegatecallGuard.interface.encodeFunctionData("requestBatchAuthorization", [authorizedTargets]);

            // Call execTransaction from the avatar to request batch authorization
            await callExecTransaction(avatar, delegatecallGuard, requestBatchAuthorizationData);

            // // Check not authorized yet
            for (const target of authorizedTargets) {
                expect(await delegatecallGuard.isAuthorized(target)).to.be.false;
            }

            // // Fast forward time and finalize via Delay
            await ethers.provider.send("evm_increaseTime", [authorizationDelay + 1]);

            // // Prepare the transaction data for confirmBatchAuthorization
            const confirmBatchAuthorizationData = delegatecallGuard.interface.encodeFunctionData("confirmBatchAuthorization", [authorizedTargets]);

            // // Call executeNextTx directly on the authorizationDelayModule
            const executeNextTxResponse = await authorizationDelayModule.executeNextTx(
                delegatecallGuard.address, // to
                0,                          // value
                confirmBatchAuthorizationData, // data
                0                           // operation
            );
            await executeNextTxResponse.wait();

            // Confirm they are now authorized
            for (const target of authorizedTargets) {
                expect(await delegatecallGuard.isAuthorized(target)).to.be.true;
            }
        });

        it("should deauthorize after delay when deauthorization delay is set", async function () {
            const { avatar, deauthorizationDelayModule, delegatecallGuard } = await deploySetupAndAuthorize();

            const authorizedTargets = [user1.address, user2.address];


            // Prepare the transaction data for requestBatchAuthorization
            const requestBatchDeauthorizationData = delegatecallGuard.interface.encodeFunctionData("requestBatchDeauthorization", [authorizedTargets]);

            // Call execTransaction from the avatar to request batch authorization
            await callExecTransaction(avatar, delegatecallGuard, requestBatchDeauthorizationData);

            // Check not authorized yet
            for (const target of authorizedTargets) {
                expect(await delegatecallGuard.isAuthorized(target)).to.be.true;
            }

            // Fast forward time and finalize via Delay
            await ethers.provider.send("evm_increaseTime", [deauthorizationDelay + 1]);

            // Prepare the transaction data for confirmBatchAuthorization
            const confirmBatchDeauthorizationData = delegatecallGuard.interface.encodeFunctionData("confirmBatchDeauthorization", [authorizedTargets]);

            // Call executeNextTx directly on the authorizationDelayModule
            const executeNextTxResponse = await deauthorizationDelayModule.executeNextTx(
                delegatecallGuard.address, // to
                0,                          // value
                confirmBatchDeauthorizationData, // data
                0                           // operation
            );
            await executeNextTxResponse.wait();

            // Check they are now deauthorized
            for (const target of authorizedTargets) {
                expect(await delegatecallGuard.isAuthorized(target)).to.be.false;
            }


        });

        it("should revert on delegatecall to unauthorized address", async function () {
            const { avatar, dummy } = await deployContractsAndSetupDelayModuleAndGuard();
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
            const { avatar, dummy } = await deployContractsAndSetupDelayModuleAndGuard();
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
