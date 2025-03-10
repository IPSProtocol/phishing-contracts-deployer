import { ethers } from "hardhat";
import { expect } from "chai";

describe("Impersonation and Funding Test", function () {
    let impersonatedAddress = "0xYourImpersonatedAddress"; // Replace with the address you want to impersonate
    let deployer: any;
    let impersonatedSigner: any;

    before(async () => {
        // Get the deployer account
        [deployer] = await ethers.getSigners();

        // Impersonate the address
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [impersonatedAddress],
        });

        // Get the signer for the impersonated address
        impersonatedSigner = await ethers.getSigner(impersonatedAddress);

        // Fund the impersonated address with Ether
        const tx = await deployer.sendTransaction({
            to: impersonatedAddress,
            value: ethers.utils.parseEther("1.0"), // Sending 1 Ether
        });

        // Wait for the transaction to be mined
        await tx.wait();
    });

    it("should have received Ether", async function () {
        const balance = await ethers.provider.getBalance(impersonatedAddress);
        expect(balance).to.equal(ethers.utils.parseEther("1.0")); // Check if the balance is 1 Ether
    });

    after(async () => {
        // Stop impersonating the address
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [impersonatedAddress],
        });
    });
}); 