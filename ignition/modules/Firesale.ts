// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DelegatecallGuardModule = buildModule("Firesale", async (m) => {
  // Get deployment parameters with defaults
  const owner = m.getParameter("owner");

  const hre = require("hardhat");

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
  const fireSale = await FireSaleFactory.deploy(weth.address, wbtc.address);
  await fireSale.deployed();
  console.log("FireSale deployed to:", fireSale.address);

  // Transfer 1000 WETH to the FireSale contract
  const transferAmount = hre.ethers.utils.parseUnits("1000", 18); // Assuming 18 decimals for WETH
  await weth.transfer(fireSale.address, transferAmount);
  console.log(`Transferred ${transferAmount.toString()} WETH to FireSale contract.`);

  return { wbtc, weth, fireSale };
});

export default DelegatecallGuardModule; 