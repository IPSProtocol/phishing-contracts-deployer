// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.6;

// Define Enum locally to avoid import issues
library Enum {
    enum Operation {
        Call,
        Delegatecall
    }
}

/**
 * @title MockSafe
 * @dev A mock implementation of the Safe contract for testing purposes
 */
contract MockSafe {
    uint256 public nonce = 0;
    uint256 public threshold = 2;
    
    /**
     * @dev Mock implementation of checkSignatures
     * Always passes for testing purposes
     */
    function checkSignatures(
        address executor,
        bytes32 dataHash,
        bytes memory signatures
    ) external view {
        // This is a mock implementation that always passes
        // In a real Safe, this would verify that enough owners have signed
        require(signatures.length >= 65, "Invalid signatures length");
    }
    
    /**
     * @dev Mock implementation of getThreshold
     */
    function getThreshold() external view returns (uint256) {
        return threshold;
    }
    
    /**
     * @dev Mock implementation of getTransactionHash
     */
    function getTransactionHash(
        address to,
        uint256 value,
        bytes calldata data,
        Enum.Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address refundReceiver,
        uint256 _nonce
    ) external view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                to,
                value,
                keccak256(data),
                uint8(operation),
                safeTxGas,
                baseGas,
                gasPrice,
                gasToken,
                refundReceiver,
                _nonce
            )
        );
    }
    
    /**
     * @dev Increment the nonce for testing
     */
    function incrementNonce() external {
        nonce++;
    }
} 