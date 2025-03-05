import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

describe("DelegateCallAccessControl Integration Tests", function () {
  let delegateCallAccessControl: any;
  let delay: any;
  let mockSafe: any;
  let owner: any;
  let user: any;
  let authorizedTargets: any[];
  const cooldownPeriod = 86400; // 1 day in seconds
  const expirationPeriod = 0; // No expiration
  const dummyAddress = "0x0000000000000000000000000000000000000001"; // Dummy address for testing

  // Mock Safe implementation for testing
  async function deployMockSafe() {
    const MockSafeFactory = await hre.ethers.getContractFactory("MockSafe");
    return await MockSafeFactory.deploy();
  }

  beforeEach(async function () {
    // Get signers
    [owner, user] = await hre.ethers.getSigners();
    authorizedTargets = [user.address, (await hre.ethers.getSigners())[2].address, (await hre.ethers.getSigners())[3].address];

    // Deploy the mock Safe contract
    mockSafe = await deployMockSafe();

    // Deploy the Delay contract
    const DelayFactory = await hre.ethers.getContractFactory("Delay");
    delay = await DelayFactory.deploy(
      owner.address,
      mockSafe.address,
      mockSafe.address,
      cooldownPeriod,
      expirationPeriod
    );

    // Deploy the DelegateCallAccessControl contract
    const DelegateCallAccessControlFactory = await hre.ethers.getContractFactory("DelegatecallAccessControl");
    delegateCallAccessControl = await DelegateCallAccessControlFactory.deploy(
      mockSafe.address, // Set the owner to the mockSafe address
      delay.address
    );

    // Set the DelegateCallAccessControl as a guard on the mock Safe
    await mockSafe.setGuard(delegateCallAccessControl.address);
  });

  describe("Authorization Management", function () {
    it("Should authorize a batch of addresses and finalize the transaction", async function () {
      // Request authorization for a batch of 3 addresses
      const tx = await delegateCallAccessControl.requestBatchAuthorization(authorizedTargets);
      
      // Check that the AuthorizationRequested event was emitted
      await expect(tx)
        .to.emit(delegateCallAccessControl, "BatchAuthorizationRequested")
        .withArgs(authorizedTargets);

      // Check that these addresses haven't been added yet
      for (const target of authorizedTargets) {
        expect(await delegateCallAccessControl.authorizedAddresses(target)).to.be.false;
      }

      // Simulate time passing
      await time.increase(cooldownPeriod + 1);

      // Check that these addresses still haven't been added yet
      for (const target of authorizedTargets) {
        expect(await delegateCallAccessControl.authorizedAddresses(target)).to.be.false;
      }

      // Finalize the transaction via the Delay module
      const selector = delegateCallAccessControl.interface.getFunction("confirmBatchAuthorization").selector;
      const data = selector + authorizedTargets.map(addr => addr.slice(2).padStart(64, '0')).join('');

      await delay.executeNextTx(
        delegateCallAccessControl.address,
        0,
        data,
        0 // Call operation
      );

      // Ensure that the BatchAddressAuthorized event is emitted
      await expect(delegateCallAccessControl.confirmBatchAuthorization(authorizedTargets))
        .to.emit(delegateCallAccessControl, "BatchAddressAuthorized")
        .withArgs(authorizedTargets);

      // Check that the addresses are now authorized
      for (const target of authorizedTargets) {
        expect(await delegateCallAccessControl.authorizedAddresses(target)).to.be.true;
      }
    });

    it("Should deauthorize the previously authorized addresses", async function () {
      // First, authorize the addresses
      await delegateCallAccessControl.requestBatchAuthorization(authorizedTargets);
      const selector = delegateCallAccessControl.interface.getFunction("confirmBatchAuthorization").selector;
      const data = selector + authorizedTargets.map(addr => addr.slice(2).padStart(64, '0')).join('');
      await delay.executeNextTx(delegateCallAccessControl.address, 0, data, 0);

      // Now request to deauthorize them
      const deauthorizeTx = await delegateCallAccessControl.requestBatchDeauthorization(authorizedTargets);

      // Check that the BatchDeAuthorizationRequested event was emitted
      await expect(deauthorizeTx)
        .to.emit(delegateCallAccessControl, "BatchDeAuthorizationRequested")
        .withArgs(authorizedTargets);

      // Check that the addresses are still authorized (not yet removed)
      for (const target of authorizedTargets) {
        expect(await delegateCallAccessControl.authorizedAddresses(target)).to.be.true;
      }

      // Directly remove the addresses
      await delegateCallAccessControl.requestBatchDeauthorization(authorizedTargets);

      // Check that the addresses are now deauthorized
      for (const target of authorizedTargets) {
        expect(await delegateCallAccessControl.authorizedAddresses(target)).to.be.false;
      }
    });

    it("Should revert on delegate call to an unauthorized address", async function () {
      const operation = 1; // Delegatecall operation
      const value = 0;
      const data = "0x"; // No data for this test

      // Attempt to make a delegate call to the unauthorized address
      await expect(
        delegateCallAccessControl.checkTransaction(
          dummyAddress, value, data, operation, 0, 0, 0, hre.ethers.ZeroAddress, hre.ethers.ZeroAddress, "0x", owner.address
        )
      ).to.be.revertedWith("Target address not authorized for delegatecall");
    });

    it("Should allow normal calls to an unauthorized address", async function () {
      const operation = 0; // Call operation
      const value = 0;
      const data = "0x"; // No data for this test

      // This should not revert
      await delegateCallAccessControl.checkTransaction(
        dummyAddress, value, data, operation, 0, 0, 0, hre.ethers.ZeroAddress, hre.ethers.ZeroAddress, "0x", owner.address
      );
    });

    it("Should authorize a dummy address and allow delegate calls", async function () {
      // Request authorization for the dummy address
      await delegateCallAccessControl.requestBatchAuthorization([dummyAddress]);

      // Simulate time passing
      await time.increase(cooldownPeriod + 1);

      // Finalize the transaction via the Delay module
      const selector = delegateCallAccessControl.interface.getFunction("confirmBatchAuthorization").selector;
      const data = selector + dummyAddress.slice(2).padStart(64, '0');

      await delay.executeNextTx(
        delegateCallAccessControl.address,
        0,
        data,
        0 // Call operation
      );

      // Check that the dummy address is now authorized
      expect(await delegateCallAccessControl.authorizedAddresses(dummyAddress)).to.be.true;

      // Attempt to make a delegate call to the authorized address
      const operation = 1; // Delegatecall operation
      await delegateCallAccessControl.checkTransaction(
        dummyAddress, 0, "0x", operation, 0, 0, 0, hre.ethers.ZeroAddress, hre.ethers.ZeroAddress, "0x", owner.address
      );
    });

    it("Should deauthorize the dummy address and ensure it cannot be called again", async function () {
      // Deauthorize the dummy address
      await delegateCallAccessControl.requestBatchDeauthorization([dummyAddress]);

      // Check that the BatchDeAuthorizationRequested event was emitted
      await expect(delegateCallAccessControl.requestBatchDeauthorization([dummyAddress]))
        .to.emit(delegateCallAccessControl, "BatchAddressRemoved")
        .withArgs([dummyAddress]);

      // Check that the address is now deauthorized
      expect(await delegateCallAccessControl.authorizedAddresses(dummyAddress)).to.be.false;

      // Attempt to make a delegate call to the deauthorized address
      const operation = 1; // Delegatecall operation
      await expect(
        delegateCallAccessControl.checkTransaction(
          dummyAddress, 0, "0x", operation, 0, 0, 0, hre.ethers.ZeroAddress, hre.ethers.ZeroAddress, "0x", owner.address
        )
      ).to.be.revertedWith("Target address not authorized for delegatecall");
    });
  });
}); 