import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PayCheckGuardModule = buildModule("PayCheckGuardModule", (m) => {
  const payCheckGuard = m.contract("PayCheckGuard");
  return { payCheckGuard };
});

export default PayCheckGuardModule;