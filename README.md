
# Zodiac DelegateCall Control Access Module

Zodiac DelegateCall Control Access Module is an **Advanced Transaction Guard** for Safe Wallets, it designed to add additional security layers such as adding **delegated call restrictions** via an authorized list of addresses, as well as ensuring secure management of thoses lists.

This module also allow list to be modified by the owners of the safe and following a delay to ensure visibility of any unanted modifications. given the security imacpts of calling wrong addresses using delegate


## Overview

This module adds an additional security layer to Safe Smart Accounts by controlling delegatecall operations, which are commonly used by externally developed modules to extend Safe functionality — such as meta-transactions, multicalls, and advanced automation.

While Safe’s modular architecture promotes innovation and flexibility, it also introduces risks similar to granting privileged system access in traditional software. Externally developed modules, especially those using DELEGATECALL (operation = 1), can fully impersonate the Safe, making security reviews and audits critical before allowing their use.

This module enforces address whitelisting and module vetting, ensuring only pre-approved and verified addresses can execute delegatecalls. This adds essential protection against phishing attacks, malicious modules, and accidental interactions with untrusted addresses, all while integrating seamlessly with the Zodiac framework to support flexible governance. Regular Safe transactions (simple calls) remain unaffected.

### Balancing Security and Functionality

Delegatecalls are fundamental for the composability, modularity, and evolution of smart accounts:

- **Essential Features**: Meta-transactions, multi-calls, MFA and other UX improvements rely on delegatecall to execute in the privileged environment of the Safe account.
- **Future Growth**: Such use cases will likely grow with updates like Pectra, enabling EOAs to set up automation via code.
- **Security Tradeoff**: This module allows users to decide whether they want stricter control over their Safe sensitive features.

## Security Features

- **Delegatecall Protection**: Every delegatecall operation is verified against a mapping of authorized addresses, while normal calls proceed without additional checks.

- **Owner Consensus Requirement**: Leverages the Safe's n/k signature scheme to ensure consensus among owners before adding new addresses to the authorized list.

- **Timelock with Delay Modifier**: Implements a timelock mechanism using the Zodiac Delay modifier, providing a mandatory waiting period between authorization request and confirmation.

- **Event Monitoring**: Emits detailed events at each step of the authorization process, enabling monitoring tools to notify users of pending changes so they can react if suspicious activity is detected.

- **Replay Attack Prevention**: Keeps track of previously used authorization messages and hashes to prevent replay attacks.

## How It Works

1. **Authorization Request**: Safe owners must reach the required threshold of signatures to request authorization for a new delegatecall target.

2. **Timelock Period**: After authorization is requested, a mandatory waiting period begins, during which monitoring tools can alert users to review the pending authorization.

3. **Confirmation**: After the timelock period expires, the authorization can be confirmed, adding the target address to the authorized list.

4. **Transaction Verification**: When a transaction is submitted to the Safe, the guard checks if the operation is a delegatecall. If it is, the target address is verified against the authorized list.

## Features

- Fine-grained access control for delegatecall operations
- Integration with Zodiac governance modules
- Configurable permission settings
- Comprehensive test suite
- Monitoring-friendly event emissions

## Development

This project uses Hardhat for development, testing, and deployment.

### Setup

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

## License

[MIT](LICENSE)