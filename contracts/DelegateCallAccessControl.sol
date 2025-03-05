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
 * @dev A Zodiac guard module that protects delegatecall operations by verifying the candidateDelegate address
 * is in an authorized list. Uses the Delay module for timelock functionality.
 */
contract DelegateCallAccessControl is BaseGuard, Module, ReentrancyGuard {
    // Define our function selectors
    bytes4 isAuthorizedSelector = bytes4(keccak256("isAuthorized(address)"));
    bytes4 requestAuthorizationSelector = bytes4(keccak256("requestAuthorization(address)"));
    bytes4 removeAuthorizationSelector = bytes4(keccak256("removeAuthorization(address)"));
    
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
    event AddressAuthorized(address indexed candidateDelegate);
    event AddressAuthorizationRemoved(address indexed candidateDelegate);
    event AuthorizationRequested(address indexed candidateDelegate);
    
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
    
    function isAuthorized(address candidateDelegate) internal view returns (bool) {
        require(authorizedAddresses[candidateDelegate], "Address not authorized for delegatecall");
        // return authorizedAddresses[candidateDelegate];
    }
    /**
     * @dev Requests authorization for a new address to be used with delegatecall
     * This will queue the authorization request in the Delay module
     * @param _targetAddress Address to be authorized
     */
    function requestAuthorization(address _targetAddress) internal {
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
    function removeAuthorization(address _targetAddress) internal {
        require(authorizedAddresses[_targetAddress], "Address not authorized");
        
        authorizedAddresses[_targetAddress] = false;
        
        emit AddressAuthorizationRemoved(_targetAddress);
    }
    
    /**
     * @dev Provides the following functionalities:
     * - isAuthorized(address) -> returns true if the address is authorized for delegatecall
     * - requestAuthorization(address) -> requests authorization for a new address to be used with delegatecall, after the cooldown period.
     * - removeAuthorization(address) -> removes an address from the authorized list
     * 
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
        if (operation == Enum.Operation.Call) {
            return;
        }
        if (data.length >= 4) {
            //data is packed with no pagging. check safe multisend
            // slot 0  data.length 
            // slot 1 : fn selector + target address
            address candidateDelegate; // to authorize or to verify
            bytes4 functionSelector; // verify or authorize
            require(data.length == 24, "Data length invalid"); // fnselector (4bytes) + address expected (20bytes)

            // load encoded the 2 variables
            assembly {
                // slot 1  : addr 0x0  - 0x20 : data.length, ignored
                // slot 2  : addr 0x20 - 0x40 : function selector + candidateDelegate address + padding
                
                // load slot 1 with fn selector + candidateDelegate address
                let dataTmp := mload(add(data, 32))

                // moves the fnSelector to the last 4 bytes (32 bits) (shift right 256 - 32 =  224 bits)
                functionSelector := shr(224, _data)  

                // address starts at 0x24
                let addrTmp:= mload(add(data, 0x24))
                
                // moves the address to the last 20 bytes (160 bits) (shift right 256 - 160 = 96 bits)
                let addr := shr(96,addrTmp) 
            }
            // cast to bytes4
            functionSelector = bytes4(functionSelector);
            
            if (functionSelector == isAuthorizedSelector) {
                isAuthorized(candidateDelegate);
            } 
            else if (functionSelector == requestAuthorizationSelector) {
            
                delay.execTransactionFromModule(
                    address(this),
                    0,
                    abi.encodeWithSelector(this.confirmAuthorization.selector, candidateDelegate),
                    Enum.Operation.Call
                );
            }
            else if (functionSelector == removeAuthorizationSelector) {
                
                removeAuthorization(candidateDelegate);
            }
            else{
                revert("Invalid functionality");
            }
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