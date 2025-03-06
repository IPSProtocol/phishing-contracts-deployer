// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.6;

import "@gnosis.pm/zodiac/contracts/interfaces/IAvatar.sol";
import "@gnosis.pm/zodiac/contracts/guard/BaseGuard.sol";
import "./Delay.sol";
import "@gnosis.pm/zodiac/contracts/factory/FactoryFriendly.sol";

// Interface for the Safe contract to use its signature verification
interface ISafe {
    function checkSignatures(
        address executor,
        bytes32 dataHash,
        bytes memory signatures
    ) external view;

    function getThreshold() external view returns (uint256);

    function nonce() external view returns (uint256);

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
    ) external view returns (bytes32);
}

/**
 * @title DelegatecallGuard
 * @dev A Zodiac guard module that protects delegatecall operations by verifying the candidateDelegate address
 * is in an authorized list. Uses the Delay module for timelock functionality.
 */
contract DelegatecallGuardDelegatecallGuard is BaseGuard, FactoryFriendly {
    // Constants
    uint256 public constant DELEGATECALL_OPERATION = 1;

    // State variables
    Delay public delayModule;

    // Mapping to store authorized addresses for delegatecall
    mapping(address => bool) public authorizedAddresses;

    // Events
    event DelegatecallGuardSetup(address _owner, address delayModule);
    event AddressAuthorized(address _target);
    event BatchAuthorizationRequested(address[] _targets);
    event BatchDeAuthorizationRequested(address[] _targets);
    event BatchAddressAuthorized(address[] targets);
    event BatchAddressRemoved(address[] targets);

    /**
     * @dev Constructor for direct deployment, anyone can deploy this module but set _owner to the Safe address
     * @param _owner Address of the owner (typically the Safe)
     * @param _delayModule Address of the Delay module
     */
    constructor(address _owner, address _delayModule) {
        require(
            _delayModule != address(0),
            "Delay module cannot be zero address"
        );
        bytes memory initializeParams = abi.encode(_owner, _delayModule);
        setUp(initializeParams);
    }

    /**
     * @dev Initialize function, will be triggered when a new proxy is deployed
     * @param initializeParams Parameters of initialization encoded
     */
    function setUp(bytes memory initializeParams) public override initializer {
        __Ownable_init();
        (address _owner, address _delayModule) = abi.decode(
            initializeParams,
            (address, address)
        );

        require(
            _delayModule != address(0),
            "Delay module cannot be zero address"
        );
        delayModule = Delay(_delayModule);

        transferOwnership(_owner);

        emit DelegatecallGuardSetup(_owner, _delayModule);
    }

    modifier onlyDelayModule() {
        require(
            msg.sender == address(delayModule),
            "Only callable via Delay module"
        );
        _;
    }

    /**
     * @dev Requests authorization for multiple addresses to be used with delegatecall
     * This will queue a single authorization request in the Delay module
     * @param _targets Array of addresses to be authorized
     */
    function requestBatchAuthorization(
        address[] calldata _targets
    ) external onlyOwner {
        // Validate the input addresses
        for (uint256 i = 0; i < _targets.length; i++) {
            address _target = _targets[i];

            require(
                _target != address(0),
                "Invalid Target address for Delegatecall"
            );
            require(
                !authorizedAddresses[_target],
                "Target address already authorized"
            );
        }

        // Prepare the data for the Delay module to execute
        bytes memory data = abi.encodeWithSelector(
            this.confirmBatchAuthorization.selector,
            _targets
        );

        // Queue a single authorization request in the Delay module
        delayModule.execTransactionFromModule(
            address(this),
            0,
            data,
            Enum.Operation.Call
        );

        // Emit a single event for the batch request
        emit BatchAuthorizationRequested(_targets);
    }

    /**
     * @dev Confirms authorization for a target address
     * @param _target Address to be authorized
     */
    function confirmAuthorization(address _target) external onlyDelayModule {
        // Ensure this is called by the Delay module
        require(
            msg.sender == address(delayModule),
            "Only callable via Delay module"
        );
        authorizedAddresses[_target] = true;

        // Emit an event for the authorization
        emit AddressAuthorized(_target);
    }

    /**
     * @dev Confirms authorization for multiple target addresses
     * @param _targets Array of addresses to be authorized
     */
    function confirmBatchAuthorization(
        address[] calldata _targets
    ) external onlyDelayModule {
        for (uint256 i = 0; i < _targets.length; i++) {
            address _target = _targets[i];
            require(
                !authorizedAddresses[_target],
                "Address already authorized"
            );

            authorizedAddresses[_target] = true;
        }

        // Emit a single event for the batch confirmation
        emit BatchAddressAuthorized(_targets);
    }

    /**
     * @dev Requests removal of multiple addresses from the authorized list
     * This will directly remove the addresses without queuing in the Delay module
     * @param _targets Array of addresses to be removed
     */
    function requestBatchDeauthorization(
        address[] calldata _targets
    ) external onlyOwner {
        // Validate the input addresses
        for (uint256 i = 0; i < _targets.length; i++) {
            address _target = _targets[i];

            require(
                _target != address(0),
                "Invalid Target address for deauthorization"
            );
            require(
                authorizedAddresses[_target],
                "Target address not authorized"
            );
        }

        // Directly remove the addresses
        for (uint256 i = 0; i < _targets.length; i++) {
            authorizedAddresses[_targets[i]] = false; // Remove the address
        }

        // Emit a single event for the batch request
        emit BatchAddressRemoved(_targets);
    }

    /**
     * @dev Provides the following functionalities:
     * - isAuthorized(address) -> returns true if the address is authorized for delegatecall
     * - requestAuthorization(address) -> requests authorization for a new address to be used with delegatecall, after the cooldown period.
     * - removeAuthorization(address) -> removes an address from the authorized list
     *
     * @param to Target address for the transaction
     * @param data Function selector (4 bytes) + address parameter (20 bytes). Total length must be 24 bytes.
     * @param operation Operation type (0=call, 1=delegatecall). Only delegatecall operations are checked.
     * @notice Other parameters are not used by this guard but are required by the Safe interface
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
    ) external override onlyOwner {
        if (operation == Enum.Operation.Call) {
            // If the operation is a call, we don't need to check the target address
            return;
        } else {
            require(
                authorizedAddresses[to],
                "Target address not authorized for delegatecall"
            );
        }
    }

    /**
     * @dev Hook called after a transaction is executed
     */
    function checkAfterExecution(
        bytes32 txHash,
        bool success
    ) external override {
        // No additional checks needed after execution
    }
}
