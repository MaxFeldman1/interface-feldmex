import React, {useState, useEffect} from 'react';
import './Home.css';
import { useWeb3Context } from 'web3-react'
import Web3Loading from '../Web3Loading';
import VarSwapInfo from '../VarSwapInfo';
import { abi as OrganizerAbi } from '../../abi/organizer.js';


const OrganizerAddr = "0xA62DeB0e07B2557ad5E3282F158F6Ff0f348EC97";


function Home() {
	const context = useWeb3Context();

	const [instances, setInstances] = useState(null);

	useEffect( () => {
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
	}, [context, instances]);


	if (context.active && !context.error) {
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
	else {
		return (<div></div>);
	}

}

export default Home;
