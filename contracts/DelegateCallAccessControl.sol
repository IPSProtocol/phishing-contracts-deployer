// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.6;

import "@gnosis.pm/zodiac/contracts/guard/BaseGuard.sol";
import "@gnosis.pm/zodiac/contracts/core/Module.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Delay.sol";

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
 * @title DelegateCallAccessControl
 * @dev A Zodiac guard module that protects delegatecall operations by verifying the target address
 * is in an authorized list. Uses the Delay module for timelock functionality.
 */
contract DelegateCallAccessControl is BaseGuard, Module, ReentrancyGuard {
    // Constants
    uint256 public constant DELEGATECALL_OPERATION = 1;
    
    // State variables
    Delay public delay; 
    
    // Mapping to store authorized addresses for delegatecall
    mapping(address => bool) public authorizedAddresses;
    
    // Mapping to track used authorization hashes to prevent replay attacks
    mapping(bytes32 => bool) public usedAuthorizationHashes;
    
    // Events
    event DelayModuleSet(address indexed delayModule);
    event AddressAuthorized(address indexed targetAddress);
    event AddressAuthorizationRemoved(address indexed targetAddress);
    event AuthorizationRequested(address indexed targetAddress);
    
    /**
     * @dev Constructor for direct deployment
     * @param _owner Address of the owner (typically the Safe)
     * @param _avatar Address of the avatar (the Safe)
     * @param _target Address of the target (the Safe)
     * @param _delay Address of the Delay module
     */
    constructor(
        address _owner,
        address _avatar,
        address _target,
        address _delay
    ) {
        require(_delay != address(0), "Delay module cannot be zero address");
        delay = Delay(_avatar);
        setAvatar(_avatar);
        setTarget(_target);
        transferOwnership(_owner);
        
        emit DelayModuleSet(_delay);
    }
    
    /**
     * @dev Initialize function, will be triggered when a new proxy is deployed
     * @param initializeParams Parameters of initialization encoded
     */
    function setUp(bytes memory initializeParams) public override initializer {
        (address _owner, address _avatar, address _target, address _delay) = 
            abi.decode(initializeParams, (address, address, address, address));
        
        require(_delay != address(0), "Delay module cannot be zero address");
        delay = Delay(_delay);
        
        setAvatar(_avatar);
        setTarget(_target);
        transferOwnership(_owner);
        
        emit DelayModuleSet(_delay);
    }
    
    /**
     * @dev Sets a new Delay module
     * @param _delay Address of the new Delay module
     */
    function setDelayModule(address _delay) external onlyOwner {
        require(_delay != address(0), "Delay module cannot be zero address");
        delay = Delay(_delay);
        emit DelayModuleSet(_delay);
    }
    
    /**
     * @dev Requests authorization for a new address to be used with delegatecall
     * This will queue the authorization request in the Delay module
     * @param _targetAddress Address to be authorized
     */
    function requestAuthorization(address _targetAddress) external {
        require(_targetAddress != address(0), "Invalid address");
        require(!authorizedAddresses[_targetAddress], "Address already authorized");
        
        // Prepare the data for the authorization
        bytes memory data = abi.encodeWithSelector(
            this.confirmAuthorization.selector,
            _targetAddress
        );
        
        // Queue the transaction in the Delay module
        delay.execTransactionFromModule(
            address(this),
            0,
            data,
            Enum.Operation.Call
        );
        
        emit AuthorizationRequested(_targetAddress);
    }
    
    /**
     * @dev Confirms a pending authorization after the timelock period has passed
     * This function is called by the Delay module after the cooldown period
     * @param _targetAddress Address to be authorized
     */
    function confirmAuthorization(address _targetAddress) external {
        // Only the Delay module can call this function
        require(msg.sender == address(delay), "Only callable via Delay module");
        
        authorizedAddresses[_targetAddress] = true;
        
        emit AddressAuthorized(_targetAddress);
    }
    
    /**
     * @dev Removes an address from the authorized list
     * @param _targetAddress Address to be removed
     */
    function removeAuthorization(address _targetAddress) external {
        require(authorizedAddresses[_targetAddress], "Address not authorized");
        
        authorizedAddresses[_targetAddress] = false;
        
        emit AddressAuthorizationRemoved(_targetAddress);
    }
    
    /**
     * @dev Checks if a transaction is allowed to be executed
     * Only verifies the target address if the operation is delegatecall (1)
     * @param to Destination address of Safe transaction
     * @param value Ether value of Safe transaction
     * @param data Data payload of Safe transaction
     * @param operation Operation type of Safe transaction (0=call, 1=delegatecall)
     * @param safeTxGas Gas that should be used for the Safe transaction
     * @param baseGas Gas costs for data used to trigger the safe transaction
     * @param gasPrice Maximum gas price that should be used for this transaction
     * @param gasToken Token address (or 0 if ETH) that is used for the payment
     * @param refundReceiver Address of receiver of gas payment (or 0 if tx.origin)
     * @param signatures Signature data that should be verified
     * @param msgSender Address of the sender of the current call
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
        // Only check for delegatecall operations
        if (uint256(operation) == DELEGATECALL_OPERATION) {
            require(authorizedAddresses[to], "Delegatecall to unauthorized address");
        }
    }
    
    /**
     * @dev Hook called after a transaction is executed
     */
    function checkAfterExecution(bytes32 txHash, bool success) external override {
        // No additional checks needed after execution
    }
    
    /**
     * @dev Returns the list of all authorized addresses
     * @return Array of authorized addresses
     */
    function getAuthorizedAddresses() external view returns (address[] memory) {
        // Count authorized addresses
        uint256 count = 0;
        for (uint256 i = 0; i < 2**160; i++) {
            address addr = address(uint160(i));
            if (authorizedAddresses[addr]) {
                count++;
            }
            // Break after finding all authorized addresses or reaching a reasonable limit
            if (i >= 1000 || count >= 1000) break;
        }
        
        // Create and populate the array
        address[] memory result = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < 2**160; i++) {
            address addr = address(uint160(i));
            if (authorizedAddresses[addr]) {
                result[index] = addr;
                index++;
            }
            // Break after finding all authorized addresses or reaching a reasonable limit
            if (i >= 1000 || index >= count) break;
        }
        
        return result;
    }
}