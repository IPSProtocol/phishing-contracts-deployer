// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.6;


/**
 * @title Dummy Contract
 * @dev used for testing calls and delegatecalls
 */
contract Dummy {
    function dummy() external pure returns (bool) {
        return true;
    }
}
