import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Contract, ethers, Wallet } from "ethers";
import { verifyContracts } from "../deploy/verify";

const {  SEPOLIA_RPC_URL } = process.env;


async function deployContract(
    hre: HardhatRuntimeEnvironment,
    contractName: string,
    wallet: Wallet | any,
    args: any[] = []
): Promise<Contract> {
    const { ethers } = hre;
    console.log(`Deploying ${contractName}...`);

    const ContractFactory = await ethers.getContractFactory(contractName, wallet);
    const contract = await ContractFactory.deploy(...args);
    await contract.deployed();

    console.log(`  > ${contractName} deployed to: ${contract.address}`);
    
    return contract;
}


async function instantiateContracts(wethAddress: string, fethAddress: string, wbtcAddress: string, deployer: Wallet, hre: HardhatRuntimeEnvironment) {
    let weth: Contract, wbtc: Contract, feth: Contract;

    if (wethAddress) {
        console.log(`Using existing WETH contract at: ${wethAddress}`);
        weth = await hre.ethers.getContractAt("WETH", wethAddress, deployer);
    } else {
        console.log("Deploying new WETH contract...");
        weth = await deployContract(hre, "WETH", deployer);
    }

    if (wbtcAddress) {
        console.log(`Using existing WBTC contract at: ${wbtcAddress}`);
        wbtc = await hre.ethers.getContractAt("WBTC", wbtcAddress, deployer);
    } else {
        console.log("Deploying new WBTC contract...");
        wbtc = await deployContract(hre, "WBTC", deployer);
    }

    if (fethAddress) {
        console.log(`Using existing FETH contract at: ${fethAddress}`);
        feth = await hre.ethers.getContractAt("FETH", fethAddress, deployer);
    } else {
        console.log("Deploying new FETH contract...");
        feth = await deployContract(hre, "FETH", deployer);
    }

    return [weth, wbtc, feth];
}

async function setupWallet(hre: HardhatRuntimeEnvironment) {
    const { ethers, network } = hre;
    let deployer: Wallet | any;
    if (network.name === "hardhat" || network.name === "localhost") {
        [deployer] = await ethers.getSigners();
        console.log(`Using Hardhat signer: ${deployer.address}`);
    } else {
        const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);

        const privateKey = process.env.PRIVATE_KEY;
        const gethPrivateKey = process.env.GETH_PRIVATE_KEY;
        if (!privateKey && !gethPrivateKey) {
            throw new Error(`PRIVATE_KEY or GETH_PRIVATE_KEY not found in .env file. Required for '${network.name}' network.`);
        }
        if (gethPrivateKey != undefined) {
            deployer = new ethers.Wallet(gethPrivateKey, provider);
        } else if (privateKey != undefined) {
            deployer = new ethers.Wallet(privateKey, provider);
        }
        console.log(`Using wallet: ${deployer.address}`);

    }
    return deployer;
}

async function deployAllContracts(deployer: Wallet, amountStr: string, hre: HardhatRuntimeEnvironment) {
    let wethContract: Contract, wbtcContract: Contract, fethContract: Contract;
    let amount = ethers.utils.parseEther(amountStr);
    wethContract = await deployContract(hre, "WETH", deployer, [amount]);


    wbtcContract = await deployContract(hre, "WBTC", deployer, [amount]);


    fethContract = await deployContract(hre, "FETH", deployer, [amount]);


    return [wethContract, wbtcContract, fethContract];
}

async function mintTokens(deployer: any, wethContract: any, wbtcContract: any, fethContract: any, mintAmountStr: string) {
    if (!wethContract || !wbtcContract) {
        console.log("\nMinting new tokens to deployer...");
        const mintAmount = ethers.utils.parseEther(mintAmountStr);

        if (!wethContract) {
            await (await wethContract.mint(deployer.address, mintAmount)).wait();
            console.log(`Minted ${mintAmountStr} WETH to ${deployer.address}`);
        }
        if (!wbtcContract) {
            await (await wbtcContract.mint(deployer.address, mintAmount)).wait();
            console.log(`Minted ${mintAmountStr} WBTC to ${deployer.address}`);
        }
        if (!fethContract) {
            await (await fethContract.mint(deployer.address, mintAmount)).wait();
            console.log(`Minted ${mintAmountStr} WBTC to ${deployer.address}`);
        }
    }
}

async function fundFireSale(deployer: Wallet, wethContract: any, fethContract: any, fireSale: any, fundAmountStr: string) {
    if (wethContract != undefined || fethContract != undefined) {
        console.log("\nFunding FireSale contract with initial liquidity...");
        const fundAmount = ethers.utils.parseEther(fundAmountStr);


        await (await wethContract.connect(deployer).transfer(fireSale.address, fundAmount)).wait();
        console.log(`Transferred ${fundAmountStr} WETH to FireSale contract.`);


        await (await fethContract.connect(deployer).transfer(fireSale.address, fundAmount)).wait();
        console.log(`Transferred ${fundAmountStr} FETH to FireSale contract.`);

    }
}

task("deploy-firesale", "Deploys the FireSale contract and its dependencies")
    .addOptionalParam("weth", "Address of an existing WETH contract")
    .addOptionalParam("wbtc", "Address of an existing WBTC contract")
    .addOptionalParam("feth", "Address of an existing FETH contract")
    .addParam("mint", "Amount of tokens to mint to deployer (if deploying new tokens)", "10000", types.string)
    .addParam("fund", "Amount of tokens to fund FireSale with (if deploying new tokens)", "1000", types.string)
    .setAction(async (taskArgs: { weth?: string, wbtc?: string, feth: string, mint: string, fund: string }, hre: HardhatRuntimeEnvironment) => {
        const { ethers, network } = hre;
        const { weth: wethAddress, wbtc: wbtcAddress, feth: fethAddress, mint: mintAmountStr, fund: fundAmountStr } = taskArgs;
        
        let contractsToVerify: { address: string, constructorArgs: any[] }[] = [];

        console.log(`--- Starting FireSale Deployment on ${network.name} ---`);

        // 1. Setup Deployer Wallet
        const deployer = await setupWallet(hre)
        console.log(`AFTER`);
        const deployerBalance = await deployer.getBalance();
        console.log(`Deployer balance: ${ethers.utils.formatEther(deployerBalance)} ETH`);

        // 2. Deploy or Instantiate Token Contracts
        let wethContract, wbtcContract, fethContract;
        if (wethAddress && wbtcAddress && fethAddress) {
            console.log("Instantiating existing contracts...");
            // 3. if all addresses are provided, instantiate the contracts
            [wethContract, wbtcContract, fethContract] = await instantiateContracts(wethAddress, fethAddress, wbtcAddress, deployer, hre)
        } else {
            console.log("Deploying new tokens...");
            // 3. Deploy
            [wethContract, wbtcContract, fethContract] = await deployAllContracts(deployer, mintAmountStr, hre);

            const constructorArgs = [ethers.utils.parseEther(mintAmountStr)];
            contractsToVerify.push({ address: wethContract.address, constructorArgs: constructorArgs });
            contractsToVerify.push({ address: wbtcContract.address, constructorArgs: constructorArgs });
            contractsToVerify.push({ address: fethContract.address, constructorArgs: constructorArgs });
            
            console.log("Minting tokens...");
            // 4. Mint new tokens 
            mintTokens(deployer, wethContract, wbtcContract, fethContract, mintAmountStr)
        }


        // 5. Deploy FireSale Contract
        console.log("\nDeploying FireSale contract...");
        const fireSaleArgs = [wethContract.address, fethContract.address];
        const fireSale = await deployContract(hre, "FireSale7702", deployer, fireSaleArgs);
        contractsToVerify.push({ address: fireSale.address, constructorArgs: fireSaleArgs });

        // 6. Fund FireSale with liquidity if we deployed new tokens
        await fundFireSale(deployer, wethContract, fethContract, fireSale, fundAmountStr)


        console.log("\n--- Deployment Complete ---");
        console.log("WETH Contract:", wethContract.address);
        console.log("WBTC Contract:", wbtcContract.address);
        console.log("FETH Contract:", fethContract.address);
        console.log("FireSale Contract:", fireSale.address);
        console.log("-----------------------------\n");
        
        // Finally, run the verification script on all newly deployed contracts
        await verifyContracts(hre, contractsToVerify);
    }); 