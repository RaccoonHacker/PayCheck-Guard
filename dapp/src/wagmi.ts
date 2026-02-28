import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { http } from "wagmi";

// 自定义 Polkadot Revive 测试网配置
export const reviveTestnet = defineChain({
  id: 420420417, // 示例 ID，部署时请确认 Revive 的准确 Chain ID
  name: "polkadotHubTestnet",
  nativeCurrency: { name: "DOT", symbol: "DOT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://services.polkadothub-rpc.com/testnet/"] },
  },
  blockExplorers: {
    default: {
      name: "Polkadot Revive Explorer",
      url: "https://blockscout-testnet.polkadot.io/",
    }, // 替换为 Revive 浏览器
  },
});

export const config = getDefaultConfig({
  appName: "PayCheck-Guard",
  projectId: "9385a17c1835ed428511f37da419c0a3", // 从 cloud.walletconnect.com 免费获取
  chains: [reviveTestnet],
  transports: {
    [reviveTestnet.id]: http(),
  },
});
