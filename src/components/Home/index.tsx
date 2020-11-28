import React, {useState, useEffect} from 'react';
import './Home.css';
import { useWeb3Context } from 'web3-react'
import VarSwapInfo from '../VarSwapInfo';
import { Link } from 'react-router-dom';
import { abi as OrganizerAbi } from '../../abi/organizer.js';


const OrganizerAddr = "0x68097753183Be39947d699dbd63f54198E4e821d";


function Home() {
	const context = useWeb3Context();

	const [instances, setInstances] = useState(null);

	useEffect( () => {
		context.setFirstValidConnector(['MetaMask', 'Infura']);
		if (!context.active || context.error) return;
		
		async function asyncUseEffect() {
			if (instances !== null) return;

			const OrganizerContract =  new context.library.eth.Contract(OrganizerAbi, OrganizerAddr);

			OrganizerContract.methods.varianceSwapInstancesLength().call().then(async (res: string) => {
				let length: number = parseInt(res);
				let requests: object[] = new Array(length);
				for (let i: number = 0; i < length; i++) {
					requests[i] = OrganizerContract.methods.varianceSwapInstances(i).call();
				}
				let results: string[] = (await Promise.all(requests)).map(x => x.toString());
				setInstances(results.map((address: string, index: number) => <VarSwapInfo address={address} link={true} key={index}/>));
			});
		}

		asyncUseEffect();
	}, [context]);


	if (!context.active && !context.error) {
		// loading
		return (
			<div className="content">
				<h1 className="header">
					Web3 Loading
				</h1>
			</div>
		);

	} else if (context.error) {
		//error
		return (
			<div className="content">
				<h1 className="header">
					Hey Degen U Got a Web3 Error
				</h1>
			</div>
		);

	} else {
		// success
		return (
			<div className="content">
				<h1 className="header">
					Variance Swaps
				</h1>
				<ul className="productList">
					{instances}
				</ul>
			</div>
		);
	}

}

export default Home;