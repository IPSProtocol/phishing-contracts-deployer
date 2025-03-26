const hre = require("hardhat");

async function main2() {
    const [signer] = await hre.ethers.getSigners(); // get a signer

    // Get the contract instances properly
    const weth = await hre.ethers.getContractAt("WETH", "0xB581C9264f59BF0289fA76D61B2D0746dCE3C30D", signer);
    const wbtc = await hre.ethers.getContractAt("WBTC", "0x73511669fd4dE447feD18BB79bAFeAC93aB7F31f", signer);
    const fireSale = await hre.ethers.getContractAt("FireSale", "0xC469e7aE4aD962c30c7111dc580B4adbc7E914DD", signer);

    const transferAmount = hre.ethers.utils.parseUnits("1000", 18); // 18 decimals

    await wbtc.transfer(fireSale.address, transferAmount);
    console.log(`Transferred ${transferAmount.toString()} WBTC to FireSale contract.`);
}
async function main() {
    // Get the contract factories
    const WBTCFactory = await hre.ethers.getContractFactory("WBTC");
    const WETHFactory = await hre.ethers.getContractFactory("WETH");
    const FireSaleFactory = await hre.ethers.getContractFactory("FireSale");


    // Deploy WBTC
    console.log("Deploying WBTC...");
    const wbtc = await WBTCFactory.deploy();
    await wbtc.deployed();
    console.log("WBTC deployed to:", wbtc.address);

    // Deploy WETH
    console.log("Deploying WETH...");
    const weth = await WETHFactory.deploy();
    await weth.deployed();
    console.log("WETH deployed to:", weth.address);

    // Deploy FireSale with WETH and WBTC addresses
    console.log("Deploying FireSale...");
    const fireSale = await FireSaleFactory.deploy( wbtc.address, weth.address);
    await fireSale.deployed();
    console.log("FireSale deployed to:", fireSale.address);

    // Transfer 1000 WETH to the FireSale contract
    const transferAmount = hre.ethers.utils.parseUnits("1000", 18); // Assuming 18 decimals for WETH

    await weth.transfer(fireSale.address, transferAmount);
    console.log(`Transferred ${transferAmount.toString()} WETH to FireSale contract.`);

    await wbtc.transfer(fireSale.address, transferAmount);
    console.log(`Transferred ${transferAmount.toString()} WBTC to FireSale contract.`);

}

// Execute the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });