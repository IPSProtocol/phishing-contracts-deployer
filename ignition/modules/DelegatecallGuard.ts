// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Default timelock period: 1 day in seconds
const DEFAULT_COOLDOWN_PERIOD = 86400;
const DEFAULT_EXPIRATION_PERIOD = 0; // 0 means no expiration

const DelegatecallGuardModule = buildModule("DelegatecallGuardModule", (m) => {
  // Get deployment parameters with defaults
  const owner = m.getParameter("owner");
  const avatar = m.getParameter("avatar");
  const target = m.getParameter("target");
  const cooldownPeriod = m.getParameter("cooldownPeriod", DEFAULT_COOLDOWN_PERIOD);
  const expirationPeriod = m.getParameter("expirationPeriod", DEFAULT_EXPIRATION_PERIOD);

  // Deploy the Delay module first
  const delay = m.contract("Delay", [
    owner,
    avatar,
    target,
    cooldownPeriod,
    expirationPeriod
  ]);

  // Deploy the DelegatecallGuard contract
  const delegateCallAccessControl = m.contract("DelegatecallGuard", [
    owner,
    avatar,
    target,
    delay
  ]);

  return { delay, delegateCallAccessControl };
});

export default DelegatecallGuardModule; 