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
    event BatchDeauthorizationRequested(address[] _targets);
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
}
