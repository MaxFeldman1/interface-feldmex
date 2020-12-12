import React, {useState, useEffect} from 'react';
import '../Home/Home.css';
import { useWeb3Context } from 'web3-react'
import VarSwapInfo from '../VarSwapInfo';
import { abi as VarSwapHandlerAbi } from '../../abi/varianceSwapHandler.js';
import { abi as OracleAbi } from '../../abi/oracle.js';
import { abi as ERC20Abi } from '../../abi/ERC20.js';
import { abi as StakeHubAbi } from '../../abi/stakeHub.js';

const secondsPerDay = 24*60*60;

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
];

function getDateFormat(timestamp: string): string {
	var d = new Date(parseInt(timestamp)*1000);
	var day = d.getUTCDate();
	var month = monthNames[d.getUTCMonth()];
	var year = d.getUTCFullYear();
	var hours: string = d.getUTCHours().toString();
	var min: string = d.getUTCMinutes().toString();
	if (min === "0") min = "00";
	else if (min < "10") min = "0"+min;
	if (Math.floor(parseInt(hours)/12) > 0) {
		hours = (parseInt(hours)%12).toString();
		if (hours==="0") hours="12";
		hours+=':'+min;
		hours+=" pm";
	}
	else{
		if (hours==="0") hours="12";
		hours+=':'+min;
		hours+=" am";
	}
	return hours+', '+month+' '+day+', '+year+' UTC';
}

function removeNegative(str: string) {
	return str.replace('-', '');
}

function maxRewardsSingleStake(
	BN: any,
	secondsRemaining: number,
	inflator: string,
	balance: string,
	) {
	return (new BN(inflator)).mul(new BN(balance)).mul((new BN(secondsRemaining)).pow(new BN(2))).div(new BN(secondsPerDay));
}

function maxRewardsAllStakes(
	BN: any,
	lastStakingTimestamp: string,
	inflator0: string,
	inflator1: string,
	inflator2: string,
	stakes0: any,
	stakes1: any,
	stakes2: any
	) {
	var result = new BN(0);
	let lastStakingTSNum = parseInt(lastStakingTimestamp);
	for (let i = 0; i < stakes0.length; i++)
		result = result.add(maxRewardsSingleStake(BN, lastStakingTSNum-parseInt(stakes0[i].timestamp), inflator0, stakes0[i].amount));
	for (let i = 0; i < stakes1.length; i++)
		result = result.add(maxRewardsSingleStake(BN, lastStakingTSNum-parseInt(stakes1[i].timestamp), inflator1, stakes1[i].amount));
	for (let i = 0; i < stakes2.length; i++)
		result = result.add(maxRewardsSingleStake(BN, lastStakingTSNum-parseInt(stakes2[i].timestamp), inflator2, stakes2[i].amount));
	return result;
}

function getRealizedVariance(priceSeries: number[], dailyReturns: number[]) {
	let dailyMulplicativeReturns: number[] = [];
	for (var i = 1; i < priceSeries.length; i++) {
		dailyMulplicativeReturns.push((priceSeries[i]/priceSeries[i-1])-1);
	}
	return getRealizedAnnualizedVarianceFromReturns(dailyReturns.concat(dailyMulplicativeReturns));
}

function getVariance (array: number[]) {
  const n = array.length
  const mean = array.reduce((a, b) => a + b) / n
  return array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / (n-1);
}

function getRealizedAnnualizedVarianceFromReturns(array: number[]) {
	return 365.2422*getVariance(array);
}

function getBalanceString(bn: string, decimals: number) {
	var ret;
	if (bn.length <= decimals) ret = "0."+('0').repeat(decimals-bn.length)+bn;
	else ret = bn.substring(0, bn.length-decimals)+'.'+bn.substring(bn.length-decimals);
	//remove trailing 0s
	for (var i = ret.length-1; ret[i] === '0'; ret = ret.substring(0,i), i=ret.length-1){}
	if (ret[ret.length-1]==='.')ret = ret.substring(0,ret.length-1);
	return ret;
}

function getAmountFromAdjustedString(str: string, decimals: number): string {
	var halves = str.split('.');
	if (halves.length > 2) throw new Error('invalid string');
	var ret: string;
	if (halves.length === 1) ret = halves[0]+('0').repeat(decimals);
	else if (halves[1].length <= decimals) ret = halves[0]+halves[1]+('0').repeat(decimals-halves[1].length);
	else ret = halves[0]+halves[1].substring(0, decimals);
	var counter = 0;
	for(;counter<ret.length&&ret[counter]==='0';counter++){}
	ret = ret.substring(counter);
	return ret;
}

interface _BN {
	div: Function,
	mul: Function,
	add: Function,
	sub: Function,
	gcd: Function,
	toString: Function,
	toNumber: Function
}

async function approvePayoutAsset(context: any, amountString: string, payoutAssetAddress: string, payoutAssetSymbol: string, setApproval: Function) {
	if (!context.active || context.error) return;

	alert(`You will be prompted to approve to approve ${amountString} ${payoutAssetSymbol}`);

	const payoutAssetContract = new context.library.eth.Contract(ERC20Abi, payoutAssetAddress);

	const SwapAddress: string = window.location.pathname.split('/').slice(-1)[0];

	const forwardAdjString = getAmountFromAdjustedString(amountString, 18);

	let caught = false;

	try {
		await payoutAssetContract.methods.approve(SwapAddress, forwardAdjString).send({from: context.account});

	} catch (err) {caught = true; alert('Transaction Failed');}

	if (!caught)
		setApproval(forwardAdjString);

}

async function mintSwaps(
	context: any,
	amountString: string,
	approvalPayout: string,
	symbol: string,
	fee: string,
	setBalanceLong: Function,
	setBalanceShort: Function,
	setBalancePayout: Function
	) {
	if (!context.active || context.error) return;

	const SwapAddress: string = window.location.pathname.split('/').slice(-1)[0];

	const VarSwapContract = new context.library.eth.Contract(VarSwapHandlerAbi, SwapAddress);

	const forwardAdjString = getAmountFromAdjustedString(amountString, 18);

	let BN = context.library.utils.BN;

	const feeAdjForwardString = (new BN(forwardAdjString)).mul(new BN(10000 + parseInt(fee))).div(new BN(10000)).toString();

	if ((new BN(forwardAdjString)).cmp(new BN(approvalPayout)) === 1) {
		alert(`Before you mint ${amountString} swaps you must approve ${getBalanceString(feeAdjForwardString, 18)} ${symbol}`);
		return;
	}

	let caught = false;

	alert(`You will be prompted to mint ${amountString} long and short variance swaps for ${getBalanceString(feeAdjForwardString, 18)} ${symbol}`);

	try {
		await VarSwapContract.methods.mintVariance(context.account, forwardAdjString, true).send({from: context.account});
	} catch (err) {caught = true; alert('Transaction Failed');}

	if (!caught) {
		setBalanceLong("");
		setBalanceShort("");
		setBalancePayout("");
	}
}

async function burnSwaps(
	context: any,
	amountString: string,
	balanceLong: string,
	balanceShort: string,
	symbol: string,
	setBalanceLong: Function,
	setBalanceShort: Function,
	setBalancePayout: Function
	) {
	if (!context.active || context.error) return;

	const SwapAddress: string = window.location.pathname.split('/').slice(-1)[0];

	const VarSwapContract = new context.library.eth.Contract(VarSwapHandlerAbi, SwapAddress);

	const forwardAdjString = getAmountFromAdjustedString(amountString, 18);

	let BN = context.library.utils.BN;

	if ((new BN(forwardAdjString)).cmp(new BN(balanceLong)) === 1) {
		alert(`Before you brun ${amountString} swaps you must have at least ${amountString} long variance swap tokens`);
		return;
	}

	if ((new BN(forwardAdjString)).cmp(new BN(balanceShort)) === 1) {
		alert(`Before you brun ${amountString} swaps you must have at least ${amountString} short variance swap tokens`);
		return;
	}

	let caught = false;

	alert(`You will be prompted to burn ${amountString} long and short variance tokens to receive ${amountString} ${symbol}`);

	try {
		await VarSwapContract.methods.burnVariance(forwardAdjString, context.account).send({from: context.account});
	} catch (err) {caught = true; alert('Transaction Failed');}

	if (!caught) {
		setBalanceLong("");
		setBalanceShort("");
		setBalancePayout("");
	}
}

async function claimVariancePayout(
	context: any,
	SwapAddress: any,
	balanceLong: string,
	balanceShort: string,
	setBalanceLong: Function,
	setBalanceShort: Function,
	setBalancePayout: Function
	) {
	if (!context.active || context.error) return;

	if ((balanceLong === "0" || balanceLong === "") && (balanceShort === "0" || balanceShort === "")) {
		alert(`You must hold long or short variance tokens to claim payout`);
		return;
	}

	const VarSwapContract = new context.library.eth.Contract(VarSwapHandlerAbi, SwapAddress);

	let caught = false;

	alert(`You will be prompted to claim the payout from your variance tokens`);

	try {
		await VarSwapContract.methods.claim(context.account).send({from: context.account});
	} catch (err) {caught = true; alert('Transaction Failed')}

	if (!caught) {
		setBalanceLong("");
		setBalanceShort("");
		setBalancePayout("");
	}
}

async function claimRewardsPayout(
	context: any,
	stakeHub: any,
	balanceRewards: string,
	setBalancePayout: Function
	) {
	if (!context.active || context.error) return;

	if (balanceRewards === "0" || balanceRewards === "") {
		alert(`You must hold rewards tokens to claim reward payout`);
		return;
	}

	let caught = false;

	alert(`You will be prompted to claim your reward from your reward tokens`);

	try {
		await stakeHub.methods.claim().send({from: context.account});
	} catch (err) {caught = true; alert('Transaction Failed');}

	if (!caught) {
		setBalancePayout("0");
	}
}

async function openForRewardsDistribution(
		context: any,
		stakeHub: any,
		setClaimRewardsReady: Function
	) {
	if (!context.active || context.error) return;

	let caught = false;

	try {
		await stakeHub.methods.openForFundDistribution().send({from: context.account});
	} catch (err) {caught = true; alert('Transaction Failed');}

	if (!caught) {
		setClaimRewardsReady(true);
	}
}

async function approveLPToken(
	context: any,
	amountString: string,
	LPTknSymbol: string,
	LPToken: any,
	spenderAddress: string,
	setLPTokenApproval: Function
	) {
	if (!context.active || context.error) return;

	const forwardAdjString = getAmountFromAdjustedString(amountString, 18);

	let caught = false;

	alert(`You will be prompted to approve ${amountString} ${LPTknSymbol} Liquidity Tokens`);

	try {
		await LPToken.methods.approve(spenderAddress, forwardAdjString).send({from: context.account});
	} catch (err) {caught = true; alert('Transaction Failed')}

	if (!caught) {
		setLPTokenApproval(forwardAdjString);
	}
}

async function startStake(
	context: any,
	amountString: string,
	balanceLPTkn: string,
	approvalLPTkn: string,
	tknIndex: number,
	LPTknSymbol: string,
	StakeHub: any,
	setReloadStakes: Function,
	) {
	if (!context.active || context.error) return;

	const forwardAdjString = getAmountFromAdjustedString(amountString, 18);


	let BN = context.library.utils.BN;

	if ((new BN(forwardAdjString)).cmp(new BN(balanceLPTkn)) === 1) {
		alert(`Before you stake ${amountString} ${LPTknSymbol} Liquidity Tokens you must hold at least ${amountString} ${LPTknSymbol} Liquidity Tokens`);
		return;
	}

	if ((new BN(forwardAdjString)).cmp(new BN(approvalLPTkn)) === 1) {
		alert(`Please approve at least ${amountString} ${LPTknSymbol} first`);
		return;
	}

	let caught = false;

	alert(`You will be prompted to stake ${amountString} ${LPTknSymbol} Liquidity Tokens`);

	try {
		await StakeHub.methods.startStake(tknIndex, forwardAdjString, true).send({from: context.account});
	} catch (err) {caught = true; alert('Transaction Failed');}

	if (!caught) {
		setReloadStakes(true);
	}

}

async function endStakes(
	context: any,
	tknIndex: number,
	amtStakes: number,
	LPTknSymbol: string,
	stakeHub: any,
	setReloadStakes: Function
	) {
	if (!context.active || context.error) return;

	if (amtStakes === 0) {
		alert(`You must have at least 1 open stake to close your stakes`);
		return;
	}

	alert(`You will be prompted to close all ${LPTknSymbol} Liquidity Token stakes`);

	let caught = false;

	try {
		if (tknIndex === 0) {
			await stakeHub.methods.endAllStakes0(context.account).send({from: context.account});
		}
		else if (tknIndex === 1) {
			await stakeHub.methods.endAllStakes1(context.account).send({from: context.account});
		}
		else {
			await stakeHub.methods.endAllStakes2(context.account).send({from: context.account});
		}
	} catch (err) {caught = true; alert('Transaction Failed');}

	if (!caught) {
		setReloadStakes(true);
	}
}

function TradeVarSwap() {

	const context = useWeb3Context();

	const [balanceLong, setBalanceLong] = useState("");
	const [balanceShort, setBalanceShort] = useState("");
	const [balancePayout, setBalancePayout] = useState("");
	const [maxPayout, setMaxPayout] = useState("");
	const [payoutAtVarianceOf1, setPayoutAtVarianceOf1] = useState("");
	const [payoutAssetSymbol, setPayoutAssetSymbol] = useState("");
	const [payoutAssetAddress, setPayoutAssetAddress] = useState("");
	const [longVarAddress, setLongVarAddress] = useState("");
	const [shortVarAddress, setShortVarAddress] = useState("");
	const [fee, setFee] = useState("");
	const [iVolPayout, setIVolPayout] = useState(null);
	const [iVolRealized, setIVolRealized] = useState(null);
	const [daysSinceInception, setDaysSinceInception] = useState(null);
	const [startTimestamp, setStartTimestamp] = useState("");


	const [amountString, setAmountString] = useState("");
	const [approvalPayout, setApprovalPayout] = useState("");

	const [stakeContract, setStakeContract] = useState(null);
	const [lpTkn0, setLpTkn0] = useState(null);
	const [lpTkn1, setLpTkn1] = useState(null);
	const [lpTkn2, setLpTkn2] = useState(null);

	const [stakes0, setStakes0] = useState(null);
	const [stakes1, setStakes1] = useState(null);
	const [stakes2, setStakes2] = useState(null);

	const [balanceLPT0, setBalanceLPT0] = useState("");
	const [balanceLPT1, setBalanceLPT1] = useState("");
	const [balanceLPT2, setBalanceLPT2] = useState("");

	const [approvalLPT0, setApprovalLPT0] = useState("");
	const [approvalLPT1, setApprovalLPT1] = useState("");
	const [approvalLPT2, setApprovalLPT2] = useState("");

	const [inflator0, setInflator0] = useState("");
	const [inflator1, setInflator1] = useState("");
	const [inflator2, setInflator2] = useState("");

	const [lastStakingTimestamp, setLastStakingTimestamp] = useState("");
	const [endStakingTimestamp, setEndStakingTimestamp] = useState("");
	const [destructionTimestamp, setDestructionTimestamp] = useState("");

	const [claimVarianceReady, setClaimVarianceReady] = useState(false);
	const [claimRewardsReady, setClaimRewardsReady] = useState(false);
	const [reloadStakes, setReloadStakes] = useState(false);

	const [balanceRewardsToken, setBalanceRewardsToken] = useState("");
	const [minPayoutRewards, setMinPayoutRewards] = useState("");

	const [helperButtonState, setHelperButtonState] = useState(null);

	const SwapAddress: string = window.location.pathname.split('/').slice(-1)[0];

	useEffect(() => {
		if (!context.active || context.error) return;

		const VarSwapContract = new context.library.eth.Contract(VarSwapHandlerAbi, SwapAddress);

		async function asyncUseEffect() {

			if (balanceLong === "" && context.connectorName !== "Infura")
				setBalanceLong(await VarSwapContract.methods.balanceLong(context.account).call());
			if (balanceShort === "" && context.connectorName !== "Infura")
				setBalanceShort(await VarSwapContract.methods.balanceShort(context.account).call());
			if (payoutAssetAddress === ""){
				var _payoutAssetAddress = await VarSwapContract.methods.payoutAssetAddress().call();
				var payoutAssetContract = new context.library.eth.Contract(ERC20Abi, _payoutAssetAddress);
				setPayoutAssetAddress(_payoutAssetAddress);
				if (context.connectorName !== "Infura") {
					const [_symbol, _balance, _approval] = await Promise.all([
							payoutAssetContract.methods.symbol().call(),
							payoutAssetContract.methods.balanceOf(context.account).call(),
							payoutAssetContract.methods.allowance(context.account, SwapAddress).call()
						]);
					setPayoutAssetSymbol(_symbol);
					setBalancePayout(_balance);
					setApprovalPayout(_approval);
				}
			}
			if (payoutAssetAddress !== "" && context.connectorName === "Infura" && payoutAssetSymbol === "") {
				setPayoutAssetSymbol(await (new context.library.eth.Contract(ERC20Abi, payoutAssetAddress)).methods.symbol().call());
			}
			if (fee === "") {
				setFee(await VarSwapContract.methods.fee().call());
			}
			if (maxPayout === "") {
				let BN = context.library.utils.BN;
				let cap: _BN;
				let payoutAtVarianceOf1: _BN;
				cap = new BN(await VarSwapContract.methods.cap().call());
				setMaxPayout(cap.toString());
				payoutAtVarianceOf1 = new BN(await VarSwapContract.methods.payoutAtVarianceOf1().call());
				let volAtMax = Math.sqrt(cap.div(cap.gcd(payoutAtVarianceOf1)).toNumber()/payoutAtVarianceOf1.div(cap.gcd(payoutAtVarianceOf1)).toNumber());
				setPayoutAtVarianceOf1(payoutAtVarianceOf1.toString());
				setIVolPayout(volAtMax);
			}
			if (startTimestamp === "") {
				const [_longVarAddress, _shortVarAddress, _lengthOfSeries, _startTimestamp, dailyReturnsStrings, _claimVarianceReady] = await Promise.all([
						VarSwapContract.methods.longVarianceTokenAddress().call(),
						VarSwapContract.methods.shortVarianceTokenAddress().call(),
						VarSwapContract.methods.lengthOfPriceSeries().call().then((res: string) => parseInt(res)),
						VarSwapContract.methods.startTimestamp().call().then((res: string) => parseInt(res)),
						VarSwapContract.methods.getDailyReturns().call(),
						VarSwapContract.methods.ready().call()
					]);
				setStartTimestamp(_startTimestamp);
				setLongVarAddress(_longVarAddress);
				setShortVarAddress(_shortVarAddress);
				setClaimVarianceReady(_claimVarianceReady);
				let intervalsCalculated: number = dailyReturnsStrings.length;
				let dailyReturns: number[] = new Array(intervalsCalculated);

				for (let i = 0; i < intervalsCalculated; i++) {
					if (dailyReturnsStrings[i].substring(0,1) === "-")
						dailyReturns[i] = -1*parseFloat(getBalanceString(dailyReturnsStrings[i].substring(1), 36));
					else
						dailyReturns[i] = parseFloat(getBalanceString(dailyReturnsStrings[i],36));
				}
				let priceSeries = [];

				let currentTime = Math.floor((new Date()).getTime()/1000);
				if (currentTime-_startTimestamp > 2*secondsPerDay) {
					var oracleContract = new context.library.eth.Contract(OracleAbi, await VarSwapContract.methods.oracleAddress().call());
					var firstVarianceTS = _startTimestamp + (1+intervalsCalculated)*secondsPerDay;
					var length: number;
					if (currentTime > firstVarianceTS) {
						length= 1 + Math.ceil((currentTime-firstVarianceTS)/secondsPerDay);
						var lengthOfPriceSeriesRemaining: number = 1 + _lengthOfSeries - intervalsCalculated;
						length = length > lengthOfPriceSeriesRemaining ? lengthOfPriceSeriesRemaining : length;
						if (length < 2) length = 0;
					} else length = 0;
					priceSeries = Array(length);
					for (let i = 0, measureAt = firstVarianceTS-secondsPerDay; i < length; i++, measureAt += secondsPerDay){
						priceSeries[i] = await oracleContract.methods.fetchSpotAtTime(measureAt).call();
					}
					let annualizedRealVariance: number = getRealizedVariance(priceSeries, dailyReturns);
					let annualizedRealVolatility: number = Math.sqrt(annualizedRealVariance);
					length = Math.floor((currentTime-_startTimestamp)/secondsPerDay)-1;
					if (length > _lengthOfSeries) length = _lengthOfSeries;
					setDaysSinceInception(length);
					setIVolRealized(annualizedRealVolatility);
				}
			}
			if (stakeContract === null) {
				const stakeHub = new context.library.eth.Contract(StakeHubAbi, await VarSwapContract.methods.sendFeeTo().call());
				setStakeContract(stakeHub);
				const [stakeable0, stakeable1, stakeable2] = await Promise.all([
					stakeHub.methods.stakeable0().call().then((res: string) => (new context.library.eth.Contract(ERC20Abi, res))),
					stakeHub.methods.stakeable1().call().then((res: string) => (new context.library.eth.Contract(ERC20Abi, res))),
					stakeHub.methods.stakeable2().call().then((res: string) => (new context.library.eth.Contract(ERC20Abi, res))),
				]);
				setLpTkn0(stakeable0);
				setLpTkn1(stakeable1);
				setLpTkn2(stakeable2);

				await Promise.all([
					stakeHub.methods.inflator0().call(),
					stakeHub.methods.inflator1().call(),
					stakeHub.methods.inflator2().call(),
					stakeHub.methods.lastStakingTimestamp().call(),
					stakeHub.methods.endStakingTimestamp().call(),
					stakeHub.methods.destructionTimestamp().call()
				]).then((res: string[]) => {
					setInflator0(res[0]);
					setInflator1(res[1]);
					setInflator2(res[2]);
					setLastStakingTimestamp(res[3]);
					setEndStakingTimestamp(res[4]);
					setDestructionTimestamp(res[5]);
				});


				setReloadStakes(true);
			}
			if (reloadStakes && context.connectorName !== "Infura") {
				setReloadStakes(false);

				var userRewardsTokensBalance;
				stakeContract.methods.balanceOf(context.account).call()
					.then((res: string) => {userRewardsTokensBalance = res; setBalanceRewardsToken(res);});
				stakeContract.methods.readyForDistribution().call().then((res: boolean) => setClaimRewardsReady(res));

				Promise.all([
					lpTkn0.methods.balanceOf(context.account).call(),
					lpTkn1.methods.balanceOf(context.account).call(),
					lpTkn2.methods.balanceOf(context.account).call()
				]).then((res: string[]) => {
					setBalanceLPT0(res[0]);
					setBalanceLPT1(res[1]);
					setBalanceLPT2(res[2]);
				});

				Promise.all([
					lpTkn0.methods.allowance(context.account, stakeContract._address).call(),
					lpTkn1.methods.allowance(context.account, stakeContract._address).call(),
					lpTkn2.methods.allowance(context.account, stakeContract._address).call()
				]).then((res: string[]) => {
					setApprovalLPT0(res[0]);
					setApprovalLPT1(res[1]);
					setApprovalLPT2(res[2]);
				});

				let BN = context.library.utils.BN;

				let currentTime = Math.floor((new Date()).getTime()/1000);

				let expired = currentTime > parseInt(endStakingTimestamp);

				var minTotalRewardsPayout = new BN(0);

				var maxTotalSupplyRewardToken = new BN(0);

				var promise;
				if (expired) {
					promise = Promise.all([
						(new context.library.eth.Contract(ERC20Abi, payoutAssetAddress)).methods.balanceOf(stakeContract._address).call(),
						stakeContract.methods.totalSupply().call()
					]).then((res: string[]) => {
						minTotalRewardsPayout = new BN(res[0]);
						maxTotalSupplyRewardToken = new BN(res[1]);
					});
				} else {
					let maxTimeStaked = parseInt(startTimestamp) - parseInt(lastStakingTimestamp);
					promise = Promise.all([
						lpTkn0.methods.totalSupply().call(),
						lpTkn1.methods.totalSupply().call(),
						lpTkn2.methods.totalSupply().call(),
						stakeContract.methods.totalSupply().call(),
						(new context.library.eth.Contract(ERC20Abi, payoutAssetAddress)).methods.balanceOf(stakeContract._address).call(),
					]).then((res: string[]) => {
						var maxTkn0Rewards = (new BN(res[0])).mul(new BN(inflator0));
						var maxTkn1Rewards = (new BN(res[1])).mul(new BN(inflator1));
						var maxTkn2Rewards = (new BN(res[2])).mul(new BN(inflator2));
						maxTotalSupplyRewardToken = maxTkn0Rewards.add(maxTkn1Rewards).add(maxTkn2Rewards);
						maxTotalSupplyRewardToken = maxTotalSupplyRewardToken.mul((new BN(maxTimeStaked)).pow(new BN(2))).div((new BN(secondsPerDay)).pow(new BN(2)));
						maxTotalSupplyRewardToken = maxTotalSupplyRewardToken.add(new BN(res[3]));
						minTotalRewardsPayout = new BN(res[4]);
					});
				}

				var stats = await stakeContract.methods.getStats().call({from: context.account});
				var stakes0 = new Array(parseInt(stats._lenStakes0));
				var stakes1 = new Array(parseInt(stats._lenStakes1));
				var stakes2 = new Array(parseInt(stats._lenStakes2));

				for (let i = 0; i < stakes0.length; i++) {
					stakes0[i] = stakeContract.methods.stakes0(context.account, i).call();
				}
				for (let i = 0; i < stakes1.length; i++) {
					stakes1[i] = stakeContract.methods.stakes1(context.account, i).call();
				}
				for (let i = 0; i < stakes2.length; i++) {
					stakes2[i] = stakeContract.methods.stakes2(context.account, i).call();
				}
				var results = await Promise.all([Promise.all(stakes2), Promise.all(stakes2), Promise.all(stakes2)]);

				var userMaxRewardsTokens = maxRewardsAllStakes(
					BN,
					lastStakingTimestamp,
					inflator0,
					inflator1,
					inflator2,
					results[0],
					results[1],
					results[2]
				).add(new BN(userRewardsTokensBalance));
				await promise;
				//10% goes to contract owner
				minTotalRewardsPayout = minTotalRewardsPayout.mul(new BN(9)).div(new BN(10));
				var minUserRewards = userMaxRewardsTokens.mul(minTotalRewardsPayout).div(maxTotalSupplyRewardToken);

				setMinPayoutRewards(minUserRewards.toString());

				var elements0 = results[0].map((obj, index) => (<li key={index}>{getBalanceString(obj.amount, 18)} LP token stake started at {getDateFormat(obj.timestamp)}</li>));
				var elements1 = results[1].map((obj, index) => (<li key={index}>{getBalanceString(obj.amount, 18)} LP token stake started at {getDateFormat(obj.timestamp)}</li>));
				var elements2 = results[2].map((obj, index) => (<li key={index}>{getBalanceString(obj.amount, 18)} LP token stake started at {getDateFormat(obj.timestamp)}</li>));

				setStakes0(elements0);
				setStakes1(elements1);
				setStakes2(elements2);
			}

		}

		asyncUseEffect();

	});
	
	if (!context.active || context.error) return (<div className="content"></div>);

	var currentTime = Math.floor((new Date()).getTime()/1000);

	const mainInfo = (
			<div>
				<h1 className="header">Trade Variance Swaps</h1>
				<VarSwapInfo address={SwapAddress} link={false}/>
				<h2>Balance Long Variance Tokens(LVT): {getBalanceString(balanceLong, 18)}</h2>
				<h2>Balance Short Variance Tokens(SVT): {getBalanceString(balanceShort, 18)}</h2>
				<h2>Balance {payoutAssetSymbol}: {getBalanceString(balancePayout, 18)}</h2>
				<h2>Max Payout: {getBalanceString(maxPayout,18)} {payoutAssetSymbol}</h2>
				<h2>Implied Annualized Volatility at Maximum Payout: {(iVolPayout*100).toPrecision(6)}%</h2>
				<h2>Implied Annualized Variance at Maximum Payout: {(iVolPayout*100).toPrecision(6)}%<sup>2</sup> = {(iVolPayout**2).toPrecision(6)}</h2>
				<h2>Realized Volatility over first {daysSinceInception} days: {(iVolRealized*100).toPrecision(6)}%</h2>
				<h2>Realized Volatility over first {daysSinceInception} days: {(iVolRealized*100).toPrecision(6)}%<sup>2</sup> = {(iVolRealized**2).toPrecision(6)}</h2>
			</div>
		);

	var outputFromHelpButtons;
	if (helperButtonState === 1){
		let volatility = parseFloat(amountString);
		let variance = Math.pow(volatility/100, 2);
		let uncappedLVT = variance * parseFloat(getBalanceString(payoutAtVarianceOf1, 18));
		let cappedLVT = Math.min(1.0, uncappedLVT);
		let SVT = 1.0 - cappedLVT;
		outputFromHelpButtons = (
			<div>
				<h2>
					With Volatility of {volatility.toPrecision(6)}%,
					the Variance is {variance.toPrecision(6)},
					the uncapped payout of each LVT is {uncappedLVT.toPrecision(6)},
					the capped payout of each LVT is {cappedLVT.toPrecision(6)},
					and the payout of each SVT is {SVT.toPrecision(6)}
				</h2>
			</div>
		);
	}
	else if (helperButtonState === 2) {
		let variance = parseFloat(amountString);
		let volatility = Math.sqrt(variance)*100.0;
		let uncappedLVT = variance * parseFloat(getBalanceString(payoutAtVarianceOf1, 18));
		let cappedLVT = Math.min(1.0, uncappedLVT);
		let SVT = 1.0 - cappedLVT;
		outputFromHelpButtons = (
			<div>
				<h2>
					With Variance of {variance.toPrecision(6)},
					Volatility is {volatility.toPrecision(6)}%,
					the uncapped payout of each LVT is {uncappedLVT.toPrecision(6)},
					the capped payout of each LVT is {cappedLVT.toPrecision(6)},
					and the payout of each SVT is {SVT.toPrecision(6)}
				</h2>
			</div>
		);
	}
	else if (helperButtonState === 3) {
		let uncappedLVT = parseFloat(amountString);
		let variance = uncappedLVT / parseFloat(getBalanceString(payoutAtVarianceOf1, 18));
		let volatility = Math.sqrt(variance)*100.0;
		let cappedLVT = Math.min(1.0, uncappedLVT);
		let SVT = 1.0 - cappedLVT;
		outputFromHelpButtons = (
			<div>
				<h2>
					With an uncapped payout of each LVT of {uncappedLVT.toPrecision(6)},
					the capped payout of each LVT is {cappedLVT.toPrecision(6)},
					the payout of each SVT is {SVT.toPrecision(6)},
					the Variance is {variance.toPrecision(6)},
					and the Volatility is {volatility.toPrecision(6)}%
				</h2>
			</div>
		);
	}	

	else if (helperButtonState === 4) {
		let SVT = parseFloat(amountString);
		let LVT = 1.0 - SVT;
		let variance = LVT / parseFloat(getBalanceString(payoutAtVarianceOf1, 18));
		let volatility = Math.sqrt(variance)*100.0;
		if (SVT <= 1.0)
			outputFromHelpButtons = (
				<div>
					<h2>
						With a SVT payout of {SVT.toPrecision(6)},
						the payout of each LVT is {LVT.toPrecision(6)},
						the Variance is {variance.toPrecision(6)},
						and the Volatility is {volatility.toPrecision(6)}%
					</h2>
				</div>
			);
		else
			outputFromHelpButtons = (<h2>Payout of SVT can never be more than 1.0</h2>)
	}

	else if (helperButtonState === 5) {
		let LVT_SVT = parseFloat(amountString);
		/*
			LVT/SVT == LVT_SVT
			LVT + SVT == 1.0
			LVT == 1.0 - SVT
			(1.0-SVT)/SVT == LVT_SVT
			(1.0-SVT) == LVT_SVT * SVT
			1.0 == LVT_SVT * SVT + SVT
			1.0 == SVT * (LVT_SVT + 1.0)
			SVT == 1.0 / (LVT_SVT + 1.0)
		*/
		let SVT = 1.0 / (LVT_SVT + 1.0);
		let LVT = 1.0 - SVT;
		let variance = LVT / parseFloat(getBalanceString(payoutAtVarianceOf1, 18));
		let volatility = Math.sqrt(variance)*100.0;
		if (SVT <= 1.0)
			outputFromHelpButtons = (
				<div>
					<h2>
						With a LVT/SVT payout ratio of {LVT_SVT.toPrecision(6)},
						the payout of each SVT is {SVT.toPrecision(6)},
						the payout of each LVT is {LVT.toPrecision(6)},
						the Variance is {variance.toPrecision(6)},
						and the Volatility is {volatility.toPrecision(6)}%
					</h2>
				</div>
			);
		else
			outputFromHelpButtons = (<h2>SVT can never be more than 1.0</h2>)
	}

	else
		outputFromHelpButtons = (
			<div></div>
		);

	const helperButtons = (
			<div>
				<div className="buttonBox">
					<button onClick={() => setHelperButtonState(1)}>Volatility(%) to Payout</button>
					<button onClick={() => setHelperButtonState(2)}>Variance to Payout</button>
				</div>
				<div className="_3buttonBox">

					<button onClick={() => setHelperButtonState(3)}>Price (LVT/{payoutAssetSymbol}) to break even Volatility and Variance</button>
					<button onClick={() => setHelperButtonState(4)}>Price (SVT/{payoutAssetSymbol}) to break even Volatility and Variance</button>
					<button onClick={() => setHelperButtonState(5)}>Price (LVT/SVT) to break even Volatility and Variance</button>
				</div>
				{outputFromHelpButtons}
			</div>
		);

	const mainButtons = claimVarianceReady ? 
		(
			<div>
				<div className="spanButton">
					<button onClick={() => claimVariancePayout(context, SwapAddress, balanceLong, balanceShort, setBalanceLong, setBalanceShort, setBalancePayout)}>
						Claim Variance Payout
					</button>
				</div>				
			</div>
		)
		:
		(			
			<div>
				<div className="spanButton">
					<button onClick={() => approvePayoutAsset(context, amountString, payoutAssetAddress, payoutAssetSymbol, setApprovalPayout)}>
						Approve {payoutAssetSymbol}
					</button>
				</div>

				<br />

				<div className="buttonBox">
					<button onClick={() => mintSwaps(context, amountString, approvalPayout, payoutAssetSymbol, fee, setBalanceLong, setBalanceShort, setBalancePayout)}>Mint Swaps</button>
					<button onClick={() => burnSwaps(context, amountString, balanceLong, balanceShort, payoutAssetSymbol, setBalanceLong, setBalanceShort, setBalancePayout)}>Burn Swaps</button>
				</div>

				<br />

				<span className="InputTitle">Amount: </span>
				<input className="InputField" value={amountString} type="number" onChange={(event: any) => {setAmountString(removeNegative(event.target.value))}}/>
			</div>
		);

	const rewardsInfo = (
			<div>
				<h2>Balance Rewards Tokens: {getBalanceString(balanceRewardsToken, 18)}</h2>
				{
					balanceRewardsToken !== "0" && balanceRewardsToken !== "" ?
					<h2>Your Minimum Rewards (If Stakes Close at {getDateFormat(lastStakingTimestamp)}): {getBalanceString(minPayoutRewards, 18)}</h2>
					:
					<span></span>
				}
			</div>
		);

	const rewardsButtons = currentTime > parseInt(endStakingTimestamp)?
		(
			claimRewardsReady ?
			(<div className="spanButton" onClick={() => claimRewardsPayout(context, stakeContract, balanceRewardsToken, setBalanceRewardsToken)}>
				Claim Rewards
			</div>)
			:
			(<div className="spanButton" onClick={() => openForRewardsDistribution(context, stakeContract, setClaimRewardsReady)}>
				Enable Rewards To Be Claimed
			</div>)
		)
		:
		(<div></div>);

	const pool0HeaderAndLinks =
		(
			<div>
				<h1 className="header">LVT / {payoutAssetSymbol} Uniswap Pool</h1>
				<h2>Balance LP Tokens {getBalanceString(balanceLPT0, 18)}</h2>
				<div className="_3buttonBox">
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://app.uniswap.org/#/swap?inputCurrency="+longVarAddress+"&outputCurrency="+payoutAssetAddress}>Swap</a></button>
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://app.uniswap.org/#/add/"+longVarAddress+"/"+payoutAssetAddress}>Add Liquidity</a></button>
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://app.uniswap.org/#/remove/"+longVarAddress+"/"+payoutAssetAddress}>Remove Liquidity</a></button>
				</div>
			</div>
		);
	const pool0Staking = 
		(
			<div>
				<h1 className="subHeader">Staking</h1>
				<h2>Rewards Tokens = {inflator0} * Amount Staked * Days Staked<sup>2</sup></h2>
				<ol>
					{stakes0 !== null && stakes0.length > 0 ? stakes0 : <li>Currently There Are No Open Stakes</li>}
				</ol>
			</div>
		);
	const pool0Core = currentTime > parseInt(lastStakingTimestamp) ?
		(
			<div>
				<div className="spanButton">
					<button onClick={() => endStakes(context, 0, (stakes0 === null ? 0 : stakes0.length), `LVT / ${payoutAssetSymbol}`, stakeContract, setReloadStakes)}>End All Stakes</button>
				</div>
			</div>
		)
		:
		(
			<div>
				<div className="_3buttonBox">
					<button onClick={() => approveLPToken(context, amountString, `LVT / ${payoutAssetSymbol}`, lpTkn0, stakeContract._address, setApprovalLPT0)}>Approve LVT / {payoutAssetSymbol}</button>
					<button onClick={() => startStake(context, amountString, balanceLPT0, approvalLPT0, 0, `LVT / ${payoutAssetSymbol}`, stakeContract, setReloadStakes)}>Start Stake</button>
					<button onClick={() => endStakes(context, 0, (stakes0 === null ? 0 : stakes0.length), `LVT / ${payoutAssetSymbol}`, stakeContract, setReloadStakes)}>End All Stakes</button>
				</div>
				<span className="InputTitle">Amount: </span>
				<input className="InputField" value={amountString} type="number" onChange={(event: any) => {setAmountString(removeNegative(event.target.value))}}/>
			</div>
		);

	const pool1HeaderAndLinks =
		(
			<div>
				<h1 className="header">LVT / SVT Uniswap Pool</h1>
				<h2>Balance LP Tokens {getBalanceString(balanceLPT1, 18)}</h2>
				<div className="_3buttonBox">
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://app.uniswap.org/#/swap?inputCurrency="+longVarAddress+"&outputCurrency="+shortVarAddress}>Swap</a></button>
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://app.uniswap.org/#/add/"+longVarAddress+"/"+shortVarAddress}>Add Liquidity</a></button>
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://app.uniswap.org/#/remove/"+longVarAddress+"/"+shortVarAddress}>Remove Liquidity</a></button>
				</div>
			</div>
		);
	const pool1Staking = 
		(
			<div>
				<h1 className="subHeader">Staking</h1>
				<h2>Rewards Tokens = {inflator1} * Amount Staked * Days Staked<sup>2</sup></h2>
				<ol>
					{stakes1 !== null && stakes1.length > 0 ? stakes1 : <li>Currently There Are No Open Stakes</li>}
				</ol>
			</div>
		);
	const pool1Core = currentTime > parseInt(lastStakingTimestamp) ?
		(
			<div>
				<div className="spanButton">
					<button onClick={() => endStakes(context, 1, (stakes1 === null ? 0 : stakes1.length), `LVT / SVT`, stakeContract, setReloadStakes)}>End All Stakes</button>
				</div>
			</div>
		)
		:
		(
			<div>
				<div className="_3buttonBox">
					<button onClick={() => approveLPToken(context, amountString, `LVT / SVT`, lpTkn1, stakeContract._address, setApprovalLPT1)}>Approve LVT / SVT</button>
					<button onClick={() => startStake(context, amountString, balanceLPT1, approvalLPT1, 1, `LVT / SVT`, stakeContract, setReloadStakes)}>Start Stake</button>
					<button onClick={() => endStakes(context, 1, (stakes1 === null ? 0 : stakes1.length), `LVT / SVT`, stakeContract, setReloadStakes)}>End All Stakes</button>
				</div>

				<span className="InputTitle">Amount: </span>
				<input className="InputField" value={amountString} type="number" onChange={(event: any) => {setAmountString(removeNegative(event.target.value))}}/>
			</div>
		);

	const pool2HeaderAndLinks =
		(
			<div>
				<h1 className="header">SVT / {payoutAssetSymbol} Uniswap Pool</h1>
				<h2>Balance LP Tokens {getBalanceString(balanceLPT2, 18)}</h2>
				<div className="_3buttonBox">
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://app.uniswap.org/#/swap?inputCurrency="+shortVarAddress+"&outputCurrency="+payoutAssetAddress}>Swap</a></button>
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://app.uniswap.org/#/add/"+shortVarAddress+"/"+payoutAssetAddress}>Add Liquidity</a></button>
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://app.uniswap.org/#/remove/"+shortVarAddress+"/"+payoutAssetAddress}>Remove Liquidity</a></button>
				</div>
			</div>
		);
	const pool2Staking = 
		(
			<div>
				<h1 className="subHeader">Staking</h1>
				<h2>Rewards Tokens = {inflator2} * Amount Staked * Days Staked<sup>2</sup></h2>
				<ol>
					{stakes2 !== null && stakes2.length > 0 ? stakes2 : <li>Currently There Are No Open Stakes</li>}
				</ol>
			</div>
		);
	const pool2Core = currentTime > parseInt(lastStakingTimestamp) ?
		(
			<div>
				<div className="spanButton">
					<button onClick={() => endStakes(context, 2, (stakes2 === null ? 0 : stakes1.length), `SVT / ${payoutAssetSymbol}`, stakeContract, setReloadStakes)}>End All Stakes</button>
				</div>
			</div>
		)
		:
		(
			<div>
				<div className="_3buttonBox">
					<button onClick={() => approveLPToken(context, amountString, `SVT / ${payoutAssetSymbol}`, lpTkn2, stakeContract._address, setApprovalLPT2)}>Approve SVT / {payoutAssetSymbol}</button>
					<button onClick={() => startStake(context, amountString, balanceLPT2, approvalLPT2, 2, `SVT / ${payoutAssetSymbol}`, stakeContract, setReloadStakes)}>Start Stake</button>
					<button onClick={() => endStakes(context, 2, (stakes2 === null ? 0 : stakes1.length), `SVT / ${payoutAssetSymbol}`, stakeContract, setReloadStakes)}>End All Stakes</button>
				</div>

				<span className="InputTitle">Amount: </span>
				<input className="InputField" value={amountString} type="number" onChange={(event: any) => {setAmountString(removeNegative(event.target.value))}}/>
			</div>
		);

	const notice = (
			<div>
				<h1 className="header">NOTICE</h1>
				<h2>Stakes will be rewarded for all time spent staking up to {getDateFormat(lastStakingTimestamp)}</h2>
				<h2>Stakes not closed before {getDateFormat(endStakingTimestamp)} will not receive any rewards</h2>
				<h2>Stakes not closed before {getDateFormat(destructionTimestamp)} will be subject to total loss of funds</h2>
			</div>
		);

	const content = (
		<div className="content">

			{mainInfo}
			{rewardsInfo}


			{rewardsButtons}
			{mainButtons}

			<br />

			{helperButtons}

			<br />

			{pool0HeaderAndLinks}
			{pool0Core}
			{pool0Staking}

			<br />

			{pool1HeaderAndLinks}
			{pool1Core}
			{pool1Staking}

			<br />

			{pool2HeaderAndLinks}
			{pool2Core}
			{pool2Staking}

			{notice}
		</div>
		);

	return content;
}

export default TradeVarSwap;