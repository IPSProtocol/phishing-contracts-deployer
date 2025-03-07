# DelegateCall Guard

[![Build Status](https://github.com/theexoticman/zodiac-delegatecall-guard/actions/workflows/ci.yaml/badge.svg)](https://github.com/theexoticman/zodiac-delegatecall-guard/actions/workflows/ci.yaml/)


## Overview

The **DelegateCall Guard** is a **Custom Zodiac Guard** designed to protect Safe Wallets from using `delegatecall` with untrusted contract address. 

__Performing a delegatecall to an untrusted contract is the smart contract equivalent of granting admin permissions to a sketchy .exe file downloaded from a torrent, running it directly on your machine, and hoping it’s not malware.__


This module **strictly controls which addresses can be used in `delegatecall` operations**, while leaving regular calls completely unaffected. It offers **a quick and easy setup process, along with a built-in timelock mechanism that gives stakeholders visibility and time to monitor, react, and intervene in case of suspicious or critical events**. This makes it an ideal solution for DAOs and teams seeking **robust delegatecall protection** without unnecessary complexity.

## Why It Matters

Allowing **unrestricted delegate calls** exposes wallets to:

- **Full access to all assets managed by the wallet** — including ETH, tokens, and any other crypto assets held by the Safe.
- **Complete impersonation capabilities** — any action performed by a contract called via `delegatecall` is executed **as if the Safe itself performed it**, inheriting the Safe’s address and permissions. This can also include emitting **fake events**, making malicious actions appear legitimate.
- **Silent corruption or modification of the Safe’s storage and logic** — changes can be made directly to the Safe’s internal storage and contract logic **without leaving any trace in the Safe’s transaction history**, and with **no automatic alerts to stakeholders**.


---

## Features

### ✅ Delegatecall Authorization List
This Guard ensures that the Safe can only execute `delegatecall` operations to contracts that have been **explicitly authorized in advance**.

### ✅ Delegatecall-Specific Protection
This module **only controls delegatecalls**, leaving regular Safe transactions (standard `call` operations) unaffected. This allows for enhanced security without disrupting regular wallet operations.

### ✅ Owners Consensus Required
New `delegatecall` authorizations can only be approved with the **required Safe owner signatures**, ensuring strong governance and protecting against unilateral changes or cases where a single owner could be tricked into approving a malicious action.

### ✅ UX - Easy Integration and Setup
Seamlessly **import all existing delegatecall modules** currently used by your Safe, and authorize them in **a single batch transaction** — minimizing setup friction and simplifying the onboarding process.

### ✅ Observability & Incident Response
The **Delay Module** enforces a mandatory timelock on new authorizations, giving Safe owners — through monitoring tools — the **time to review and respond** to any suspicious changes before they take effect.

### ✅ Compatible with Latest Safe Wallet
This Guard is fully compatible with the **latest version of Safe Wallet** and integrates directly into the **Zodiac framework**, ensuring seamless adoption for DAOs and teams already using Safe.


---

## How It Works

1. **Deploy both the Delay Module and the DelegateCall Guard (DCG) Module.**
2. **Set the Guard and Enable the Delay Module on your Safe Wallet**
3. **Run our script to automatically gather all contracts currently used via delegatecall and generate a single transaction for Safe stakeholders to authorize them.**
4. **All delegatecall attempts are blocked unless the target contract has been explicitly authorized.**
5. **New authorizations require Safe owner signatures and are subject to a timelock — with the timelock duration configurable by the Safe itself — enabling onchain monitoring and alerting.**
6. **Once the timelock expires, anyone can finalize the authorization to activate the approved changes.**
7. **Deauthorization can happen instantly, as long as Safe owners reach the required consensus. Immediate deauthorization is critical in case a previously trusted contract becomes compromised.**

Because delegatecalls pose significantly higher risks, this module focuses on securing them first. However, the design could be extended in the future to cover regular Safe transactions if desired. The core goal is to provide Safe Wallet users with **simple, effective tools to protect themselves against existing and emerging threats** — without adding unnecessary complexity.

---

### 🔮 Ideas For The Future

- **MultiSend Integration**  
   Many projects rely on **MultiSend** to interact with multiple contracts in a single transaction, streamlining complex workflows.  
   Safe wallets would need to authorize the **MultiSend Module**, however, the **Delegatecall Guard (DCG)** would not be able to inspect the individual transactions performed by the MultiSend module.  
   A key objective for future versions is to explore **new approaches to enforce delegatecall authorization rules on MultiSend transactions**, ensuring all interactions — even those bundled in a single MultiSend call — benefit from the same level of security.

- **Composable Guard Support**  
   Enable seamless **composition with other Zodiac Guards**, allowing projects to layer different security policies depending on their governance preferences.

- **Expanded Monitoring & Notifications**  
   Enhance on-chain event emissions to better support **real-time monitoring and off-chain notifications**, enabling DAOs and Safe owners to receive instant alerts when new delegatecall authorizations are requested, confirmed, or executed.

- **Flexible Authorization Policies**  
   Add support for **customizable authorization rules**, allowing users to configure policies that match their specific risk appetite and operational needs.

- **Regular Call Authorization (Optional)**  
   While this Guard focuses on **delegatecall** operations, future versions could optionally extend the **authorization system to standard Safe calls**, providing owners with **complete transactional control** if desired.

---

This Guard aims to **balance security with simplicity**, enabling DAOs and project teams to protect their Safes from high-impact delegatecall risks **without introducing excessive constraints or operational complexity**.

Contributions, feedback, and feature requests are warmly welcomed from the Zodiac community.


## Quick Setup

```bash
# Install dependencies
npm install

# Run tests
npm test
```

# Security and Liability
All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.