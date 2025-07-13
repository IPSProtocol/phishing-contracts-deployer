# IPS Protocol: Proof-of-Concept Phishing Contracts Deployer

> **⚠️ WARNING: FOR EDUCATIONAL & RESEARCH USE ONLY ⚠️**
>
> The smart contracts in this repository are intentionally designed with vulnerabilities for security research and proof-of-concept demonstrations. **DO NOT deploy them on any mainnet or use them with real funds.** The authors are not responsible for any misuse or loss of assets.

## Sponsoring 

This project is supported by the [ETH Rangers Program](https://blog.ethereum.org/2024/12/02/ethrangers-public-goods) and [Ethereum Foundation Ecosystem Support Program (ESP)](https://esp.ethereum.foundation), under Grant #[FY25-1948, Q1-2025](https://blog.ethereum.org/2025/05/08/allocation-q1-25).


## Overview

This repository contains a Hardhat project for deploying and interacting with various proof-of-concept (PoC) smart contracts that simulate common vulnerabilities or flawed logic. It is maintained by IPS Protocol for educational, research, and demonstration purposes.

The primary example included is a `FireSale` contract that demonstrates a simple but flawed token swap mechanism, along with mock ERC20 tokens for testing.

## Features

- **Vulnerable `FireSale` Contract**: A simple DEX contract with intentional design flaws for analysis.
- **Mock ERC20 Tokens**: `WBTC` and `WETH` contracts for easy testing and interaction.
- **Scripted Deployment**: A clean, configurable deployment script located in `scripts/deploy_firesale.js`.
- **Hardhat Environment**: Fully configured for local testing, compilation, and deployment.
- **CI/CD Pipeline**: Includes a GitHub Actions workflow to automatically run tests on pushes and pull requests to `main`, ensuring code integrity.

## Project Structure

- **/contracts**: Contains all Solidity source code for the PoC contracts.
- **/scripts**: Includes deployment and utility scripts.
- **/test**: Test suite for ensuring contract functionality (and vulnerabilities) are working as expected.
- **hardhat.config.js**: Hardhat configuration file.
- **.github/workflows**: Continuous Integration workflow definitions.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd <repository-directory>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Your Environment

Create a `.env` file in the project root. You can copy the example file to get started:

```bash
cp .env.example .env
```

Now, edit the `.env` file and fill in the required variables:

```env
# The private key of the wallet you want to use for deployment.
# On a local Hardhat node, you can use one of the default keys provided when you start the node.
PRIVATE_KEY=

# The RPC URL of the network you want to deploy to.
# This defaults to the standard local Hardhat node URL.
SEPOLIA_RPC_URL=
```

## Available Scripts

### Run a Local Blockchain Node

For testing, you can start a local Hardhat node in a separate terminal. This will also provide you with a list of funded accounts and private keys you can use in your `.env` file.

```bash
npx hardhat node
```

### Compile the Contracts

```bash
npx hardhat compile
```

### Run Tests

This command will run the entire test suite located in the `/test` directory.

```bash
npm test
```

### Deploy Contracts

To deploy the contracts to your configured network (e.g., the local node), run the deployment script:

```bash
# The '--network local' flag corresponds to the 'local' network defined in hardhat.config.js
npx hardhat run scripts/deploy_firesale.js --network local
```

## Security and Liability

All contracts and scripts are provided "as is" and "with all faults," WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

This project is strictly for educational and security research purposes. The creators and contributors are not liable for any damages or losses arising from the use or misuse of this code. **Do not use this with real assets.**