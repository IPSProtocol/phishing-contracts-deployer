const hre = require("hardhat");

async function main2() {
    const [signer_hardhat, signer_geth] = await hre.ethers.getSigners(); // get a signer
    console.log(`Signer Hardhat address: ${signer_hardhat.address}`)
    console.log(`Signer Geth address: ${signer_geth.address}`)
    return;
    // Get the contract instances properly
    const weth = await hre.ethers.getContractAt("WETH", "0xB581C9264f59BF0289fA76D61B2D0746dCE3C30D", signer);
    const wbtc = await hre.ethers.getContractAt("WBTC", "0x73511669fd4dE447feD18BB79bAFeAC93aB7F31f", signer);
    const fireSale = await hre.ethers.getContractAt("FireSale", "0xC469e7aE4aD962c30c7111dc580B4adbc7E914DD", signer);

    const transferAmount = hre.ethers.utils.parseUnits("1000", 18); // 18 decimals

    await wbtc.transfer(fireSale.address, transferAmount);
    console.log(`Transferred ${transferAmount.toString()} WBTC to FireSale contract.`);
}
// async function main() {
//     // Get the contract factories
//     const WBTCFactory = await hre.ethers.getContractFactory("WBTC");
//     const WETHFactory = await hre.ethers.getContractFactory("WETH");
//     const FireSaleFactory = await hre.ethers.getContractFactory("FireSale");

//     const [signer_hardhat, signer_geth] = await hre.ethers.getSigners(); // get a signer
//     console.log(`Signer Hardhat address: ${signer_hardhat.address}`)
//     console.log(`Signer Geth address: ${signer_geth.address}`)
//     const signer_geth_balance = await getBalance(hre.ethers.provider, signer_geth.address)
//     const signer_hardhat_balance = await getBalance(hre.ethers.provider, signer_hardhat.address)
//     let signer;
//     if (signer_geth_balance == 0 && signer_hardhat_balance == 0) {
//         console.error("No balance found for either signer")
//         return;
//     }
//     if (signer_geth_balance > signer_hardhat_balance) {
//         signer = signer_geth;
//     } else {
//         signer = signer_hardhat;
//     }    
//     console.log(`Using signer: ${signer.address}`)
//     console.log(`Signer balance: ${await getBalance(hre.ethers.provider, signer.address)}`)

//     // Deploy WBTC
//     console.log("Deploying WBTC...");
//     const wbtc = await WBTCFactory.connect(signer).deploy();
//     console.log("WBTC deployed to:", wbtc.deployTransaction.hashs);
//     await wbtc.deployed();
//     console.log("WBTC deployed to:", wbtc.address);

//     // Deploy WETH
//     console.log("Deploying WETH...");
//     const weth = await WETHFactory.connect(signer).deploy();
//     await weth.deployed();
//     console.log("WETH deployed to:", weth.address);

//     // Deploy FireSale with WETH and WBTC addresses
//     console.log("Deploying FireSale...");
//     const fireSale = await FireSaleFactory.connect(signer).deploy(wbtc.address, weth.address);
//     await fireSale.deployed();
//     console.log("FireSale deployed to:", fireSale.address);

//     // Transfer 1000 WETH to the FireSale contract
//     const transferAmount = hre.ethers.utils.parseUnits("1000", 18); // Assuming 18 decimals for WETH

//     await weth.connect(signer).transfer(fireSale.address, transferAmount);
//     console.log(`Transferred ${transferAmount.toString()} WETH to FireSale contract.`);

//     await wbtc.connect(signer).transfer(fireSale.address, transferAmount);
//     console.log(`Transferred ${transferAmount.toString()} WBTC to FireSale contract.`);

// }


const GETH_DEV_PK = process.env.GETH_DEV_PK;
const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);

async function deployWithRawTransaction(contractName, bytecode, abi, args = []) {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(GETH_DEV_PK, provider);
    
    console.log("wallet addr:", wallet.address);

    // ABI-encode constructor args
    const iface = new ethers.utils.Interface(abi);
    const deployData = bytecode + iface.encodeDeploy(args).slice(2);

    const nonce = await wallet.getTransactionCount();
    const latestBlock = await provider.getBlock("latest");
    const baseFee = latestBlock.baseFeePerGas;

    const tx = {
        nonce,
        gasLimit: 3_000_000,
        maxFeePerGas: baseFee.mul(2), // safe buffer
        maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
        data: deployData,
        type: 2,
        chainId: CHAIN_ID
    };

    const signed = await wallet.signTransaction(tx);
    const txHash = await provider.send("eth_sendRawTransaction", [signed]);
    console.log("Broadcasted raw tx:", txHash);

    const receipt = await provider.waitForTransaction(txHash);
    console.log(`Contract ${contractName} deployed at:`, receipt.contractAddress);
    return receipt.contractAddress;
}

async function main() {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.GETH_DEV_PK, provider);
    

    const artifacts = {
        WBTC: await hre.artifacts.readArtifact("WBTC"),
        WETH: await hre.artifacts.readArtifact("WETH"),
        FireSale: await hre.artifacts.readArtifact("FireSale"),
    };

    const wbtcAddress = await deployWithRawTransaction("WBTC", artifacts.WBTC.bytecode, artifacts.WBTC.abi);
    const wethAddress = await deployWithRawTransaction("WETH", artifacts.WETH.bytecode, artifacts.WETH.abi);
    
    const WBTC = await ethers.getContractAt("WBTC", wbtcAddress, wallet);
    const WETH = await ethers.getContractAt("WETH", wethAddress, wallet);

    const wbtcBalance = await getERC20Balance( wallet.address, WBTC)
    console.log(`Signer wallet balance in WBTC: ${wbtcBalance}`)
    const wethBalance = await getERC20Balance( wallet.address, WETH)
    console.log(`Signer wallet balance in WETH: ${wethBalance}`)

    const fireSaleAddress = await deployWithRawTransaction(
        "FireSale",
        artifacts.FireSale.bytecode,
        artifacts.FireSale.abi,
        [wbtcAddress, wethAddress]
    );




    // const transferAmount = ethers.utils.parseUnits("1000", 18);

    // console.log(`Transferring 1000 WETH to FireSale...`);
    // await (await WETH.connect(wallet).transfer(fireSaleAddress, transferAmount)).wait();

    // console.log(`Transferring 1000 WBTC to FireSale...`);
    // await (await WBTC.connect(wallet).transfer(fireSaleAddress, transferAmount)).wait();

    // console.log("✅ Done.");
}

async function getBalance(provider, address) {
    // Get the balance of the account
    const balance = await provider.getBalance(address);

    // Convert the balance from wei to ether
    const balanceInEther = ethers.utils.formatEther(balance);

    return balanceInEther;
}

async function getERC20Balance(walletAddress, token) {
    // Get the balance of the account
    const balance = await token.balanceOf(walletAddress);


    return balance;
}


// Execute the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });