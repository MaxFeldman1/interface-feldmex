import React, { useEffect } from 'react';
import '../Home/Home.css';

function About() {
	return (
		<div className="content">
		<h1 className="header">Feldmex Digital Asset Derivatives</h1>
		<h1 className="subHeader">Hedge Volatility Risk With Variance Swaps</h1>
		<br />
		<h1 className="subSubHeaderRight"><span>What Are Variance Swaps?</span></h1>
		<p>
			Variance Swaps are a financial instrument that allows users to hedge risk by buying or selling future annualized realized variance (variance is equal to volatility squared).
			In essence variance swaps allow counterparties to make isolated bets on the value of realized variance over some given interval on a given asset pair.
			This is useful for a number of purposes including hedging option trades and trading correlation between assets.
			For more information about variance swaps click <a href={"https://www.youtube.com/watch?v=SKn0zqHXZ9M&t=322s"} target="_blank">here</a>.
		</p>
		<h1 className="subSubHeaderLeft"><span>How is Annualized Variance Calculated?</span></h1>
		<p>
			Daily realized variance is calculated by squaring the standard deviation of daily precentage returns.
			To annualize the daily realized variance all we have to do is multiply by the number of days in the year (365.2422).
			Below is a javascript implementation to find annualized variance from a given price series of prices taken one day apart from each other.
		</p>
		<pre className="_code"><code>{`
		function getRealizedVariance(priceSeries) {
			dailyMulplicativeReturns = [];
			var cumulativeVariance = 0;
			var cumulativeMulplicativeReturns = 0;
			for (var i = 1; i < priceSeries.length; i++) {
				dailyMulplicativeReturns.push((priceSeries[i]/priceSeries[i-1])-1);
				cumulativeMulplicativeReturns += dailyMulplicativeReturns[i-1];
			}
			var meanMulplicativeReturn = cumulativeMulplicativeReturns/dailyMulplicativeReturns.length;
			for (var i = 0; i < dailyMulplicativeReturns.length; i++) {
				cumulativeVariance += Math.pow(dailyMulplicativeReturns[i]-meanMulplicativeReturn,2);
			}
			return 365.2422*cumulativeVariance/(dailyMulplicativeReturns.length-1);
		}
		`}</code></pre>
		<p>
			It should be noted that volatility is the standard deviation of percentage retuns.
			Thus variance is equal to volatility squared and volatility is equal to the square root of variance.
		</p>
		<h1 className="subSubHeaderRight"><span>Uses of Variance Swaps</span></h1>
		<p>
			Variance swaps are an effective method by which users may hedge the risk of dramatic increaces in volatility.
			This can give traders peace of mind knowing that they will be protected in the case of extreme volatility, whether that be to the upside or the downside.
			Variance swaps can also be useful for traders that have a specific view about the direction of volatility and wish to express this without having the delta risk that comes with options.
		</p>
		<h1 className="subSubHeaderLeft"><span>How Does it Work?</span></h1>
		<p>
			There are two kinds of Feldmex ERC20 Variance Tokens: long variance tokens, and short variance tokens.
			Long variance tokens pay out the realized annualized variance at the end of the period.
			It should be noted that long variance tokens will not payout more than the payout cap regardless of the average annualized variance.
			Short variance tokens pay out the payout cap minus the payout of the long variance token.
			When someone mints tokens they must post an amount of collateral equal to the payout cap.
			In return they will receive one long variance token and one short variance token.
		</p>

		<h1 className="subSubHeaderRight"><span>Meta Mask</span></h1>
		<p>
			In order to use this website users must use the Meta-Mask browser extention.<br />
			For more information about the Meta Mask browser extention click <a href={"https://www.youtube.com/watch?v=aw7Sh4APyPQ"} target="_blank">here</a>.<br />
			Currently Feldmex is running on the kovan testnetwork. To connect to this network you must add it in Meta Mask.<br />
			To switch to the Kovan testnet follow the directions below: 
		</p>
			<ol>
				<li>Open Meta Mask</li>
				<li>Click on the dropdown menu in the top center of the Meta Mask pop up</li>
				<li>For the testnet click on the option titled "Kovan Test Network"</li>
				<li>For the mainnet version click the option titled "Ethereum Mainnet"</li>
			</ol>
		<p>
			Every time you use the Feldmex be sure that you have Kovan as your selected network.
		</p>
		<h1 className="subSubHeaderLeft"><span>How To Use</span></h1>
		<p>
			There are two ways to aquire long or short Feldmex Variance Swap tokens.<br />
			The first is by minting the tokens on this website. The process of minting variance tokens is as follows.
		</p>
			<ol>
				<li>Go to the Feldmex homepage, select the swap you would like to mint</li>
				<li>Find the maximum payout for the swap and detirmine the amount you would like to mint</li>
				<li>Make sure that your ethereum wallet contains the amount you would like to mint * the maximum payout of the swap</li>
				<li>Click on the 'Mint Swaps' button and follow the steps</li>
				<li>Check your balances, The amount of long variance and short variance tokens you own should have both increaced by the amount you specified earlier</li>
			</ol>
		<p>
			Once you have minted the swaps you may realize that so long as you have the same amount of long variance and short variance tokens you have a net exposure of 0 to variance.
			You may wish to sell the long or short variance tokens. This may be done on any exchange that supports Feldmex variance tokens. <br />
			Conincidentially, The second method of aquiring variance tokens is by buying them directially off of an exchange such as Uniswap.
		</p>
		<h1 className="subSubHeaderRight"><span>Cotact Us</span></h1>
		<p>
			Email us at feldmex@protonmail.com<br />
			Join our <a href="https://discord.gg/HrBM8zV" target="_blank" color="orange">Discord</a>
		</p>
		</div>
	);
}

export default About;
