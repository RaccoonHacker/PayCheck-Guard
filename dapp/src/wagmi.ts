import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';
import { http } from 'wagmi';

// 定义 Polkadot Hub TestNet
export const polkadotHub = defineChain({
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'DOT', symbol: 'DOT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://services.polkadothub-rpc.com/testnet/'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://blockscout-testnet.polkadot.io/' },
  },
});

export const config = getDefaultConfig({
  appName: 'PayCheck-Guard',
  projectId: '9385a17c1835ed42b511f37da419c0a3', // 使用你图片里的 ID
  chains: [polkadotHub],
  ssr: true, // Next.js 建议开启
  transports: {
    [polkadotHub.id]: http(),
  },
});