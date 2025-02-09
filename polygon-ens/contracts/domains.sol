// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import { StringUtils } from "./libraries/StringUtils.sol";
import { Base64 } from "./libraries/Base64.sol";
import "hardhat/console.sol";

contract Domains is ERC721URIStorage {
    //custom error messages
    error Unauthorized();
    error AlreadyRegistered();
    error InvalidName(string name);
    error NotEnoughPaid();
    //create global owner var
    address payable public owner;

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    string public tld;//top level domain

    //storing image on chain as svg
    string svgPart1 = '<svg xmlns="http://www.w3.org/2000/svg" width="270" height="270" fill="none"><path fill="url(#B)" d="M0 0h270v270H0z"/><defs><filter id="A" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse" height="270" width="270"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity=".225" width="200%" height="200%"/></filter></defs><path d="M72.863 42.949c-.668-.387-1.426-.59-2.197-.59s-1.529.204-2.197.59l-10.081 6.032-6.85 3.934-10.081 6.032c-.668.387-1.426.59-2.197.59s-1.529-.204-2.197-.59l-8.013-4.721a4.52 4.52 0 0 1-1.589-1.616c-.384-.665-.594-1.418-.608-2.187v-9.31c-.013-.775.185-1.538.572-2.208a4.25 4.25 0 0 1 1.625-1.595l7.884-4.59c.668-.387 1.426-.59 2.197-.59s1.529.204 2.197.59l7.884 4.59a4.52 4.52 0 0 1 1.589 1.616c.384.665.594 1.418.608 2.187v6.032l6.85-4.065v-6.032c.013-.775-.185-1.538-.572-2.208a4.25 4.25 0 0 0-1.625-1.595L41.456 24.59c-.668-.387-1.426-.59-2.197-.59s-1.529.204-2.197.59l-14.864 8.655a4.25 4.25 0 0 0-1.625 1.595c-.387.67-.585 1.434-.572 2.208v17.441c-.013.775.185 1.538.572 2.208a4.25 4.25 0 0 0 1.625 1.595l14.864 8.655c.668.387 1.426.59 2.197.59s1.529-.204 2.197-.59l10.081-5.901 6.85-4.065 10.081-5.901c.668-.387 1.426-.59 2.197-.59s1.529.204 2.197.59l7.884 4.59a4.52 4.52 0 0 1 1.589 1.616c.384.665.594 1.418.608 2.187v9.311c.013.775-.185 1.538-.572 2.208a4.25 4.25 0 0 1-1.625 1.595l-7.884 4.721c-.668.387-1.426.59-2.197.59s-1.529-.204-2.197-.59l-7.884-4.59a4.52 4.52 0 0 1-1.589-1.616c-.385-.665-.594-1.418-.608-2.187v-6.032l-6.85 4.065v6.032c-.013.775.185 1.538.572 2.208a4.25 4.25 0 0 0 1.625 1.595l14.864 8.655c.668.387 1.426.59 2.197.59s1.529-.204 2.197-.59l14.864-8.655c.657-.394 1.204-.95 1.589-1.616s.594-1.418.609-2.187V55.538c.013-.775-.185-1.538-.572-2.208a4.25 4.25 0 0 0-1.625-1.595l-14.993-8.786z" fill="#fff"/><defs><linearGradient id="B" x1="0" y1="0" x2="270" y2="270" gradientUnits="userSpaceOnUse"><stop stop-color="#006BBE"/><stop offset="1" stop-color="#3FBE00" stop-opacity=".99"/></linearGradient></defs><text x="32.5" y="231" font-size="27" fill="#fff" filter="url(#A)" font-family="Plus Jakarta Sans,DejaVu Sans,Noto Color Emoji,Apple Color Emoji,sans-serif" font-weight="bold">';
    string svgPart2 = '</text></svg>';

    // a mapping data type to store domain names, maps domain string to address
    mapping(string => address) public domains;
    mapping(string => string) public records;
    //mapping to store domain names registered
    mapping (uint => string) public names;

    //make contract payable and pass tld
    constructor(string memory _tld) ERC721("Green2Clean Name Service", "GNS") payable {
        owner = payable(msg.sender);
        tld = _tld;
        console.log("%s name service deployed", _tld);
        console.log("Owner:", owner);
    }
    //get price of domain based on length
    //pure means doesn't read or modify contract state, just helper
    function price(string calldata name) public pure returns(uint) {
        uint len = StringUtils.strlen(name);
        require(len > 0);
        if (len == 3) {
            return 1 * 10**17;//1 matic = 1,000,000,000,000,000,000 18 dec = .1 matic
        } else if (len == 4) {
            return 3 * 10**17; // To charge smaller amounts, reduce the decimals. This is 0.3
        } else {
            return 1 * 10**17;
        }
    }

  //a register function that adds their names to our mapping
  function register(string calldata name) public payable {
      //check that domain name is unregistered, 0 means void
      //require(domains[name] == address(0));
      if (domains[name] != address(0)) revert AlreadyRegistered();
      uint _price = price(name);
      //check enough matic paid in txn
      require(msg.value >= _price, "Not enough Matic paid");
      //if (msg.value <= _price) revert NotEnoughPaid();
        //combine name with tld
        string memory _name = string(abi.encodePacked(name, ".", tld));    
        string memory finalSvg = string(abi.encodePacked(svgPart1, _name, svgPart2));
        uint256 newRecordId = _tokenIds.current();
        uint256 length = StringUtils.strlen(name);
            string memory strLen = Strings.toString(length);
        console.log("Registering %s.%s on the contract with tokenID %d", name, tld, newRecordId);
      //create json metadata 
    string memory json = Base64.encode(
        bytes(
            string(
                abi.encodePacked(
                    '{"name": "',
                    _name,
                    '", "description": "A domain on the Green2Clean name service", "image": "data:image/svg+xml;base64,',
                    Base64.encode(bytes(finalSvg)),
                    '","length":"',
                    strLen,
                    '"}'
                )
            )
        )
    );
      string memory finalTokenUri = string(abi.encodePacked("data:application/json;base64,", json));
      console.log("\n--------------------------------------------------------");
	  console.log("Final tokenURI:", finalTokenUri);
	  console.log("--------------------------------------------------------\n");  
    _safeMint(msg.sender, newRecordId);
    _setTokenURI(newRecordId, finalTokenUri);
      domains[name] = msg.sender;
      console.log("%s has registered a domain!", msg.sender);
    names[newRecordId] = name;
    _tokenIds.increment();  
  }
  //get domain owner's address
  //calldata location of where name address should be stored, nonpersistent immutable
  function getAddress(string calldata name) public view returns (address) {
      return domains[name];
  }
  function setRecord(string calldata name, string calldata record) public {
      //check that the txn sender is the owner 
      //require(domains[name] == msg.sender);
    if (msg.sender != domains[name]) revert Unauthorized();
      records[name] = record;
  }
  function getRecord(string calldata name) public view returns(string memory) {
      return records[name];
  }
    modifier onlyOwner() {
        //require(isOwner());
        if (!isOwner()) revert Unauthorized();
        _;
    }

    function isOwner() public view returns (bool) {
        return msg.sender == owner;
    }

    function withdraw() public onlyOwner {
        uint amount = address(this).balance;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Failed to withdraw Matic");
    }
    function getAllNames() public view returns (string[] memory) {
        console.log("Getting all names from contract");
        string[] memory allNames = new string[](_tokenIds.current());
        for (uint i = 0; i < _tokenIds.current(); i++) {
            allNames[i] = names[i];
            console.log("Name for token %d is %s", i, allNames[i]);
        }
        return allNames;
    } 
    function valid(string calldata name) public pure returns(bool) {
        return StringUtils.strlen(name) >= 3 && StringUtils.strlen(name) <=10;
    }
}