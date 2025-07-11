/**
 * @fileoverview This file contains utility functions for deployment scripts,
 * including wallet/provider setup, contract deployment, and transaction analysis.
 * It is designed to be used in Hardhat scripts.
 */

// Load environment variables from a .env file into process.env
require('dotenv').config();
const { ethers } = require('hardhat');
const fs = require('fs');

// --- Wallet & Provider Setup ---

/**
 * Initializes and returns an ethers Wallet instance based on the environment configuration.
 * It supports using a private key or an encrypted keystore file.
 *
 * @param {ethers.providers.Provider} provider - The ethers provider to connect the wallet to.
 * @returns {Promise<ethers.Wallet>} A promise that resolves to the configured wallet instance.
 * @throws {Error} If wallet configuration (private key or keystore) is missing.
 */
async function initializeWallet(provider) {
    const { KEYSTORE_PATH, KEYSTORE_PASSWORD, GETH_DEV_PK } = process.env;

    if (KEYSTORE_PATH && KEYSTORE_PASSWORD) {
        console.log('Initializing wallet from keystore...');
        try {
            const keystoreJson = fs.readFileSync(KEYSTORE_PATH, 'utf8');
            const wallet = await ethers.Wallet.fromEncryptedJson(keystoreJson, KEYSTORE_PASSWORD);
            return wallet.connect(provider);
        } catch (error) {
            console.error(`Failed to load wallet from keystore at ${KEYSTORE_PATH}.`);
            throw error;
        }
    }

    if (GETH_DEV_PK) {
        console.log('Initializing wallet from private key...');
        return new ethers.Wallet(GETH_DEV_PK, provider);
    }

    throw new Error('Wallet configuration not found. Please set either GETH_DEV_PK or both KEYSTORE_PATH and KEYSTORE_PASSWORD in your .env file.');
}

/**
 * Sets up the provider and wallet for a deployment script.
 * Handles different network configurations (local hardhat vs. live networks).
 *
 * @param {object} hre - The Hardhat Runtime Environment.
 * @returns {Promise<{provider: ethers.providers.Provider, wallet: ethers.Wallet | ethers.Signer}>} An object containing the provider and wallet.
 */
async function setupProviderAndWallet(hre) {
    const provider = hre.ethers.provider;
    const networkName = hre.network.name;

    console.log(`\nSetting up for network: ${networkName}`);

    if (networkName === 'hardhat' || networkName === 'localhost') {
        const [signer] = await hre.ethers.getSigners();
        console.log(`Using Hardhat signer: ${signer.address}`);
        return { provider, wallet: signer };
    }

    const wallet = await initializeWallet(provider);
    console.log(`Using wallet address: ${wallet.address}`);
    
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet balance: ${ethers.utils.formatEther(balance)} ETH`);

    if (balance.isZero()) {
        console.warn('Warning: The wallet has a zero balance. Transactions will likely fail.');
    }

    return { provider, wallet };
}


// --- Contract Deployment ---

/**
 * A generic function to deploy a smart contract.
 *
 * @param {object} options - The deployment options.
 * @param {string} options.contractName - The name of the contract to deploy.
 * @param {ethers.Wallet | ethers.Signer} options.wallet - The wallet to use for deployment.
 * @param {Array} [options.args=[]] - The constructor arguments for the contract.
 * @param {object} [options.libraries={}] - Linked libraries for the contract.
 * @returns {Promise<ethers.Contract>} A promise that resolves to the deployed contract instance.
 */
async function deployContract({ contractName, wallet, args = [], libraries = {} }) {
    console.log(`Deploying ${contractName}...`);

    const ContractFactory = await ethers.getContractFactory(contractName, {
        signer: wallet,
        libraries,
    });

    const contract = await ContractFactory.deploy(...args);
    await contract.deployed();

    console.log(`  > ${contractName} deployed to: ${contract.address}`);
    console.log(`  > Transaction hash: ${contract.deployTransaction.hash}`);

    return contract;
}


// --- On-Chain Analysis & Verification ---

/**
 * Verifies that a contract address is stored at a specific storage slot in another contract.
 * WARNING: This relies on a hardcoded storage slot layout, which can be brittle. Use with caution.
 *
 * @param {object} options - The verification options.
 * @param {ethers.providers.Provider} options.provider - The ethers provider.
 * @param {string} options.contractWithStorageAddress - The address of the contract to check the storage of.
 * @param {string} options.expectedAddress - The address expected to be found in the storage slot.
 * @param {string} options.storageSlot - The storage slot to read from.
 * @returns {Promise<void>}
 */
async function verifyContractLinkAtStorageSlot({ provider, contractWithStorageAddress, expectedAddress, storageSlot }) {
    console.log(`\nVerifying storage at slot ${storageSlot}...`);
    const storedValue = await provider.getStorageAt(contractWithStorageAddress, storageSlot);

    // Address is the last 20 bytes (40 hex characters) of the storage value
    const storedAddress = `0x${storedValue.slice(-40)}`;
    const isMatch = storedAddress.toLowerCase() === expectedAddress.toLowerCase();

    if (isMatch) {
        console.log(`  Success: Found expected address ${expectedAddress} at storage slot.`);
    } else {
        console.error(`  Failure: Mismatch at storage slot.`);
        console.error(`    - Expected: ${expectedAddress}`);
        console.error(`    - Found:    ${storedAddress}`);
    }
}

/**
 * Finds and parses a specific event from a transaction receipt.
 *
 * @param {object} options - The event finding options.
 * @param {ethers.providers.TransactionReceipt} options.receipt - The transaction receipt to search within.
 * @param {string} options.eventName - The name of the event to find.
 * @param {ethers.utils.Interface} options.iface - The contract interface to use for parsing.
 * @returns {ethers.utils.LogDescription | null} The parsed event log or null if not found.
 */
function findEventInReceipt({ receipt, eventName, iface }) {
    for (const log of receipt.logs) {
        try {
            const parsedLog = iface.parseLog(log);
            if (parsedLog.name === eventName) {
                console.log(`\nFound '${eventName}' event:`);
                console.log(parsedLog.args);
                return parsedLog;
            }
        } catch (error) {
            // Ignore logs that don't match the interface
        }
    }
    console.log(`'${eventName}' event not found in transaction.`);
    return null;
}


// --- Logging & Formatting ---

/**
 * A simple logger for creating formatted output in scripts.
 */
const logger = {
    info: (message) => console.log(message),
    success: (message) => console.log(`${message}`),
    error: (message) => console.error(`${message}`),
    separator: () => console.log('\n' + '─'.repeat(50) + '\n'),
    logWallet: async (wallet) => {
        const address = await wallet.getAddress();
        const balance = await wallet.getBalance();
        console.log(`\n--- Wallet Details ---`);
        console.log(`  Address: ${address}`);
        console.log(`  Balance: ${ethers.utils.formatEther(balance)} ETH`);
        console.log(`----------------------`);
    }
};

module.exports = {
    setupProviderAndWallet,
    deployContract,
    verifyContractLinkAtStorageSlot,
    findEventInReceipt,
    logger,
};