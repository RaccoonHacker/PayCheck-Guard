# PayCheck-Guard 

PayCheck-Guard是一个去中心化的工程款与劳务薪资托管平台，专为解决政企项目中“结算不透明”和“恶意欠薪”痛点而设计

本项目是 OneBlock+ Polkadot 2.0 Hackathon  Track 3 的参赛作品，利用 Polkadot Revive 的 100% 以太坊兼容性实现高性能、低成本的链上资金监管。

合约是自定义的业务逻辑合约：
1. 功能特性：它实现了资金的 createProject（创建/锁定）、releaseFunds（释放）和 arbitrate（仲裁）。
2. EIP 相关性：遵循了 EIP-1888（可验证工作是否完成）。

## 📖 项目概述
核心背景

在传统建筑工程或政企招标中，资金链条长、透明度低，常导致：

1. 恶意欠薪： 资金被中间层截留或挪用，工人无法按时领薪。
2. 结算违约： 企业完成项目后，甲方以各种理由拖欠尾款。
3. 信任成本高： 招投标阶段缺乏资金到位的透明证明。

我们的方案

通过智能合约实现“资金预存 - 阶段锁死 - 自动分账”的链上逻辑：
1. 预置资金： 项目启动前，甲方需将预算预存在链上合约，工人可随时核实资金到位情况。
2. 里程碑式解锁(未来改进)： 基于里程碑（Milestone）的解锁机制，实现工作证明-资金对应支付。
3. 直达末端： 合约直接通过地址将资金分拨给企业（材料费）和工人（工资），防止截留。

## ⚙️核心功能
1. ✅ 项目资金托管 (Project Escrow): 甲方发布项目并注入 DOT/USDT。
2. ✅ 垂直转账 (Vertical Payment): 预设转账地址，确保薪资直接转入企业和工人。
3. ✅ 公开解锁 (Public Verification): 配合工作证明实现自动化拨付。
4. ✅ 透明面板 (Transparency Dashboard): 实时查看链上资金余额与锁定状态。
## 🛠 技术架构

- Smart Contracts: Solidity (v0.8.20+)
- Framework: Hardhat (Testing, Scripting, Deployment)
- Frontend: Next.js + Tailwind CSS
- Wallet Connection: RainbowKit + Wagmi + Viem
- Blockchain: Polkadot Revive (Testnet/Mainnet)

关键设计

- 工程计时：项目发布时有打款最长期限，工人提交工作证明后，甲方不及时放款，计时时间耗光后，资金自动转入工人账户。
- 管理员仲裁：甲乙两方发生争执，可提起申诉退款，由管理根据双方理由仲裁并决定资金归谁。
- 优化手续费: 优化 Revive 上的交易结构，实现低手续费发薪。

## 🥇未来改进(展望)
1. 里程碑式解锁：基于里程碑（Milestone）的解锁机制，实现工作进度1-对应工资1，工作进度2-对应工资2式支付。
2. 多方仲裁：利用多签机制实现多方资金仲裁，并接入ai协助仲裁提高效率。

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

视频链接：https://youtu.be/s4tvzMY5VrE

ppt链接：https://drive.google.com/file/d/1FnQz4Q3q5ItH4E8tq48Hicc9IIpI3JXQ/view?usp=drive_link