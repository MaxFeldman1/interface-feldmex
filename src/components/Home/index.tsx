import React, {useState, useEffect} from 'react';
import './Home.css';
import { useWeb3Context } from 'web3-react'
import Web3Loading from '../Web3Loading';
import VarSwapInfo from '../VarSwapInfo';
import { abi as OrganizerAbi } from '../../abi/organizer.js';


const MainnetOrganizerAddr = "0x0a297852c3F315196D2600d68DF999EeDdBAfC0F";

const KovanOrganizerAddr = "0x4b3BC1591e12EBe79e25c38239563112CB8f16cc";

function Home() {
	const context = useWeb3Context();

	const [instances, setInstances] = useState(null);
	
	const [onTestnet, setOnTestnet] = useState(null);

	useEffect( () => {
		if (!context.active || context.error) return;
		
		async function asyncUseEffect() {
			if (instances !== null) return;
			let _onTestnet = onTestnet;
			if (_onTestnet === null) {
				_onTestnet = (await context.library.eth.net.getId()) === 42;
				setOnTestnet(_onTestnet);
			}

			const OrganizerContract =  new context.library.eth.Contract(OrganizerAbi, _onTestnet ? KovanOrganizerAddr :  MainnetOrganizerAddr);

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
