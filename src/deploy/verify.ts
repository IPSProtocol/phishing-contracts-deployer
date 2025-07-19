import { HardhatRuntimeEnvironment } from "hardhat/types";

interface ContractVerificationData {
    address: string;
    constructorArguments: any[];
}

/**
 * Verifies a list of contracts on Etherscan-like explorers.
 * @param hre The Hardhat Runtime Environment.
 * @param contracts An array of objects, each with the contract address and constructor arguments.
 */
export async function verifyContracts(hre: HardhatRuntimeEnvironment, contracts: ContractVerificationData[]) {
    const { run, network } = hre;

    if (network.name === "hardhat" || network.name === "localhost") {
        console.log(`Skipping verification on local network '${network.name}'.`);
        return;
    }

    if (!process.env.ETHERSCAN_API_KEY) {
        console.log("ETHERSCAN_API_KEY not found in .env, skipping verification.");
        return;
    }

    console.log("\n--- Starting Etherscan Verification ---");
    console.log(`Verifying ${contracts.length} contract(s) on ${network.name}...`);
    
    // It's better to wait a bit for Etherscan to index the transactions.
    await new Promise((resolve) => setTimeout(resolve, 60000)); 

    for (const contract of contracts) {
        console.log(`\nVerifying contract at ${contract.address}...`);
        try {
            await run("verify:verify", {
                address: contract.address,
                constructorArguments: contract.constructorArguments,
            });
            console.log(` > Successfully verified contract at ${contract.address}`);
        } catch (error: any) {
            if (error.message.toLowerCase().includes("already verified")) {
                console.log(` > Contract at ${contract.address} is already verified.`);
            } else {
                console.error(` > Verification failed for contract at ${contract.address}:`, error);
            }
        }
    }
    console.log("\n--- Verification Complete ---");
}
