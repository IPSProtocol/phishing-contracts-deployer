// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

contract MiniPermit {
    function useSignatureToTransfer(
        address token,
        address from,
        address to,
        uint256 amount,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // super dumb hash: just sign this hash from the frontend
        bytes32 message = keccak256(abi.encodePacked(token, from, to, amount));

        // recover signer
        address recovered = ecrecover(toEthSignedMessageHash(message), v, r, s);
        require(recovered == from, "Invalid signature");

        // transfer tokens
        require(
            IERC20(token).transferFrom(from, to, amount),
            "Transfer failed"
        );
    }

    function toEthSignedMessageHash(
        bytes32 hash
    ) public pure returns (bytes32) {
        // mimic eth_sign (not typed data)
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
            );
    }
}
