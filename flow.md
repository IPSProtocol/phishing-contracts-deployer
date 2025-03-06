```mermaid

sequenceDiagram
    participant User
    participant Safe
    participant DelegatecallGuard
    participant Delay

    %% Authorization Flow
    rect rgb(255, 255, 255)
        Note over Safe,Delay: Authorization Process
        User->>+Safe: requestBatchAuthorization(targetAddresses)
        Safe->>+DelegatecallGuard: requestBatchAuthorization(targetAddresses)
        DelegatecallGuard->>+Delay: execTransactionFromModule(confirmBatchAuthorization)
        Note right of Delay: Cooldown period
        Delay->>-DelegatecallGuard: confirmBatchAuthorization(targetAddresses)
        DelegatecallGuard->>DelegatecallGuard: Set authorizedAddresses[target] = true
        DelegatecallGuard->>-Safe: Return
        Safe->>-User: Return
    end

    %% DelegateCall Execution Flow
    rect rgb(255, 255, 255)
        Note over Safe,Delay: DelegateCall Execution
        User->>+Safe: execTransaction(to, value, data, operation, ...)
        Note over Safe: Check signatures
        Note over Safe: Get guard address
        Safe->>+DelegatecallGuard: checkTransaction(to, data, operation, ...)
        alt operation == DELEGATECALL
            DelegatecallGuard->>DelegatecallGuard: Check if to is authorized
            alt address authorized
                DelegatecallGuard->>-Safe: Allow execution
                Safe->>Safe: execute(to, value, data, operation)
                Note over Safe: Emit ExecutionSuccess/Failure
                Safe->>+DelegatecallGuard: checkAfterExecution(txHash, success)
                DelegatecallGuard->>-Safe: Return
            else address not authorized
                DelegatecallGuard->>Safe: Revert transaction
            end
        else operation != DELEGATECALL
            DelegatecallGuard->>Safe: Allow execution
            Safe->>Safe: execute(to, value, data, operation)
            Note over Safe: Emit ExecutionSuccess/Failure
            Safe->>+DelegatecallGuard: checkAfterExecution(txHash, success)
            DelegatecallGuard->>-Safe: Return
        end
        Safe->>-User: Return success
    end

    %% Deauthorization Flow
    rect rgb(255, 255, 255)
        Note over Safe,Delay: Deauthorization Process
        User->>+Safe: requestBatchDeauthorization(targetAddresses)
        Safe->>+DelegatecallGuard: requestBatchDeauthorization(targetAddresses)
        DelegatecallGuard->>DelegatecallGuard: Set authorizedAddresses[target] = false
        DelegatecallGuard->>-Safe: Return
        Safe->>-User: Return
    end