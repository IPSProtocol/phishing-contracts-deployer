// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.20;

import {Enum} from "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";

interface IDelegatecallGuard {
    // Events
    event DelegatecallGuardSetup(
        address indexed _owner, // Address of the owner (typically the Safe)
        address indexed _authorizationManager, // Address of the authorization manager
        address _authorizationDelayModule, // Address of the delay module for authorization
        address _deauthorizationDelayModule // Address of the delay module for deauthorization
    );
    event BatchAuthorizationRequested(address[] _targets);
    event BatchDeAuthorizationRequested(address[] _targets);
    event BatchAddressAuthorized(address[] _targets);
    event BatchAddressDeauthorized(address[] _targets);

    /**
     * @dev Requests authorization for one or more addresses to be used with delegatecall.
     * @param _targets Array of addresses to be authorized
     */
    function requestBatchAuthorization(address[] calldata _targets) external;

    /**
     * @dev Confirms authorization for multiple target addresses.
     * This function can only be called by the authorization delay module.
     * @param _targets Array of addresses to be authorized
     */
    function confirmBatchAuthorization(address[] calldata _targets) external;

    /**
     * @dev Requests removal of multiple addresses from the authorized list.
     * @param _targets Array of addresses to be removed
     */
    function requestBatchDeauthorization(address[] calldata _targets) external;

    /**
     * @dev Confirms deauthorization for multiple target addresses.
     * This function can only be called by the deauthorization delay module.
     * @param _targets Array of addresses to be deauthorized
     */
    function confirmBatchDeauthorization(address[] calldata _targets) external;

    /**
     * @dev Checks if an address is authorized for delegatecall.
     * @param _target Address to check for authorization
     * @return bool indicating whether the address is authorized
     */
    function isAuthorized(address _target) external view returns (bool);

    /**
     * @dev Checks if a target address is authorized for delegatecall.
     * This function is called before executing a transaction.
     * @param to Target address for the transaction
     * @param value Amount of Ether to send (not used in this guard)
     * @param data Function selector and parameters for the transaction
     * @param operation Type of operation (0=call, 1=delegatecall)
     * @param safeTxGas Gas limit for the transaction
     * @param baseGas Base gas for the transaction
     * @param gasPrice Gas price for the transaction
     * @param gasToken Token used for gas payment
     * @param refundReceiver Address to receive any refunds
     * @param signatures Signatures for the transaction
     * @param msgSender Address of the sender
     */
    function checkTransaction(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory signatures,
        address msgSender
    ) external;
}
