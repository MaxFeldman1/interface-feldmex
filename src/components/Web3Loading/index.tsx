import React, { useEffect, useState } from 'react';
import { useWeb3Context } from 'web3-react';
import { withRouter } from "react-router";

import '../Home/Home.css';

const nonWeb3Paths = ["About"];

function isUsingWeb3 () {
	let dirs = window.location.pathname.split('/');
	if (dirs.length < 2) return true;
	return !nonWeb3Paths.includes(dirs[1]);
}

interface _props {
	location: any
}

function Web3Loading(props: _props) {
	const context = useWeb3Context();
	useEffect( () => {
		context.setFirstValidConnector(['MetaMask', 'Infura']);

	}, [context, props.location]);

	var currentlyUsingWeb3 = isUsingWeb3();

	if (!context.active && !context.error && currentlyUsingWeb3) {
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

	} else if (context.error && currentlyUsingWeb3) {
		//error
		return (
			<div className="content">
				<h1 className="header">
					Web3 Error
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

export default withRouter(Web3Loading);