import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";
import "dotenv/config";



const { GETH_DEV_PK, HARDHAT_PRIVATE_KEY,DECENTRALIZED_FIREWALL_USERNAME, DECENTRALIZED_FIREWALL_PASSWORD, SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

const config: HardhatUserConfig = {
  paths: {
    artifacts: "artifacts",
    cache: "cache",
    deploy: "src/deploy",
    sources: "contracts",
  },
  networks: {
    decentralized_firewall_testnet: {
      url: `https://${DECENTRALIZED_FIREWALL_USERNAME}:${DECENTRALIZED_FIREWALL_PASSWORD}@ipschain.ipsprotocol.xyz`,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    local: {
      url: "http://127.0.0.1:8545",
      accounts: [`0x${HARDHAT_PRIVATE_KEY}`, `0x${GETH_DEV_PK}`]
    },
    sepolia: {
      url: `${SEPOLIA_RPC_URL}`,
      accounts: [process.env.PRIVATE_KEY!],
    },
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
      "@gnosis.pm/zodiac/contracts": {
        version: "0.8.28"
      },
      "@openzeppelin/contracts": {
        version: "0.8.28"
      }
    }
  },

};

export default config;
