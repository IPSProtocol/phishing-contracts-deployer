import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";

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
