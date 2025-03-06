import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
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
        version: "0.8.19"
      },
      "@openzeppelin/contracts": {
        version: "0.8.19"
      }
    }
  },
  paths: {
    sources: "./contracts",
  }
};

export default config;
