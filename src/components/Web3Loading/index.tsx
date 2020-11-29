import React, { useEffect } from 'react';
import '../Home/Home.css';
import { useWeb3Context } from 'web3-react'


function Web3Loading() {
	const context = useWeb3Context();

	useEffect( () => {
		context.setFirstValidConnector(['MetaMask', 'Infura']);
	}, [context]);


	if (!context.active && !context.error) {
		// loading
		return (
			<div className="content">
				<h1 className="header">
					Web3 Loading
				</h1>
				<h1 className="subHeader">
					Ensure Meta Mask is Enabled and on the Kovan Network
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
				<h1 className="subHeader">
					Ensure Meta Mask is Enabled and on the Kovan Network
				</h1>
			</div>
		);

	} else {
		// success
		return (
			<div className="content">
			</div>
		);
	}
}

export default Web3Loading;