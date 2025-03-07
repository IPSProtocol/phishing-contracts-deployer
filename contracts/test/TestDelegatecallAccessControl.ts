// async function createSafe() {
//   // ... existing code ...

//   // Deploy the guard contract first
//   const guardContract = await GuardContractFactory.deploy(/* constructor arguments */);
//   await guardContract.deployed();

//   // Deploy the Delay contract with the Gnosis Safe as the owner
//   const delayContract = await DelayContractFactory.deploy(
//     avatarAddress, // Set the Gnosis Safe as the owner
//     avatarAddress, // Address of the avatar (Gnosis Safe)
//     targetAddress, // Address of the target contract
//     cooldownTime, // Cooldown time
//     expirationTime // Expiration time
//   );
//   await delayContract.deployed();

//   // Enable the guard contract as a module after deployment
//   const enableModuleTx = await delayContract.enableModule(guardContract.address);
//   await enableModuleTx.wait(); // Wait for the transaction to be mined

//   // Prepare the transaction data for the Safe
//   const txData = delayContract.interface.encodeFunctionData("yourFunctionName", [/* function arguments */]);

//   // Execute this transaction using the Gnosis Safe (avatar)
//   const txResponse = await signer.sendTransaction({
//     to: avatarAddress, // Use the avatar address for execution
//     value: BigInt(deploymentTransaction.value), // Amount of Ether to send
//     data: txData, // Encoded function call
//     chainId: (await provider.getNetwork()).chainId
//   });

//   // Wait for the transaction to be mined and get the receipt
//   const txReceipt = await txResponse.wait();

//   // Call retrieveLogs to check for emitted events
//   retrieveLogs(txReceipt);

//   // ... existing code ...
// }

// function retrieveLogs(txReceipt: any) {
//   // Check logs for emitted events
//   const logs = txReceipt.logs;

//   // Assuming you have the ABI of the contracts
//   const delayContractABI = [ /* ABI of Delay Contract */ ];
//   const delegateGuardABI = [ /* ABI of Delegate Guard Contract */ ];

//   // Create contract instances to decode logs
//   const delayContract = new ethers.utils.Interface(delayContractABI);
//   const delegateGuard = new ethers.utils.Interface(delegateGuardABI);

//   // Check for events in the logs
//   logs.forEach(log => {
//     try {
//       // Check if the log corresponds to an event in the Delay Contract
//       const parsedLogDelay = delayContract.parseLog(log);
//       console.log('Event emitted from Delay Contract:', parsedLogDelay);
//     } catch (error) {
//       // Not an event from Delay Contract
//     }

//     try {
//       // Check if the log corresponds to an event in the Delegate Guard
//       const parsedLogGuard = delegateGuard.parseLog(log);
//       console.log('Event emitted from Delegate Guard:', parsedLogGuard);
//     } catch (error) {
//       // Not an event from Delegate Guard
//     }
//   });
// }

// let protocolKit = await Safe.init({
//   provider: provider as unknown as ethers.providers.Provider, // Cast to the correct type
//   signer,
//   predictedSafe
// });