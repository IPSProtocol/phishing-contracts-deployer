import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("DelegateCallAccessControl", function () {
  // Test variables
  let delegateCallAccessControl: any;
  let delay: any;
  let mockSafe: any;
  let owner: any;
  let user: any;
  let authorizedTarget: any;
  let unauthorizedTarget: any;
  const cooldownPeriod = 86400; // 1 day in seconds
  const expirationPeriod = 0; // No expiration

  // Mock Safe implementation for testing
  async function deployMockSafe() {
    const MockSafeFactory = await hre.ethers.getContractFactory("MockSafe");
    return await MockSafeFactory.deploy();
  }

  beforeEach(async function () {
    // Get signers
    [owner, user, authorizedTarget, unauthorizedTarget] = await hre.ethers.getSigners();

    // Deploy the mock Safe contract
    mockSafe = await deployMockSafe();

    // Deploy the Delay contract
    const DelayFactory = await hre.ethers.getContractFactory("Delay");
    delay = await DelayFactory.deploy(
      owner.address,
      mockSafe.target,
      mockSafe.target,
      cooldownPeriod,
      expirationPeriod
    );

    // Deploy the DelegateCallAccessControl contract
    const DelegateCallAccessControlFactory = await hre.ethers.getContractFactory("DelegateCallAccessControl");
    delegateCallAccessControl = await DelegateCallAccessControlFactory.deploy(
      owner.address,
      mockSafe.target,
      mockSafe.target,
      delay.target
    );

    // Enable the DelegateCallAccessControl as a module on the Delay contract
    await delay.enableModule(delegateCallAccessControl.target);
  });

  describe("Authorization Management", function () {
    it("Should allow owners to request authorization for a new address", async function () {
      // Create mock signatures that would pass the Safe's checkSignatures
      const mockSignatures = "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
      
      // Request authorization
      const tx = await delegateCallAccessControl.requestAuthorization(authorizedTarget.address, mockSignatures);
      
      // Get the authorization hash
      const nonce = await mockSafe.nonce();
      const authHash = await delegateCallAccessControl.getAuthorizationHash(authorizedTarget.address, nonce);
      
      // Check event emission
      await expect(tx)
        .to.emit(delegateCallAccessControl, "AuthorizationRequested")
        .withArgs(authorizedTarget.address, authHash);
      
      // Check that the transaction was queued in the Delay module
      expect(await delay.queueNonce()).to.equal(1);
    });

    it("Should not allow confirming authorization directly", async function () {
      // Try to confirm authorization directly (bypassing the Delay module)
      await expect(
        delegateCallAccessControl.confirmAuthorization(authorizedTarget.address)
      ).to.be.revertedWith("Only callable via Delay module");
    });

    it("Should allow confirming authorization after cooldown period via Delay", async function () {
      // Create mock signatures that would pass the Safe's checkSignatures
      const mockSignatures = "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
      
      // Request authorization
      await delegateCallAccessControl.requestAuthorization(authorizedTarget.address, mockSignatures);
      
      // Increase time to pass the cooldown period
      await time.increase(cooldownPeriod + 1);
      
      // Execute the transaction via the Delay module
      const selector = delegateCallAccessControl.interface.getFunction("confirmAuthorization").selector;
      const data = selector + authorizedTarget.address.slice(2).padStart(64, '0');
      
      await delay.executeNextTx(
        delegateCallAccessControl.target,
        0,
        data,
        0 // Call operation
      );
      
      // Check authorization status
      expect(await delegateCallAccessControl.authorizedAddresses(authorizedTarget.address)).to.be.true;
    });

    it("Should allow removing an authorized address", async function () {
      // Create mock signatures that would pass the Safe's checkSignatures
      const mockSignatures = "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
      
      // Request and confirm authorization
      await delegateCallAccessControl.requestAuthorization(authorizedTarget.address, mockSignatures);
      
      // Increase time to pass the cooldown period
      await time.increase(cooldownPeriod + 1);
      
      // Execute the transaction via the Delay module
      const selector = delegateCallAccessControl.interface.getFunction("confirmAuthorization").selector;
      const data = selector + authorizedTarget.address.slice(2).padStart(64, '0');
      
      await delay.executeNextTx(
        delegateCallAccessControl.target,
        0,
        data,
        0 // Call operation
      );
      
      // Remove authorization
      const removeTx = await delegateCallAccessControl.removeAuthorization(authorizedTarget.address, mockSignatures);
      
      // Check event emission
      await expect(removeTx)
        .to.emit(delegateCallAccessControl, "AddressAuthorizationRemoved")
        .withArgs(authorizedTarget.address);
      
      // Check authorization status
      expect(await delegateCallAccessControl.authorizedAddresses(authorizedTarget.address)).to.be.false;
    });
  });

  describe("Transaction Checking", function () {
    it("Should allow normal calls (operation 0) to any address", async function () {
      // Mock transaction parameters
      const to = unauthorizedTarget.address;
      const value = 0;
      const data = "0x";
      const operation = 0; // Call operation
      
      // This should not revert
      await delegateCallAccessControl.checkTransaction(
        to, value, data, operation, 0, 0, 0, hre.ethers.ZeroAddress, hre.ethers.ZeroAddress, "0x", owner.address
      );
    });

    it("Should block delegatecalls to unauthorized addresses", async function () {
      // Mock transaction parameters
      const to = unauthorizedTarget.address;
      const value = 0;
      const data = "0x";
      const operation = 1; // Delegatecall operation
      
      // This should revert
      await expect(
        delegateCallAccessControl.checkTransaction(
          to, value, data, operation, 0, 0, 0, hre.ethers.ZeroAddress, hre.ethers.ZeroAddress, "0x", owner.address
        )
      ).to.be.revertedWith("Delegatecall to unauthorized address");
    });

    it("Should allow delegatecalls to authorized addresses", async function () {
      // Create mock signatures that would pass the Safe's checkSignatures
      const mockSignatures = "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
      
      // Request and confirm authorization
      await delegateCallAccessControl.requestAuthorization(authorizedTarget.address, mockSignatures);
      
      // Increase time to pass the cooldown period
      await time.increase(cooldownPeriod + 1);
      
      // Execute the transaction via the Delay module
      const selector = delegateCallAccessControl.interface.getFunction("confirmAuthorization").selector;
      const data = selector + authorizedTarget.address.slice(2).padStart(64, '0');
      
      await delay.executeNextTx(
        delegateCallAccessControl.target,
        0,
        data,
        0 // Call operation
      );
      
      // Mock transaction parameters
      const to = authorizedTarget.address;
      const value = 0;
      const txData = "0x";
      const operation = 1; // Delegatecall operation
      
      // This should not revert
      await delegateCallAccessControl.checkTransaction(
        to, value, txData, operation, 0, 0, 0, hre.ethers.ZeroAddress, hre.ethers.ZeroAddress, "0x", owner.address
      );
    });
  });

  describe("Utility Functions", function () {
    it("Should correctly return the list of authorized addresses", async function () {
      // Create mock signatures that would pass the Safe's checkSignatures
      const mockSignatures = "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
      
      // Request and confirm authorization for multiple addresses
      await delegateCallAccessControl.requestAuthorization(authorizedTarget.address, mockSignatures);
      
      // Increase time to pass the cooldown period
      await time.increase(cooldownPeriod + 1);
      
      // Execute the transaction via the Delay module
      const selector = delegateCallAccessControl.interface.getFunction("confirmAuthorization").selector;
      const data = selector + authorizedTarget.address.slice(2).padStart(64, '0');
      
      await delay.executeNextTx(
        delegateCallAccessControl.target,
        0,
        data,
        0 // Call operation
      );
      
      // Request and confirm authorization for another address
      await delegateCallAccessControl.requestAuthorization(owner.address, mockSignatures);
      
      // Increase time to pass the cooldown period
      await time.increase(cooldownPeriod + 1);
      
      // Execute the transaction via the Delay module
      const selector2 = delegateCallAccessControl.interface.getFunction("confirmAuthorization").selector;
      const data2 = selector2 + owner.address.slice(2).padStart(64, '0');
      
      await delay.executeNextTx(
        delegateCallAccessControl.target,
        0,
        data2,
        0 // Call operation
      );
      
      // Get authorized addresses
      const authorizedAddresses = await delegateCallAccessControl.getAuthorizedAddresses();
      
      // Check the list
      expect(authorizedAddresses).to.include(authorizedTarget.address);
      expect(authorizedAddresses).to.include(owner.address);
      expect(authorizedAddresses).to.not.include(unauthorizedTarget.address);
      expect(authorizedAddresses.length).to.equal(2);
    });
  });
}); 