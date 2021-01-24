export var abi = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_bigMathAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_oracleContainerAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_tokenDeployerAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_stakeHubDeployerAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_lendingPoolAddress",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "varSwapIndex",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "varSwapAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "stakeHubAddress",
          "type": "address"
        }
      ],
      "name": "DeployStakeHub",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "lendingPoolAddress",
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
      "inputs": [],
      "name": "oracleContainerAddress",
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
      "inputs": [],
      "name": "stakeHubDeployerAddress",
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
      "inputs": [],
      "name": "tokenDeployerAddress",
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
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "varianceSwapInstances",
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
          "name": "",
          "type": "address"
        }
      ],
      "name": "varianceToStakeHub",
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
      "inputs": [],
      "name": "varianceSwapInstancesLength",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
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
          "internalType": "address",
          "name": "_payoutAssetAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_startTimestamp",
          "type": "uint256"
        },
        {
          "internalType": "uint16",
          "name": "_lengthOfPriceSeries",
          "type": "uint16"
        },
        {
          "internalType": "uint256",
          "name": "_payoutAtVarianceOf1",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_cap",
          "type": "uint256"
        }
      ],
      "name": "deployVarianceInstance",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_index",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_stakeable0",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_stakeable1",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_stakeable2",
          "type": "address"
        },
        {
          "internalType": "uint8",
          "name": "_inflator0",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "_inflator1",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "_inflator2",
          "type": "uint8"
        }
      ],
      "name": "addStakeHub",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];
