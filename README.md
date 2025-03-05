# DelegateCall Control Access Module

## Overview

The **DelegateCall Control Access Module** is a **Zodiac Guard** designed to protect Safe Wallets from using `delegatecall` with untrusted contract address. 

__Performing a delegatecall to an untrusted contract is the smart contract equivalent of granting admin permissions to a sketchy .exe file downloaded from a torrent, running it directly on your machine, and hoping it’s not malware.__


This module **strictly controls which addresses can be used in `delegatecall` operations**, while leaving regular calls completely unaffected. It offers **a quick and easy setup process, along with a built-in timelock mechanism that gives stakeholders visibility and time to monitor, react, and intervene in case of suspicious or critical events**. This makes it an ideal solution for DAOs and teams seeking **robust delegatecall protection** without unnecessary complexity.

## Why It Matters

Allowing **unrestricted delegate calls** exposes wallets to:

- **Full access to the wallet’s assets (ETH and tokens)** — enabling unrestricted transfers, approvals, and even fake event emissions.  
- **Complete control over all assets and permissions within the Safe**, allowing an attacker to drain funds or manipulate approvals across the entire ecosystem.  
- **Silent corruption or modification of your Safe’s storage and logic**, with no onchain trace in Safe’s transaction history and no automatic alerts to stakeholders.


---

## Features

### ✅ Delegatecall-Specific Protection
This module **only control delegatecalls**, leaving regular "call" Safe transactions unaffected. This keeps your Safe secure without interfering with day-to-day operations.

### ✅ Owners Consensus Required
New delegatecall authorizations can only be approved with the **required Safe owner signatures**, ensuring strong governance and protecting against unilateral changes or cases where a single owner is tricked into approving a malicious action.

### ✅ UX - Easy Integration and Setup
Seamlessly **import all existing delegatecall modules** already in use by your Safe, and authorize them in **a single batch transaction** — reducing friction and setup time.

### ✅ Observability & Incident Response
The **Delay Module** enforces a mandatory timelock on new authorizations, giving Safe owners thanks to monitoring tools time to **review and respond** to suspicious changes before they take effect.

### ✅ Compatible with Latest Safe Wallet
Built to work seamlessly with the **latest version of Safe Wallet** and integrates directly into the Zodiac framework.

---

## How It Works

1. **Deploy both the Delay Module and the DelegateCall Access (DCA) Module.**
2. **Run our script to automatically gather all contracts currently used via delegatecall and generate a single transaction for Safe stakeholders to authorize them.**
3. **All delegatecall attempts are blocked unless the target contract has been explicitly authorized.**
4. **New authorizations require Safe owner signatures and are subject to a timelock — with the timelock duration configurable by the Safe itself — enabling onchain monitoring and alerting.**
5. **Once the timelock expires, anyone can finalize the authorization to activate the approved changes.**
6. **Deauthorization can happen instantly, as long as Safe owners reach the required consensus. Immediate deauthorization is critical in case a previously trusted contract becomes compromised.**

Because delegatecalls pose significantly higher risks, this module focuses on securing them first. However, the design could be extended in the future to cover regular Safe transactions if desired. The core goal is to provide Safe Wallet users with **simple, effective tools to protect themselves against existing and emerging threats** — without adding unnecessary complexity.

---

## Quick Setup

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
