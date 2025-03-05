// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.6;

import "@gnosis.pm/zodiac/contracts/factory/FactoryFriendly.sol";
import "@gnosis.pm/zodiac/contracts/core/Module.sol";
import "@gnosis.pm/zodiac/contracts/interfaces/IAvatar.sol";
import "@gnosis.pm/zodiac/contracts/guard/BaseGuard.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
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
    
    // Events
    event DelayModuleSet(address indexed delayModule);
    event AddressAuthorized(address indexed _target);
    event AddressAuthorizationRemoved(address indexed _target);
    event AuthorizationRequested(address indexed _target);
    
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
    
    function isAuthorized(address _target) internal view returns (bool) {
        require(authorizedAddresses[_target], "Address not authorized for delegatecall");
    }
    
    /**
     * @dev Requests authorization for a new address to be used with delegatecall
     * This will queue the authorization request in the Delay module
     * @param _target Address to be authorized
     */
    function requestAuthorization(address _target) internal {
        require(_target != address(0), "Invalid address");
        require(!authorizedAddresses[_target], "Address already authorized");
        
        bytes memory data = abi.encodeWithSelector(
            this.confirmAuthorization.selector,
            _target
        );
        
        delay.execTransactionFromModule(
            address(this),
            0,
            data,
            Enum.Operation.Call
        );
        
        emit AuthorizationRequested(_target);
    }
    
    /**
     * @dev Confirms a pending authorization after the timelock period has passed
     * This function is called by the Delay module after the cooldown period
     * @param _target Address to be authorized
     */
    function confirmAuthorization(address _target) external {
        require(msg.sender == address(delay), "Only callable via Delay module");
        authorizedAddresses[_target] = true;
        emit AddressAuthorized(_target);
    }
    
    /**
     * @dev Removes an address from the authorized list
     * @param _target Address to be removed
     */
    function removeAuthorization(address _target) internal {
        require(authorizedAddresses[_target], "Address not authorized");
        authorizedAddresses[_target] = false;
        emit AddressAuthorizationRemoved(_target);
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
    ) external override {
        if (operation == Enum.Operation.Call) {
            return;
        }
        if (data.length >= 4) {
            //data is packed with no pagging. check safe multisend
            // slot 0  data.length 
            // slot 1 : fn selector + target address
            address _target; // to authorize or to verify
            bytes4 functionSelector; // verify or authorize
            require(data.length == 24, "Data length invalid"); // fnselector (4bytes) + address expected (20bytes)

            // load encoded the 2 variables
            assembly {
                // slot 1  : addr 0x0  - 0x20 : data.length, ignored
                // slot 2  : addr 0x20 - 0x40 : function selector + target address + padding
                
                // load slot 1 with fn selector + target address
                let dataTmp := mload(add(data, 32))

                // moves the fnSelector to the last 4 bytes (32 bits) (shift right 256 - 32 =  224 bits)
                functionSelector := shr(224, dataTmp)  

                // address starts at 0x24
                let addrTmp:= mload(add(data, 0x24))
                
                // moves the address to the last 20 bytes (160 bits) (shift right 256 - 160 = 96 bits)
                let addr := shr(96,addrTmp) 
                _target := addr
            }
            // cast to bytes4
            functionSelector = bytes4(functionSelector);
            
            if (functionSelector == isAuthorizedSelector) {
                isAuthorized(_target);
            } 
            else if (functionSelector == requestAuthorizationSelector) {
                // request authorization for the target address via the delay module
                delay.execTransactionFromModule(
                    address(this),
                    0,
                    abi.encodeWithSelector(this.confirmAuthorization.selector, _target),
                    Enum.Operation.Call
                );
            }
            else if (functionSelector == removeAuthorizationSelector) {
                // remove authorization for the target address
                removeAuthorization(_target);
            }
            else {
                revert(string(abi.encodePacked(
                    "Invalid function selector. Supported functions: ",
                    "isAuthorized(address), ",
                    "requestAuthorization(address), ",
                    "removeAuthorization(address)"
                )));
            }
        }
    }
    
    /**
     * @dev Hook called after a transaction is executed
     */
    function checkAfterExecution(bytes32 txHash, bool success) external override {
        // No additional checks needed after execution
    }
}