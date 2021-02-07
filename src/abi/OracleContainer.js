export var abi = [
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "name": "PairInfo",
      "outputs": [
        {
          "internalType": "address",
          "name": "baseAggregatorAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "oracleAddress",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_phrase",
          "type": "string"
        }
      ],
      "name": "deploy",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address[]",
          "name": "_facades",
          "type": "address[]"
        }
      ],
      "name": "addAggregators",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_phrase",
          "type": "string"
        }
      ],
      "name": "BaseAggregatorAddress",
      "outputs": [
        {
          "internalType": "address",
          "name": "addr",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_phrase",
          "type": "string"
        }
      ],
      "name": "OracleAddress",
      "outputs": [
        {
          "internalType": "address",
          "name": "addr",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_phrase",
          "type": "string"
        }
      ],
      "name": "phraseToLatestPrice",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "spot",
          "type": "uint256"
        },
        {
          "internalType": "uint8",
          "name": "decimals",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_phrase",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "_timestamp",
          "type": "uint256"
        }
      ],
      "name": "phraseToHistoricalPrice",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "spot",
          "type": "uint256"
        },
        {
          "internalType": "uint8",
          "name": "decimals",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    }
  ];
