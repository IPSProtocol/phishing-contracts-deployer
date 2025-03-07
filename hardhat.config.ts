import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-deploy";
import type { HttpNetworkUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

const config: HardhatUserConfig = {
  paths: {
    artifacts: "artifacts",
    cache: "cache",
    deploy: "src/deploy",
    sources: "contracts",
  }, 
  solidity: {
    compilers: [
      {
        version: "0.8.20",
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
        version: "0.8.20"
      },
      "@openzeppelin/contracts": {
        version: "0.8.20"
      }
    }
  },
  paths: {
    sources: "./contracts",
  }
};

export default config;
