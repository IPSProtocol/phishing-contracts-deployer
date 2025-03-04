# SafeGuard - Transaction Guard for Gnosis Safe

[![License](https://img.shields.io/badge/license-LGPL%20v3-blue)](LICENSE)


---

## Features

- ✅ Pre-execution transaction validation (`checkTransaction`)
- ✅ Post-execution logging (`checkAfterExecution`)
- ✅ Configurable **whitelist for allowed recipient addresses**
- ✅ Option to block all **delegatecalls** to untrusted addresses
- ✅ Ability to detect and block **unauthorized Safe upgrades** (setSingleton calls)
- ✅ Fully compatible with **Safe v1.5+**
- ✅ Supports **Zodiac GuardManager interface**

---

## Why This Project Exists

Multisigs like Safe offer strong owner-based security, but they are still vulnerable to:

- 🐟 **Phishing attacks**, where owners unknowingly sign malicious transactions
- 🔓 **Malicious delegatecalls** to backdoored contracts
- 🕵️‍♂️ **Silent proxy upgrades**, where the Safe implementation is swapped for a malicious one
- 📬 **Fake module installations**, adding unsafe extensions to the Safe

This Guard adds a flexible, **enforceable security policy** to all Safe transactions to mitigate these risks.

---

## Installation

```bash
npm install @your-org/safeguard
