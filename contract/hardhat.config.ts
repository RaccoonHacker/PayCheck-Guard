import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  // 注意：如果部署时报 Opcode 错误，请将版本降至 0.8.19
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // 定义 Polkadot Hub TestNet
    polkadotHubTestnet: {
      url: "https://services.polkadothub-rpc.com/testnet/",
      chainId: 420420417,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  // 用于在 Blockscout 上验证合约（可选）
  etherscan: {
    apiKey: {
      polkadotHubTestnet: "no-api-key-needed"
    },
    customChains: [
      {
        network: "polkadotHubTestnet",
        chainId: 420420417,
        urls: {
          apiURL: "https://blockscout-testnet.polkadot.io/api",
          browserURL: "https://blockscout-testnet.polkadot.io/"
        }
      }
    ]
  }
};

export default config;