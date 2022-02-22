const main = async () => {
    const domainContractFactory = await hre.ethers.getContractFactory('Domains');
    const domainContract = await domainContractFactory.deploy("beans");
    await domainContract.deployed();
  
    console.log("Contract deployed to:", domainContract.address);
    const ensName = "Green";
      let txn = await domainContract.register(ensName,  {value: hre.ethers.utils.parseEther('0.1')});
      await txn.wait();
    console.log("Minted domain: %s", ensName);
  
    txn = await domainContract.setRecord(ensName, "Initial bean");
    await txn.wait();
    console.log("Set record for %s.beans", ensName);
  
    const address = await domainContract.getAddress(ensName);
    console.log("Owner of domain %s:",ensName, address);
  
    const balance = await hre.ethers.provider.getBalance(domainContract.address);
    console.log("Contract balance:", hre.ethers.utils.formatEther(balance));
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