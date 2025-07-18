// Load environment variables from .env file
require('dotenv').config();
const { ethers, artifacts } = require("hardhat");
const CHAIN_ID = Number(4337);

let key;
const HARDHAT_PRIVATE_KEY = process.env.PRIVATE_KEY;
if (HARDHAT_PRIVATE_KEY == undefined && PRIVATE_KEY == undefined) {
  throw new Error("HARDHAT_PRIVATE_KEY and PRIVATE_KEY cannot be set at the same time");
}
if (HARDHAT_PRIVATE_KEY != undefined) {
  key = HARDHAT_PRIVATE_KEY;
}
if (PRIVATE_KEY != undefined) {
  key = PRIVATE_KEY;
}
/**
 * Deploys a contract using a raw transaction.
 * @param {string} contractName - The name of the contract for logging.
 * @param {ethers.Wallet} wallet - The wallet to sign and send the transaction.
 * @param {string} bytecode - The contract bytecode.
 * @param {Array} abi - The contract ABI.
 * @param {Array} [args=[]] - The constructor arguments.
 * @returns {Promise<string>} The address of the deployed contract.
 */
async function deployContract(contractName, wallet, bytecode, abi, args = []) {
    console.log(`Deploying ${contractName}...`);

    const iface = new ethers.utils.Interface(abi);
    const deployData = bytecode + iface.encodeDeploy(args).slice(2);

    const nonce = await wallet.getTransactionCount("latest");
    const { baseFeePerGas } = await wallet.provider.getBlock("latest");

    const tx = {
        nonce,
        gasLimit: 4000000, // Increased gas limit for safety
        maxFeePerGas: baseFeePerGas.mul(2),
        maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
        data: deployData,
        type: 2,
        chainId: CHAIN_ID,
    };

    try {
        const signedTx = await wallet.signTransaction(tx);
        const txHash = await wallet.provider.send("eth_sendRawTransaction", [signedTx]);
        console.log(`  > Broadcasted raw transaction: ${txHash}`);

        const receipt = await wallet.provider.waitForTransaction(txHash, 1);
        if (receipt.status === 0) {
            throw new Error(`Transaction failed: ${txHash}`);
        }
        console.log(`  > Contract ${contractName} deployed at: ${receipt.contractAddress}`);
        return receipt.contractAddress;
    } catch (error) {
        console.error(`Failed to deploy ${contractName}:`, error);
        throw error; // Re-throw to stop the script
    }
}

/**
 * Gets the formatted ERC20 balance of an address.
 * @param {ethers.Contract} tokenContract - The ERC20 token contract instance.
 * @param {string} address - The address to check the balance of.
 * @param {number} [decimals=18] - The number of decimals the token uses.
 * @returns {Promise<string>} The formatted balance as a string.
 */
async function getFormattedERC20Balance(tokenContract, address, decimals = 18) {
    const balance = await tokenContract.balanceOf(address);
    return ethers.utils.formatUnits(balance, decimals);
}

async function main() {
    console.log("Starting FireSale Deployment Script");

    // 1. Validate Environment Configuration
    if (!PRIVATE_KEY || !RPC_URL) {
        console.error("Missing environment variables. Please set PRIVATE_KEY and RPC_URL in your .env file.");
        process.exit(1);
    }

    // 2. Setup Provider and Wallet
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`Deploying contracts with wallet: ${wallet.address}`);
    const walletBalance = await provider.getBalance(wallet.address);
    console.log(`Wallet ETH balance: ${ethers.utils.formatEther(walletBalance)} ETH`);

    if (walletBalance.isZero()) {
        console.error("Wallet has no ETH for gas. Please fund the deployer wallet.");
        process.exit(1);
    }

    // 3. Read Contract Artifacts
    console.log("Reading contract artifacts...");
    const contractArtifacts = {
        WBTC: await artifacts.readArtifact("WBTC"),
        WETH: await artifacts.readArtifact("WETH"),
        FireSale: await artifacts.readArtifact("FireSale"),
    };

    // 4. Deploy Token Contracts
    console.log("Deploying token contracts...");
    const wbtcAddress = await deployContract("WBTC", wallet, contractArtifacts.WBTC.bytecode, contractArtifacts.WBTC.abi);
    const wethAddress = await deployContract("WETH", wallet, contractArtifacts.WETH.bytecode, contractArtifacts.WETH.abi);

    const WBTC = new ethers.Contract(wbtcAddress, contractArtifacts.WBTC.abi, wallet);
    const WETH = new ethers.Contract(wethAddress, contractArtifacts.WETH.abi, wallet);

    // 5. Mint Tokens to Deployer Wallet
    // NOTE: This assumes your token contracts have a `mint(address, amount)` function
    // that the deployer wallet is authorized to call.
    console.log("Minting initial supply of tokens to deployer...");
    const mintAmount = ethers.utils.parseUnits("10000", 18); // Mint 10,000 of each
    
    console.log(`Minting ${ethers.utils.formatUnits(mintAmount, 18)} WBTC...`);
    await (await WBTC.mint(wallet.address, mintAmount)).wait();
    
    console.log(`Minting ${ethers.utils.formatUnits(mintAmount, 18)} WETH...`);
    await (await WETH.mint(wallet.address, mintAmount)).wait();
    
    console.log("Tokens minted successfully.");
    console.log(`> Deployer WBTC Balance: ${await getFormattedERC20Balance(WBTC, wallet.address)}`);
    console.log(`> Deployer WETH Balance: ${await getFormattedERC20Balance(WETH, wallet.address)}`);
    
    // 6. Deploy FireSale Contract
    console.log("Deploying FireSale contract...");
    const fireSaleAddress = await deployContract(
        "FireSale",
        wallet,
        contractArtifacts.FireSale.bytecode,
        contractArtifacts.FireSale.abi,
        [wbtcAddress, wethAddress]
    );

    // 7. Fund FireSale Contract with Initial Liquidity
    console.log("Funding FireSale contract with initial liquidity...");
    const liquidityAmount = ethers.utils.parseUnits("1000", 18); // Send 1,000 of each

    console.log(`Transferring ${ethers.utils.formatUnits(liquidityAmount, 18)} WBTC to FireSale...`);
    await (await WBTC.transfer(fireSaleAddress, liquidityAmount)).wait();

    console.log(`Transferring ${ethers.utils.formatUnits(liquidityAmount, 18)} WETH to FireSale...`);
    await (await WETH.transfer(fireSaleAddress, liquidityAmount)).wait();

    // 8. Final Verification
    console.log("Verifying final contract state...");
    const fireSaleWbtcBalance = await getFormattedERC20Balance(WBTC, fireSaleAddress);
    const fireSaleWethBalance = await getFormattedERC20Balance(WETH, fireSaleAddress);
    console.log(`> FireSale WBTC Balance: ${fireSaleWbtcBalance}`);
    console.log(`> FireSale WETH Balance: ${fireSaleWethBalance}`);
    
    if (parseFloat(fireSaleWbtcBalance) === 1000.0 && parseFloat(fireSaleWethBalance) === 1000.0) {
        console.log("Deployment and setup completed successfully!");
    } else {
        console.warn("Warning: Final balances on FireSale contract do not match expected liquidity.");
    }
}

// Execute the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("An unexpected error occurred:", error);
        process.exit(1);
    });