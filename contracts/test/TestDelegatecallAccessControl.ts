import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

import Safe, { SafeFactory, PredictedSafeProps } from '@safe-global/protocol-kit'


async function createSafe() {
  // Get signers from Hardhat
  const [owner1, owner2, owner3] = await ethers.getSigners();

  // Create Safe with actual signer addresses
  const predictedSafe: PredictedSafeProps = {
    safeAccountConfig: {
      owners: [owner1.address, owner2.address, owner3.address],
      threshold: 2
    },
    safeDeploymentConfig: {
      saltNonce: '0', 
      safeVersion: '1.3.0'
    }
  };

  // Use the Hardhat provider
  const provider = hre.ethers.provider;

  // Initialize Safe with the first signer
  let protocolKit = await Safe.init({
    provider: provider as any,
    signer: owner1.address,
    predictedSafe
  });

  // you can predict the address of your Safe if the Safe version is `v1.3.0` or above
  const safeAddress = await protocolKit.getAddress();

  const deploymentTransaction = await protocolKit.createSafeDeploymentTransaction();

  // Execute this transaction using the Hardhat provider
  const txResponse = await owner1.sendTransaction({
    to: deploymentTransaction.to,
    value: BigInt(deploymentTransaction.value),
    data: deploymentTransaction.data as `0x${string}`,
    // Use chainId instead of chain
    chainId: (await provider.getNetwork()).chainId
  });

  // Wait for the transaction to be mined
  const txReceipt = await txResponse.wait();

  // Reconnect to the newly deployed Safe using the protocol-kit
  protocolKit = await protocolKit.connect({ safeAddress });

  // Confirm the Safe is deployed and fetch properties
  console.log('Is Safe deployed:', await protocolKit.isSafeDeployed());
  console.log('Safe Address:', await protocolKit.getAddress());
  console.log('Safe Owners:', await protocolKit.getOwners());
  console.log('Safe Threshold:', await protocolKit.getThreshold());
}

describe("DelegateCallAccessControl Integration Tests", function () {
  let delegateCallAccessControlModule: any;
  let delay: any;
  let safe: Safe; // Use Safe type
  let owner: any;
  let user: any;
  let authorizedTargets: any[];
  const cooldownPeriod = 86400; // 1 day in seconds
  const expirationPeriod = 0; // No expiration
  const dummyAddress = "0x0000000000000000000000000000000000000001"; // Dummy address for testing

  // Deploy the Gnosis Safe
  async function deployGnosisSafe() {
    // Use Safe.init to create a SafeFactory
    const safeFactory = await SafeFactory.init({
      provider: hre.ethers.provider as any,
      signer: owner.address // Use signer address
    });

    // Create Safe with safeAccountConfig
    const safe = await safeFactory.deploySafe({
      safeAccountConfig: {
        owners: [owner.address],
        threshold: 1
      }
    });
    return safe;
  }

  // Deploy the Delay module
  async function deployDelayModule() {
    const DelayFactory = await hre.ethers.getContractFactory("Delay");
    const delay = await DelayFactory.deploy(
      safe.getAddress(), // Use the real Safe address
      safe.getAddress(), // Use the real Safe address
      cooldownPeriod,
      expirationPeriod
    );
    await delay.deployed();
    return delay;
  }

  // Deploy the DelegateCallAccessControl contract
  async function deployDelegateCallAccessControlModule() {
    const DelegateCallAccessControlFactory = await hre.ethers.getContractFactory("DelegatecallAccessControl");
    delegateCallAccessControlModule = await DelegateCallAccessControlFactory.deploy(
      safe.getAddress(), // Set the avatar to the real Safe address
      delay.address
    );
    await delegateCallAccessControlModule.deployed();
    return delegateCallAccessControlModule;
  }

  beforeEach(async function () {
    // Get signers
    const signers = await hre.ethers.getSigners();
    owner = signers[0];
    user = signers[1];
    authorizedTargets = [user.address, signers[2].address, signers[3].address];

    // Log the addresses for debugging
    console.log("Owner:", owner.address);
    console.log("User:", user.address);
    console.log("Authorized Targets:", authorizedTargets);

    // Deploy the Gnosis Safe
    safe = await deployGnosisSafe();

    console.log("Safe: ", safe.getAddress());

    // Deploy the Delay contract
    delay = await deployDelayModule();
    console.log("DelayModule: ", delay.address);

    // Deploy the DelegateCallAccessControl contract
    delegateCallAccessControlModule = await deployDelegateCallAccessControlModule();
    console.log("DelegateCallAccessControlModule: ", delegateCallAccessControlModule.address);

    // Set the DelegateCallAccessControl as a guard on the Safe
    await safe.setGuard(delegateCallAccessControlModule.address);
  });

  describe("Authorization Management", function () {
    it("Should authorize a batch of addresses and finalize the transaction", async function () {
      // Request authorization for a batch of 3 addresses
      const tx = await delegateCallAccessControlModule.requestBatchAuthorization(authorizedTargets);

      // Check that the AuthorizationRequested event was emitted
      await expect(tx)
        .to.emit(delegateCallAccessControlModule, "BatchAuthorizationRequested")
        .withArgs(authorizedTargets);

      // Check that these addresses haven't been added yet
      for (const target of authorizedTargets) {
        expect(await delegateCallAccessControlModule.authorizedAddresses(target)).to.be.false;
      }

      // Simulate time passing
      await time.increase(cooldownPeriod + 1);

      // Check that these addresses still haven't been added yet
      for (const target of authorizedTargets) {
        expect(await delegateCallAccessControlModule.authorizedAddresses(target)).to.be.false;
      }

      // Finalize the transaction via the Delay module
      const selector = delegateCallAccessControlModule.interface.getFunction("confirmBatchAuthorization").selector;
      const data = selector + authorizedTargets.map(addr => addr.slice(2).padStart(64, '0')).join('');

      await delay.executeNextTx(
        delegateCallAccessControlModule.address,
        0,
        data,
        0 // Call operation
      );

      // Ensure that the BatchAddressAuthorized event is emitted
      await expect(delegateCallAccessControlModule.confirmBatchAuthorization(authorizedTargets))
        .to.emit(delegateCallAccessControlModule, "BatchAddressAuthorized")
        .withArgs(authorizedTargets);

      // Check that the addresses are now authorized
      for (const target of authorizedTargets) {
        expect(await delegateCallAccessControlModule.authorizedAddresses(target)).to.be.true;
      }
    });

    it("Should deauthorize the previously authorized addresses", async function () {
      // First, authorize the addresses
      await delegateCallAccessControlModule.requestBatchAuthorization(authorizedTargets);
      const selector = delegateCallAccessControlModule.interface.getFunction("confirmBatchAuthorization").selector;
      const data = selector + authorizedTargets.map(addr => addr.slice(2).padStart(64, '0')).join('');
      await delay.executeNextTx(delegateCallAccessControlModule.address, 0, data, 0);

      // Now request to deauthorize them
      const deauthorizeTx = await delegateCallAccessControlModule.requestBatchDeauthorization(authorizedTargets);

      // Check that the BatchDeAuthorizationRequested event was emitted
      await expect(deauthorizeTx)
        .to.emit(delegateCallAccessControlModule, "BatchDeAuthorizationRequested")
        .withArgs(authorizedTargets);

      // Check that the addresses are still authorized (not yet removed)
      for (const target of authorizedTargets) {
        expect(await delegateCallAccessControlModule.authorizedAddresses(target)).to.be.true;
      }

      // Directly remove the addresses
      await delegateCallAccessControlModule.requestBatchDeauthorization(authorizedTargets);

      // Check that the addresses are now deauthorized
      for (const target of authorizedTargets) {
        expect(await delegateCallAccessControlModule.authorizedAddresses(target)).to.be.false;
      }
    });

    it("Should revert on delegate call to an unauthorized address", async function () {
      const operation = 1; // Delegatecall operation
      const value = 0;
      const data = "0x"; // No data for this test

      // Attempt to make a delegate call to the unauthorized address
      await expect(
        delegateCallAccessControlModule.checkTransaction(
          dummyAddress, value, data, operation, 0, 0, 0, hre.ethers.ZeroAddress, hre.ethers.ZeroAddress, "0x", owner.address
        )
      ).to.be.revertedWith("Target address not authorized for delegatecall");
    });

    it("Should allow normal calls to an unauthorized address", async function () {
      const operation = 0; // Call operation
      const value = 0;
      const data = "0x"; // No data for this test

      // This should not revert
      await delegateCallAccessControlModule.checkTransaction(
        dummyAddress, value, data, operation, 0, 0, 0, hre.ethers.ZeroAddress, hre.ethers.ZeroAddress, "0x", owner.address
      );
    });

    it("Should authorize a dummy address and allow delegate calls", async function () {
      // Request authorization for the dummy address
      await delegateCallAccessControlModule.requestBatchAuthorization([dummyAddress]);

      // Simulate time passing
      await time.increase(cooldownPeriod + 1);

      // Finalize the transaction via the Delay module
      const selector = delegateCallAccessControlModule.interface.getFunction("confirmBatchAuthorization").selector;
      const data = selector + dummyAddress.slice(2).padStart(64, '0');

      await delay.executeNextTx(
        delegateCallAccessControlModule.address,
        0,
        data,
        0 // Call operation
      );

      // Check that the dummy address is now authorized
      expect(await delegateCallAccessControlModule.authorizedAddresses(dummyAddress)).to.be.true;

      // Attempt to make a delegate call to the authorized address
      const operation = 1; // Delegatecall operation
      await delegateCallAccessControlModule.checkTransaction(
        dummyAddress, 0, "0x", operation, 0, 0, 0, hre.ethers.ZeroAddress, hre.ethers.ZeroAddress, "0x", owner.address
      );
    });

    it("Should deauthorize the dummy address and ensure it cannot be called again", async function () {
      // Deauthorize the dummy address
      await delegateCallAccessControlModule.requestBatchDeauthorization([dummyAddress]);

      // Check that the BatchDeAuthorizationRequested event was emitted
      await expect(delegateCallAccessControlModule.requestBatchDeauthorization([dummyAddress]))
        .to.emit(delegateCallAccessControlModule, "BatchAddressRemoved")
        .withArgs([dummyAddress]);

      // Check that the address is now deauthorized
      expect(await delegateCallAccessControlModule.authorizedAddresses(dummyAddress)).to.be.false;

      // Attempt to make a delegate call to the deauthorized address
      const operation = 1; // Delegatecall operation
      await expect(
        delegateCallAccessControlModule.checkTransaction(
          dummyAddress, 0, "0x", operation, 0, 0, 0, hre.ethers.ZeroAddress, hre.ethers.ZeroAddress, "0x", owner.address
        )
      ).to.be.revertedWith("Target address not authorized for delegatecall");
    });
  });
}); 