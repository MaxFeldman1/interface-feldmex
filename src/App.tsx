import React from 'react';
import {Route, Switch, BrowserRouter as Router} from 'react-router-dom';
import { Connectors } from 'web3-react';
import Web3Provider from 'web3-react';
import { withRouter } from 'react-router';
import { Helmet } from 'react-helmet';
import Web3 from 'web3';

import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import About from './components/About';
import TradeVarSwap from './components/TradeVarSwap';
import SimpleTradeVarSwap from './components/SimpleTradeVarSwap';
import Web3Loading from './components/Web3Loading';

const { InjectedConnector, NetworkOnlyConnector } = Connectors;
const MetaMask = new InjectedConnector({ supportedNetworks: [1, 42] });
const Infura = new NetworkOnlyConnector({
  providerURL: 'https://mainnet.infura.io/v3/130607aa3e804a5a9feab69f92045243'
})
const connectors = {MetaMask, Infura};


function App() {
  return (
	<div>
		<Helmet>
	  		<title>Feldmex Variance Swaps</title>
	  	</Helmet>

		  <Router>
				<Web3Provider
					connectors={connectors}
					libraryName={'web3.js'}
					web3Api={Web3}
				>
						<Header />
						<Web3Loading />
						<Route exact path="/" component={Home}/>
						<Route exact path="/trade2/:swapAddress" component={TradeVarSwap}/>
						<Route exact path="/trade/:swapAddress" component={SimpleTradeVarSwap}/>
						<Route exact path="/About" component={About}/>
						<Footer />
				</ Web3Provider>
		</Router>
  	</div>
  );
}

export default App;
