const main = async () => {
    //first return is the deployer, second is random acc
    const [owner, superCoder] = await hre.ethers.getSigners();
    //compile contract and generate abi files and artifacts
    const domainContractFactory = await hre.ethers.getContractFactory('Domains');
    //create eth local net for this contract
    const domainContract = await domainContractFactory.deploy("beans");
    //wait til contract is deployed
    await domainContract.deployed();
    console.log("Contract deployed to:", domainContract.address);
    console.log("Contract deployed by:", owner.address);

    const ensName = "JPMorgan";

    //create txn to register domain contract and pass in value
    let txn = await domainContract.register(ensName, {value: hre.ethers.utils.parseEther('0.5')});
    await txn.wait();

    //check contract balance
    const balance = await hre.ethers.provider.getBalance(domainContract.address);
    console.log("Contract balance:", hre.ethers.utils.formatEther(balance));

    try {//attempt theft
      txn = await domainContract.connect(superCoder).withdraw();
      await txn.wait();
    } catch(error) { console.log("Could not rob contract. ", error); }
    //check balance of owner
    let ownerBalance = await hre.ethers.provider.getBalance(owner.address);
    console.log("balance of owner before withdrawal:", hre.ethers.utils.formatEther(ownerBalance));
    //owner withdraw contract balance
    txn = await domainContract.connect(owner).withdraw();
    await txn.wait();
    let contractBalance = await hre.ethers.provider.getBalance(domainContract.address);
    ownerBalance = await hre.ethers.provider.getBalance(owner.address);
    console.log("Contract balance after withdrawal:", hre.ethers.utils.formatEther(contractBalance));
    console.log("Balance of owner after withdrawal:", hre.ethers.utils.formatEther(ownerBalance));

    //get address of domaincontract owner
    const domainOwner = await domainContract.getAddress(ensName);
    console.log("Owner of domain: %s", ensName, " - ", domainOwner);
    console.log("Contract balance:", hre.ethers.utils.formatEther(balance));
    //as owner setRecord
    let updateRecord = "updateRecord1";
    txn = await domainContract.connect(owner).setRecord(ensName, updateRecord);
    await txn.wait();

    //user domain name getter
    const ownerRecord = await domainContract.getRecord(ensName);
    console.log("Getter method on getRecord for owner:", ownerRecord);

    //try setting a record where i am not the owner
    // txn = await domainContract.connect(rando).setRecord("beans", "attempting domain theft..");
    // await txn.wait(); 
  }
  
  const runMain = async () => {
    try {
      await main();
      process.exit(0);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  };
  
  runMain();