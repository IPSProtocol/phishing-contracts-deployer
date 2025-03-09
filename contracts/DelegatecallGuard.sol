// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.20;

import "@gnosis.pm/zodiac/contracts/interfaces/IAvatar.sol";
import "@gnosis.pm/zodiac/contracts/guard/BaseGuard.sol";
import "./external/Delay.sol";
import "./interfaces/IDelegatecallGuard.sol";

import "@gnosis.pm/zodiac/contracts/factory/FactoryFriendly.sol";

/**
 * @title DelegatecallGuard
 * @dev A Zodiac guard module for Safe Smart Accounts that verifies if delegatecall operations are performed on authorized addresses.
 * This contract ensures that only addresses in an authorized list can be targeted for delegatecall operations.
 *
 * It enables external governance over the authorization list via the Authorization Manager address, and allows for the use of up to two delay modules
 * for timelock functionality over both authorization and deauthorization processes.
 *
 * ## Delay Modules
 * The DelegatecallGuard allows the usage of timelocks on both authorization and deauthorization processes.
 * Users can set different cooldown periods for authorization and deauthorization processes by using `authorizationDelayModule` and `deAuthorizationDelayModule`.
 *
 * If a user wants to have the same cooldown period for both processes, they can set both delay modules parameters to the same address.
 * If a user does not want any delays, they can set the delay modules parameters to `address(0)`.
 *
 * ## Notes on Deauthorization
 * The DelegatecallGuard does not check if the addresses to be deauthorized are currently authorized. As a consequence, observing an address being deauthorized does not imply that it was previously authorized.
 * Deauthorization can be time-critical, so we want to avoid reverting the transaction due to checks that do not impact the system, as deauthorization is an idempotent operation.
 *
 * @dev This guard is compatible with the Gnosis Safe.
 */
contract DelegatecallGuard is BaseGuard, FactoryFriendly {
    // State variables
    Delay public authorizationDelayModule; // Delay module for authorization requests
    Delay public deAuthorizationDelayModule; // Delay module for deauthorization requests
    address public authorizationManager; // Address of the manager responsible for managing the authorization list

    // Mapping to store authorized addresses for delegatecall
    mapping(address => bool) public authorizedAddresses;

    /**
     * @dev Constructor for direct deployment. Anyone can deploy this module.
     * @param _owner Address of the owner (typically the Safe)
     * @param _authorizationManager Address of the manager responsible for managing authorizations
     * @param _authorizationDelayModule Address of the Delay module used for authorization
     * @param _deauthorizationDelayModule Address of the Delay module used for deauthorization
     */
    constructor(
        address _owner,
        address _authorizationManager,
        address _authorizationDelayModule,
        address _deauthorizationDelayModule
    ) {
        require(
            _authorizationManager != address(0),
            "Authorization Manager cannot be zero address"
        );
        bytes memory initializeParams = abi.encode(
            _owner,
            _authorizationManager,
            _authorizationDelayModule,
            _deauthorizationDelayModule
        );
        setUp(initializeParams);
    }

    /**
     * @dev Initialize function, triggered when a new proxy is deployed.
     * @param initializeParams Parameters of initialization encoded
     */
    function setUp(bytes memory initializeParams) public override initializer {
        (
            address _owner,
            address _authorizationManager,
            address _authorizationDelayModule,
            address _deauthorizationDelayModule
        ) = abi.decode(initializeParams, (address, address, address, address));
        __Ownable_init(_owner);

        authorizationDelayModule = Delay(_authorizationDelayModule);
        deAuthorizationDelayModule = Delay(_deauthorizationDelayModule);
        authorizationManager = _authorizationManager;

        emit DelegatecallGuardSetup(
            _owner,
            _authorizationManager,
            _authorizationDelayModule,
            _deauthorizationDelayModule
        );
    }

    /**
     * @dev Requests authorization for one or more addresses to be used with delegatecall.
     * This will queue a single authorization request in the Authorization Delay module if it is set.
     * If no delay module is set, the function will authorize the addresses in the same transaction.
     * if a delay module is set, the function will emit an BatchAddressAuthorizedRequested with the addresses that are being authorized.
     * @param _targets Array of addresses to be authorized
     */
    function requestBatchAuthorization(
        address[] calldata _targets
    ) external onlyManager {
        address target;
        // Validate the input addresses before queuing the request for better UX
        for (uint256 i = 0; i < _targets.length; i++) {
            target = _targets[i];

            require(
                target != address(0),
                "Invalid target address for delegatecall"
            );

            require(
                !authorizedAddresses[target],
                "Target address already authorized"
            );
        }

        if (address(authorizationDelayModule) != address(0)) {
            // Prepare the data for the authorizationDelayModule to execute
            bytes memory data = abi.encodeWithSelector(
                this.confirmBatchAuthorization.selector,
                _targets
            );
            // Queue a single authorization request in the Delay module
            authorizationDelayModule.execTransactionFromModule(
                address(this),
                0,
                data,
                Enum.Operation.Call
            );
            emit BatchAddressAuthorizedRequested(_targets);
        } else {
            _confirmBatchAuthorization(_targets);
        }
    }

    /**
     * @dev Confirms authorization for multiple target addresses.
     * Used only if an authorization delay module is set.
     * This function can only be called by the authorization delay module.
     * @param _targets Array of addresses to be authorized
     */
    function confirmBatchAuthorization(
        address[] calldata _targets
    ) external onlyAuthorizationDelayModule {
        _confirmBatchAuthorization(_targets);
    }

    /**
     * @dev Internal function to confirm authorization for multiple target addresses.
     * Emits a single event for new authorized addresses.
     * @param _targets Array of addresses to be authorized
     */
    function _confirmBatchAuthorization(address[] calldata _targets) internal {
        for (uint256 i = 0; i < _targets.length; i++) {
            authorizedAddresses[_targets[i]] = true;
        }

        // Emit a single event for the batch confirmation
        emit BatchAddressAuthorized(_targets);
    }

    /**
     * @dev Requests removal of multiple addresses from the authorized list.
     * This will queue a single deauthorization request in the Deauthorization Delay module if it is set.
     * If no delay module is set, the function will deauthorize the addresses in the same transaction.
     * This function performs no checks on the addresses to be deauthorized - meaning that the addresses can be deauthorized even if they are not authorized.
     * as a consequence of this, observing an address being deauthorized does not imply that it was previously authorized.
     * Deauthorization can be time critical so we want to avoid reverting the transaction because of checks that do not have an actual impact on the system, as deauthorition is an idempotent operation.
     *
     * if a deauthorization delay module is set, the function will emit an BatchAddressDeauthorizedRequested with the addresses that are being deauthorized.
     *
     * @param _targets Array of addresses to be removed
     */
    function requestBatchDeauthorization(
        address[] calldata _targets
    ) external onlyAuthorizationManager {
        if (address(deAuthorizationDelayModule) != address(0)) {
            // Prepare the data for the deauthorizationDelayModule to execute
            bytes memory data = abi.encodeWithSelector(
                this.confirmBatchDeauthorization.selector,
                _targets
            );
            // Queue a single deauthorization request in the Delay module
            deAuthorizationDelayModule.execTransactionFromModule(
                address(this),
                0,
                data,
                Enum.Operation.Call
            );
            emit BatchAddressDeauthorizedRequested(_targets);
        } else {
            _confirmBatchDeauthorization(_targets);
        }
    }

    /**
     * @dev Confirms deauthorization for multiple target addresses, if a deauthorization delay module is set.
     * This function can only be called by the deauthorization delay module.
     * @param _targets Array of addresses to be deauthorized
     */
    function confirmBatchDeauthorization(
        address[] calldata _targets
    ) external onlyDeauthorizationDelayModule {
        _confirmBatchDeauthorization(_targets);
    }

    /**
     * @dev Internal function to confirm deauthorization for multiple target addresses.
     * Emits a single event with the deauthorized addresses.
     * This function performs the actual deauthorization of the addresses.
     * This function performs no checks on the addresses to be deauthorized - meaning that the addresses can be deauthorized even if they are not authorized as it is idempotent.
     * Deauthorization can be time critical so we want to avoid reverting the transaction because of checks that do not have an actual impact on the system, as deauthorition is an idempotent operation.
     *
     * @param _targets Array of addresses to be deauthorized
     */
    function _confirmBatchDeauthorization(
        address[] calldata _targets
    ) internal {
        // Directly remove the addresses
        for (uint256 i = 0; i < _targets.length; i++) {
            authorizedAddresses[_targets[i]] = false; // Remove the address
        }

        // Emit a single event for the batch deauthorization
        emit BatchAddressDeauthorized(_targets);
    }

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
    ) external override {
        if (operation == Enum.Operation.DelegateCall) {
            require(
                authorizedAddresses[to],
                "Target address not authorized for delegatecall"
            );
        }
        return;
    }

    /**
     * @dev Hook called after a transaction is executed.
     * This function can be used to perform additional checks if needed.
     * @param txHash Hash of the executed transaction
     * @param success Boolean indicating if the transaction was successful
     */
    function checkAfterExecution(
        bytes32 txHash,
        bool success
    ) external override {
        // No additional checks needed after execution
    }

    /**
     * @dev Checks if an address is authorized for delegatecall.
     * @param _target Address to check for authorization
     * @return bool indicating whether the address is authorized
     */
    function isAuthorized(address _target) external view returns (bool) {
        return authorizedAddresses[_target];
    }

    /**
     * @dev Modifier to restrict access to the manager
     */
    modifier onlyAuthorizationManager() {
        require(
            msg.sender == manager,
            "Caller is not the authorization manager"
        );
        _;
    }
    /**
     * @dev Modifier to restrict access to the manager
     */
    modifier onlyAuthorizationDelayModule() {
        require(
            msg.sender == authorizationManager,
            "Caller is not the authorization manager"
        );
        _;
    }
    /**
     * @dev Modifier to restrict access to the manager
     */
    modifier onlyDeauthorizationDelayModule() {
        require(
            msg.sender == deauthorizationManager,
            "Caller is not the deauthorization manager"
        );
        _;
    }
}
