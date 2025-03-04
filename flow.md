```mermaid

sequenceDiagram
    participant User
    participant Safe
    participant DelegateCallAccessControl
    participant Delay

    %% Authorization Flow
    rect rgb(255, 255, 255)
        Note over Safe,Delay: Authorization Process
        User->>+Safe: requestAuthorization(targetAddress)
        Safe->>+DelegateCallAccessControl: requestAuthorization(targetAddress)
        DelegateCallAccessControl->>+Delay: execTransactionFromModule(confirmAuthorization)
        Note right of Delay: Cooldown period
        Delay->>-DelegateCallAccessControl: confirmAuthorization(targetAddress)
        DelegateCallAccessControl->>DelegateCallAccessControl: Set authorizedAddresses[target] = true
        DelegateCallAccessControl->>-Safe: Return
        Safe->>-User: Return
    end

    %% DelegateCall Execution Flow
    rect rgb(255, 255, 255)
        Note over Safe,Delay: DelegateCall Execution
        User->>+Safe: execTransaction(to, value, data, operation, ...)
        Note over Safe: Check signatures
        Note over Safe: Get guard address
        Safe->>+DelegateCallAccessControl: checkTransaction(to, data, operation, ...)
        alt operation == DELEGATECALL
            DelegateCallAccessControl->>DelegateCallAccessControl: Check if to is authorized
            alt address authorized
                DelegateCallAccessControl->>-Safe: Allow execution
                Safe->>Safe: execute(to, value, data, operation)
                Note over Safe: Emit ExecutionSuccess/Failure
                Safe->>+DelegateCallAccessControl: checkAfterExecution(txHash, success)
                DelegateCallAccessControl->>-Safe: Return
            else address not authorized
                DelegateCallAccessControl->>Safe: Revert transaction
            end
        else operation != DELEGATECALL
            DelegateCallAccessControl->>Safe: Allow execution
            Safe->>Safe: execute(to, value, data, operation)
            Note over Safe: Emit ExecutionSuccess/Failure
            Safe->>+DelegateCallAccessControl: checkAfterExecution(txHash, success)
            DelegateCallAccessControl->>-Safe: Return
        end
        Safe->>-User: Return success
    end