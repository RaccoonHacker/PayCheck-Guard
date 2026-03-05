# PayCheck-Guard 

PayCheck-Guard是一个去中心化的工程款与劳务薪资托管平台，专为解决政企项目中“结算不透明”和“恶意欠薪”痛点而设计

本项目是 OneBlock+ Polkadot 2.0 Hackathon  Track 3 的参赛作品，利用 Polkadot Revive 的 100% 以太坊兼容性实现高性能、低成本的链上资金监管。

## 📖 项目概述
核心背景

在传统建筑工程或政企招标中，资金链条长、透明度低，常导致：

1. 恶意欠薪： 资金被中间层截留或挪用，工人无法按时领薪。
2. 结算违约： 企业完成项目后，甲方以各种理由拖欠尾款。
3. 信任成本高： 招投标阶段缺乏资金到位的透明证明。

我们的方案

通过智能合约实现“资金预存 - 阶段锁死 - 自动分账”的链上逻辑：
1. 预置国库： 项目启动前，甲方需将预算预存在链上合约，工人可随时核实资金到位情况。
2. 多方验证： 基于里程碑（Milestone）的解锁机制，需甲方、监理或多签共识触发支付。
3. 直达末端： 合约自动按照预设比例，将资金分别拨付给企业（材料费）和工人（工资），防止截留。

## ⚙️核心功能
1. ✅ 项目资金托管 (Project Escrow): 甲方发布项目并注入 DOT/USDT。
2. ✅ 智能分账模型 (Split Payment): 预设分账逻辑，确保薪资池的独立性。
3. ✅ 里程碑解锁 (Milestone Verification): 配合工作量证明（PoW）实现自动化拨付。
4. ✅ 透明面板 (Transparency Dashboard): 实时查看链上资金余额与锁定状态。
## 🛠 技术架构

- Smart Contracts: Solidity (v0.8.20+)
- Framework: Hardhat (Testing, Scripting, Deployment)
- Frontend: Next.js + Tailwind CSS
- Wallet Connection: RainbowKit + Wagmi + Viem
- Blockchain: Polkadot Revive (Testnet/Mainnet)

关键设计

- Escrow Logic: 资金分级托管，将“管理成本”与“刚性工资”分离。
- Milestone-Based Release: 基于里程碑的阶梯支付，支持多签验证解锁。
- Gas Efficiency: 优化 Revive 上的交易结构，实现低手续费批量发薪。

## 🚀 快速开始

1. Deploy the Contract
```bash
cd contract
npm install
# Set your PRIVATE_KEY using Hardhat keystore
npx hardhat keystore set PRIVATE_KEY
npm run compile
npm run deploy
```
2. Set Up the dApp
```bash
cd dapp
npm install
# Update CONTRACT_ADDRESS in app/utils/contract.ts with your deployed contract address
npm run dev
```
Open http://localhost:3000

## 👥 团队信息

- RaccoonHacker
- https://github.com/RaccoonHacker
