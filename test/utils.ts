import hre, { deployments, ethers } from "hardhat";
export async function retrieveLogs(txReceipt: any) {
    
    // Check logs for emitted events
    const logs = txReceipt.logs;

    // Assuming you have the ABI of the contracts
    const delegateGuardABI = [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_owner",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "_delayModule",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "_target",
                    "type": "address"
                }
            ],
            "name": "AddressAuthorized",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address[]",
                    "name": "targets",
                    "type": "address[]"
                }
            ],
            "name": "BatchAddressAuthorized",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address[]",
                    "name": "targets",
                    "type": "address[]"
                }
            ],
            "name": "BatchAddressRemoved",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address[]",
                    "name": "_targets",
                    "type": "address[]"
                }
            ],
            "name": "BatchAuthorizationRequested",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address[]",
                    "name": "_targets",
                    "type": "address[]"
                }
            ],
            "name": "BatchDeAuthorizationRequested",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "_owner",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "delayModule",
                    "type": "address"
                }
            ],
            "name": "DelegatecallGuardSetup",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "uint8",
                    "name": "version",
                    "type": "uint8"
                }
            ],
            "name": "Initialized",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "previousOwner",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "OwnershipTransferred",
            "type": "event"
        },
        {
            "inputs": [],
            "name": "DELEGATECALL_OPERATION",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "authorizedAddresses",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes32",
                    "name": "txHash",
                    "type": "bytes32"
                },
                {
                    "internalType": "bool",
                    "name": "success",
                    "type": "bool"
                }
            ],
            "name": "checkAfterExecution",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                },
                {
                    "internalType": "enum Enum.Operation",
                    "name": "operation",
                    "type": "uint8"
                },
                {
                    "internalType": "uint256",
                    "name": "safeTxGas",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "baseGas",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "gasPrice",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "gasToken",
                    "type": "address"
                },
                {
                    "internalType": "address payable",
                    "name": "refundReceiver",
                    "type": "address"
                },
                {
                    "internalType": "bytes",
                    "name": "signatures",
                    "type": "bytes"
                },
                {
                    "internalType": "address",
                    "name": "msgSender",
                    "type": "address"
                }
            ],
            "name": "checkTransaction",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_target",
                    "type": "address"
                }
            ],
            "name": "confirmAuthorization",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address[]",
                    "name": "_targets",
                    "type": "address[]"
                }
            ],
            "name": "confirmBatchAuthorization",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "delayModule",
            "outputs": [
                {
                    "internalType": "contract Delay",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "renounceOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address[]",
                    "name": "_targets",
                    "type": "address[]"
                }
            ],
            "name": "requestBatchAuthorization",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address[]",
                    "name": "_targets",
                    "type": "address[]"
                }
            ],
            "name": "requestBatchDeauthorization",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes",
                    "name": "initializeParams",
                    "type": "bytes"
                }
            ],
            "name": "setUp",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes4",
                    "name": "interfaceId",
                    "type": "bytes4"
                }
            ],
            "name": "supportsInterface",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "transferOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]
    const delayContractABI = [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_owner",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "_avatar",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "_target",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "_cooldown",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "_expiration",
                    "type": "uint256"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "module",
                    "type": "address"
                }
            ],
            "name": "AlreadyDisabledModule",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "module",
                    "type": "address"
                }
            ],
            "name": "AlreadyEnabledModule",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "module",
                    "type": "address"
                }
            ],
            "name": "InvalidModule",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "sender",
                    "type": "address"
                }
            ],
            "name": "NotAuthorized",
            "type": "error"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "guard_",
                    "type": "address"
                }
            ],
            "name": "NotIERC165Compliant",
            "type": "error"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "previousAvatar",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "newAvatar",
                    "type": "address"
                }
            ],
            "name": "AvatarSet",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "guard",
                    "type": "address"
                }
            ],
            "name": "ChangedGuard",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "initiator",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "owner",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "avatar",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "target",
                    "type": "address"
                }
            ],
            "name": "DelaySetup",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "module",
                    "type": "address"
                }
            ],
            "name": "DisabledModule",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "module",
                    "type": "address"
                }
            ],
            "name": "EnabledModule",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "module",
                    "type": "address"
                }
            ],
            "name": "ExecutionFromModuleFailure",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "module",
                    "type": "address"
                }
            ],
            "name": "ExecutionFromModuleSuccess",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "uint8",
                    "name": "version",
                    "type": "uint8"
                }
            ],
            "name": "Initialized",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "previousOwner",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "OwnershipTransferred",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "previousTarget",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "newTarget",
                    "type": "address"
                }
            ],
            "name": "TargetSet",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "queueNonce",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "bytes32",
                    "name": "txHash",
                    "type": "bytes32"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                },
                {
                    "indexed": false,
                    "internalType": "enum Enum.Operation",
                    "name": "operation",
                    "type": "uint8"
                }
            ],
            "name": "TransactionAdded",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "cooldown",
                    "type": "uint256"
                }
            ],
            "name": "TxCooldownSet",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "expiration",
                    "type": "uint256"
                }
            ],
            "name": "TxExpirationSet",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                }
            ],
            "name": "TxNonceSet",
            "type": "event"
        },
        {
            "inputs": [],
            "name": "avatar",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "prevModule",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "module",
                    "type": "address"
                }
            ],
            "name": "disableModule",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "module",
                    "type": "address"
                }
            ],
            "name": "enableModule",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                },
                {
                    "internalType": "enum Enum.Operation",
                    "name": "operation",
                    "type": "uint8"
                }
            ],
            "name": "execTransactionFromModule",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "success",
                    "type": "bool"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                },
                {
                    "internalType": "enum Enum.Operation",
                    "name": "operation",
                    "type": "uint8"
                }
            ],
            "name": "execTransactionFromModuleReturnData",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "success",
                    "type": "bool"
                },
                {
                    "internalType": "bytes",
                    "name": "returnData",
                    "type": "bytes"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                },
                {
                    "internalType": "enum Enum.Operation",
                    "name": "operation",
                    "type": "uint8"
                }
            ],
            "name": "executeNextTx",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getGuard",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "_guard",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "start",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "pageSize",
                    "type": "uint256"
                }
            ],
            "name": "getModulesPaginated",
            "outputs": [
                {
                    "internalType": "address[]",
                    "name": "array",
                    "type": "address[]"
                },
                {
                    "internalType": "address",
                    "name": "next",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                },
                {
                    "internalType": "enum Enum.Operation",
                    "name": "operation",
                    "type": "uint8"
                }
            ],
            "name": "getTransactionHash",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_nonce",
                    "type": "uint256"
                }
            ],
            "name": "getTxCreatedAt",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_nonce",
                    "type": "uint256"
                }
            ],
            "name": "getTxHash",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "guard",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_module",
                    "type": "address"
                }
            ],
            "name": "isModuleEnabled",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "queueNonce",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "renounceOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_avatar",
                    "type": "address"
                }
            ],
            "name": "setAvatar",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_guard",
                    "type": "address"
                }
            ],
            "name": "setGuard",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_target",
                    "type": "address"
                }
            ],
            "name": "setTarget",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_txCooldown",
                    "type": "uint256"
                }
            ],
            "name": "setTxCooldown",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_txExpiration",
                    "type": "uint256"
                }
            ],
            "name": "setTxExpiration",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_txNonce",
                    "type": "uint256"
                }
            ],
            "name": "setTxNonce",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes",
                    "name": "initParams",
                    "type": "bytes"
                }
            ],
            "name": "setUp",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "skipExpired",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "target",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "newOwner",
                    "type": "address"
                }
            ],
            "name": "transferOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "txCooldown",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "txCreatedAt",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "txExpiration",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "txHash",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "txNonce",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]

    // Create contract instances to decode logs
    const delayContract = new ethers.utils.Interface(delayContractABI);
    const delegateGuard = new ethers.utils.Interface(delegateGuardABI);

    // Check for events in the logs
    
    logs.forEach((log: any) => {
        try {
            // Check if the log corresponds to an event in the Delay Contract
            const parsedLogDelay = delayContract.parseLog(log);
            console.log('Event emitted from Delay Contract:', parsedLogDelay);
        } catch (error) {
            // Not an event from Delay Contract
        }

        try {
            // Check if the log corresponds to an event in the Delegate Guard
            const parsedLogGuard = delegateGuard.parseLog(log);
            console.log('Event emitted from Delegate Guard:', parsedLogGuard);
        } catch (error) {
            // Not an event from Delegate Guard
        }
    })
};
