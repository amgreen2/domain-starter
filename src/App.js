import React, { useEffect, useState } from 'react';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import { ethers } from "ethers";
import contractAbi from './utils/contractABI.json'
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';

// Constants
const TWITTER_HANDLE = '@green2ciean';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
// Add the domain you will be minting
const tld = '.beans';
const CONTRACT_ADDRESS = "0xAf287E65759a464D41aF31C3187121fDea6DF0B2";

const App = () => {
	//state var to store network
	const [mints, setMints] = useState([]);
	const [editing, setEditing] =useState(false);
	const [loading, setLoading] = useState(false);
	const [network, setNetwork] = useState('');
	//state var to store user's public wallet
	const [currentAccount, setCurrentAccount] = useState('');
	const [domain, setDomain] = useState('');
	const [record, setRecord] = useState('');

	//connectwallet
	const connectWallet = async () => {
		try {
			const { ethereum } = window;
			if (!ethereum) {
				alert("Get MetaMask! https://metamask.io/");
				return;
			}//get access to account
			const accounts = await ethereum.request({ method: "eth_requestAccounts"});
			console.log("Connected", accounts[0]);
			setCurrentAccount(accounts[0]);
		} catch (error) { console.log(error) }
	}

	const checkIfWalletIsConnected = async () => {
		// First make sure we have access to window.ethereum
		const { ethereum } = window;

		if (!ethereum) {
			console.log("Make sure you have MetaMask!");
			return;
		} else {
			console.log("We have the ethereum object", ethereum);
		}//check if authorized to access user wallet
		const accounts = await ethereum.request({ method: 'eth_accounts'});
		//user can have mult auth accounts, grab first one
		if (accounts.length !==0) {
			const account = accounts[0];
			console.log('Authorized account recognized:', account);
			setCurrentAccount(account);
		} else { console.log('No authorized account recognized'); }
		//check network chain
		const chainId = await ethereum.request({ method: 'eth_chainId' });
		setNetwork(networks[chainId]);
		ethereum.on('chainChanged', handleChainChanged);
		//reload page when network is changed
		function handleChainChanged(_chainId) {
			window.location.reload();
		}
	};
	const switchNetwork = async () => {
		if (window.ethereum) {
			try {
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: '0x13881'}],
				});
			} catch (error) {
				if (error.code === 4902) {
					try {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{
									chainId: '0x13881',
									chainName: 'Polygon Mumbai Testnet',
									rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
									nativeCurrency: {
											name: "Mumbai Matic",
											symbol: "MATIC",
											decimals: 18
									},
									blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
								},
							],
						});
					} catch (error) {
						console.log(error);
					}
				}
				console.log(error);
			} 
		} else {
			alert("Metamask is not installed. Please install it to use this app: https://metamask.io/download.html")
		}
	}
	const mintDomain = async () => {
		//dont run if domain is empty
		if (!domain) { return }
		// alert user if domain is too short
		if (domain.length < 3){ 
			alert('Domain must be at least 3 characters long');
			return;
		}//calc price based on length of domain
		const price = domain.length === 3 ? '0.1' : domain.length === 4 ? '.3' : '0.1';
		console.log("Minting domain", domain, "with price", price);
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
					console.log("Opening wallet to pay gas..");
				try {	
					let tx = await contract.register(domain, {value: ethers.utils.parseEther(price)});
				
					//wait for txn to mine
					const receipt = await tx.wait();
					if (receipt.status === 1) {//if txn is mined true
						console.log("Domain minted! https://mumbai.polygonscan.com/tx/"+tx.hash);
						tx = await contract.setRecord(domain, record);
						const receipt = await tx.wait();
						console.log("Record set! https://mumbai.polygonscan.com/tx/"+tx.hash);
						setTimeout(() => {
							fetchMints();
						}, 2000);
						setRecord('');
						setDomain('');
					} else { alert("Transasction failed! Please try again");}
				} catch(error) {
					alert("Domain Registration failed. That domain may have already been registered. Try Again!");
					console.log("Error:", error)
				}
			} else { alert("Transaction failed! Please try again.");}
		} catch(error) { console.log(error);}
	}
	const fetchMints = async () => {
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);			
				//get alldomain names from contract
				const names = await contract.getAllNames();
				//for each name get record and address
				const mintRecords = await Promise.all(names.map(async (name) => {
					const mintRecord = await contract.records(name);
					const owner = await contract.domains(name);
					return {
						id: names.indexOf(name),
						name: name,
						record: mintRecord,
						owner: owner,
					};
				}));
				console.log("Mints fetched:", mintRecords);
				setMints(mintRecords);
			}
		} catch(error) { console.log(error); }
	}
	//update domain record
	const updateDomain = async () => {
		if (!record || !domain) { return }
		setLoading(true);
		console.log("Updating domain", domain, "with record", record);
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
					console.log("Opening wallet to pay gas..")
					let tx = await contract.setRecord(domain, record);
					await tx.wait();
					console.log("Record set https://mumbai.polygonscan.com/tx/"+tx.hash);
				fetchMints();
				setRecord('');
				setDomain('');
			}
		} catch(error) {
			console.log(error);
		} setLoading(false);
	}

	// Create a function to render if wallet is not connected yet
	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
			<img src="https://media3.giphy.com/media/iTOg0SvRhoTMk/giphy.gif" alt="Cool beans gif" />
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
  	);

	const renderInputForm = () => {
		//check for proper network
		if (network !== 'Polygon Mumbai Testnet') {
			return (
				<div className="connect-wallet-container">
					<h2>Please switch to Polygon Mumbai Testnet</h2>
					<button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch networks</button>
				</div>
			);
		}
		return (
			<div className="form-container">
				<div className="first-row">
					<input
						type="text"
						value={domain}
						placeholder='domain'
						onChange={e => setDomain(e.target.value)}
					/>
					<p className='tld'> {tld} </p>
				</div>

				<input
					type="text"
					value={record}
					placeholder='how many bean?'
					onChange={e => setRecord(e.target.value)}
				/>
					{editing ? (
						<div className="button-container">
							<button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
								Set record
							</button>  
							<button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
								Cancel
							</button>  
						</div>
					) : (
						// If editing is not true, the mint button will be returned instead
						<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
							Mint
						</button>  
					)}

			</div>
		);
	}
	const renderMints = () => {
		if (currentAccount && mints.length > 0) {
			return (
				<div className="mint-container">
					<p className="subtitle"> Recently minted domains!</p>
					<div className="mint-list">
						{ mints.map((mint, index) => {
							return (
								<div className="mint-item" key={index}>
									<div className='mint-row'>
										<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
											<p className="underlined">{' '}{mint.name}{tld}{' '}</p>
										</a>	
										{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
											<button className="edit-button" onClick={ () => editRecord(mint.name)}>
												<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
											</button>
											: 
											null
										}
									</div>
									<p> {mint.record}</p>
								</div>
							)
						})}
					</div>
				</div>
			)
		}
	};
	const editRecord = (name) => {
		console.log("Editing record for", name);
		setEditing(true);
		setDomain(name);
	}
	// This runs our function when the page loads.
	useEffect(() => {
		checkIfWalletIsConnected();
		if (network === 'Polygon Mumbai Testnet'){
			fetchMints();
		}
	}, [currentAccount, network]);

  return (
		<div className="App">
			<div className="container">
				<div className="header-container">
					<header>
						<div className="left">
							<p className="title"> ♾️ Green2Clean Name Service</p>
							<p className="subtitle">Register Your immortal .beans name on the Polygon blockchain!</p>
						</div>
						<div className="right">
							<img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
							{ currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
						</div>
					</header>
				</div>
				{!currentAccount && renderNotConnectedContainer()}
				{currentAccount && renderInputForm()}
				{mints && renderMints()}
				<br></br>
				<div className="beansPic">
					<img src="https://i.imgur.com/7qPq6HG.jpeg" alt="BEAN"></img>
				</div>			
				<div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built by ${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
}

export default App;
