# DelegateCall Guard

[![Build Status](https://github.com/theexoticman/zodiac-delegatecall-guard/actions/workflows/ci.yaml/badge.svg)](https://github.com/theexoticman/zodiac-delegatecall-guard/actions/workflows/ci.yaml/)


## Overview

The DelegateCall Guard is a Zodiac Custom Guard that secures Safe Wallets by restricting delegatecall (and/or call) operations to pre-authorized contract addresses, preventing unintended or malicious code execution while preserving Safe’s flexibility.

Authorization can be managed by the Safe itself, a designated role within a modifier entity, or an external governance structure. The Guard also integrates with the Zodiac Delay Module, offering an optional timelock to allow stakeholders time to monitor, review, and counter potential threats such as phishing attacks (address poisoning, clipboard hijacking) or misconfigurations.

Since delegatecall enables Safe wallets to execute external contract logic within the Safe Account context, strict authorization is essential to prevent asset mismanagement, fund lockups, scams, or exploits.

The DelegateCall Guard is an ideal solution for DAOs and teams looking to enforce stricter delegatecall controls without sacrificing Safe’s flexibility. 🚀

### Why Restricting Delegatecall Matters

Allowing unrestricted delegate calls exposes wallets to security risks, including:

- Full access to all assets managed by the wallet — including ETH, tokens, and any other crypto assets held by the Safe.
- Impersonation — any action performed by a contract called via `delegatecall` is executed as if the Safe itself performed it, inheriting the Safe’s address and permissions. This can also include emitting fake events, making malicious actions appear legitimate.
- Silent corruption or modification of the Safe’s storage and logic — changes can be made directly to the Safe’s internal storage and contract logic without leaving any trace in the Safe’s transaction history, and with no automatic alerts to stakeholders.

By enforcing controlled access to `delegatecall`, the DelegateCall Guard mitigates these risks, ensuring only trusted contracts can execute code on behalf of the Safe.


---

## Features

### Authorization List For Delegatecall and Call
This Guard ensures that the Safe can only execute `delegatecall` and/or call operations to contracts that have been explicitly authorized in advance.

Safe users can authorize multiple addresses in a single transaction, streamlining the setup process.

To choose which transactions should be verified, make sure to use the Authorization Mode that best suits your needs.

### Flexibility & Customization
Users can fully customize the module, choosing:
- Who manages authorizations (Safe, external entity, or role-based access).  
- Whether one or two delay module should be enforced for additional security.
- Whether the authorization list applies strictly to `delegatecall` or extends to all `call` operations for broader protection.  

###  Governance
Flexibility to manage `delegatecall` authorizations with the user entity of choosing.

###  Timelock using Zodiac Delay Modifier
- Modular setup:  
  - Users can apply different delay modules for each process.  
  - The same module can be used for both flows.
  - User can remove the timelock by setting the Delay Module to the one address `0x1`.  
- Custom cooldown periods:  
  - Longer delays for authorizations to allow proper review.  
  - Shorter or instant deauthorization to enable immediate revocation if a contract is compromised.  


###  Easy Setup
Seamlessly import all existing delegatecall modules currently used by your Safe, and authorize them in a single batch transaction — minimizing setup friction and simplifying the onboarding process.

###  Enable Observability & Incident Response
The Delay Module enforces a mandatory timelock on new authorizations, giving Safe owners — through monitoring tools — the time to review and respond to any suspicious changes before they take effect.

###  Compatible with Latest Safe Wallet
This Guard is fully compatible with the latest version of Safe Wallet and integrates directly into the Zodiac framework, ensuring seamless adoption for DAOs and teams already using Safe.

Also Compatible with Metaguard. 


---

## Guard Configuration  
To deploy the DelegateCall Guard, the following parameters are required:  

- Owner – The Safe wallet that will enforce the authorization list.  
- Authorization Manager – The address responsible for managing the authorization list. The Safe itself can be set as the manager, but this is not a restriction.  


### Authorization Mode

Set the authorization mode to `1` if you only want delegate call operations to be checked against the authorization list.

Set the authorization mode to `2` if you only want call operations to be checked against the authorization list.

Set the authorization mode to `3` if you want both delegate call and call operations to be checked against the authorization list.


### Timelock Configuration  
Users can configure timelocks for both authorization and deauthorization using the Zodiac Delay Module:  
- Authorization Delay Module – Defines the cooldown period before new delegatecall authorizations take effect.  
- Deauthorization Delay Module – Defines the cooldown period before removing a delegatecall authorization.  

These delay modules can be configured independently:  
- They can have different cooldown periods for authorizations and deauthorizations.  
- The same delay module can be used for both.  
- Delay enforcement can be disabled by setting the delay module address to `address(1)`.  

⚠ Security Recommendation: It is strongly advised to use an authorization delay module to prevent immediate changes that could introduce risks.  


## Guard Operational Configuration  

To activate the Guard on an existing Safe, users must enable it by calling the `setGuard` function.  

In case you decide to use one or more Delay Modules, you need to enable the guard on these contracts.

Additionally, the Delay Modules should be authorized in the Authorization Manager, as they execute transactions via the execTransactionFromModule function from the contract.

---

This Guard aims to balance security with simplicity, enabling DAOs and project teams to protect their Safes from high-impact delegatecall risks without introducing excessive constraints or operational complexity.

Contributions, feedback, and feature requests are warmly welcomed.


## Scripts

```bash
# Install dependencies
npm install

# Run tests
npm test
```

# Security and Liability
All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.