import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";
import "dotenv/config";
import "./src/tasks/deploy-firesale";


const { HARDHAT_PRIVATE_KEY, PRIVATE_KEY, DECENTRALIZED_FIREWALL_USERNAME, DECENTRALIZED_FIREWALL_PASSWORD, SEPOLIA_RPC_URL, DECENTRALIZED_FIREWALL_URL } = process.env;


const config: HardhatUserConfig = {
  paths: {
    artifacts: "artifacts",
    cache: "cache",
    deploy: "src/deploy",
    sources: "contracts",
  },
  networks: {
    hardhat: {},
    
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ],
    overrides: {
      "@openzeppelin/contracts": {
        version: "0.8.28"
      }
    }
  },
};

if (DECENTRALIZED_FIREWALL_URL && PRIVATE_KEY) {
  config.networks!.decentralized_firewall_testnet = {
    url: `https://${DECENTRALIZED_FIREWALL_USERNAME || ''}:${DECENTRALIZED_FIREWALL_PASSWORD || ''}@${DECENTRALIZED_FIREWALL_URL}`,
    accounts: [`0x${PRIVATE_KEY}`]
  };
}

if (HARDHAT_PRIVATE_KEY) {
  config.networks!.local = {
    chainId: 4337,
    url: "http://127.0.0.1:8545",
    accounts: [`0x${HARDHAT_PRIVATE_KEY}`]
  };
}

if (SEPOLIA_RPC_URL && PRIVATE_KEY) {
  config.networks!.sepolia = {
    chainId: 11155111,
    url: SEPOLIA_RPC_URL,
    accounts: [`0x${PRIVATE_KEY}`],
  };
}

export default config;
