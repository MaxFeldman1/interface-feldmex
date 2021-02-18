import React, {useState, useEffect} from 'react';
import '../Home/Home.css';
import { useWeb3Context } from 'web3-react'
import VarSwapInfo from '../VarSwapInfo';
import { abi as VarSwapHandlerAbi } from '../../abi/varianceSwapHandler.js';
import { abi as OracleContainerAbi } from '../../abi/OracleContainer.js';
import { abi as ERC20Abi } from '../../abi/ERC20.js';
import { abi as StakeHubAbi } from '../../abi/stakeHub.js';
import { abi as LendingPoolAbi } from '../../abi/LendingPool.js';
import { abi as ATokenAbi } from '../../abi/IAToken.js';

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
	balance: string
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
	if (ret === "") ret = "0";
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

interface stake {
	amount: string,
	timestamp: string
}

async function approvePayoutAsset(
	context: any,
	amountString: string,
	payoutAssetAddress: string,
	payoutAssetSymbol: string,
	payoutAssetDecimals: number,
	setApproval: Function) {
	if (!context.active || context.error) return;

	if(amountString === "") {
		alert('Please enter valid amount');
		return;
	}

	alert(`You will be prompted to approve to approve ${amountString} ${payoutAssetSymbol}`);

	const payoutAssetContract = new context.library.eth.Contract(ERC20Abi, payoutAssetAddress);

	const SwapAddress: string = window.location.pathname.split('/').slice(-1)[0];

	const forwardAdjString = getAmountFromAdjustedString(amountString, payoutAssetDecimals);

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
	payoutAssetDecimals: number,
	approvalPayout: string,
	balancePayout: string,
	symbol: string,
	fee: string,
	setBalanceLong: Function,
	setBalanceShort: Function,
	setBalancePayout: Function
	) {
	if (!context.active || context.error) return;

	const SwapAddress: string = window.location.pathname.split('/').slice(-1)[0];

	const VarSwapContract = new context.library.eth.Contract(VarSwapHandlerAbi, SwapAddress);

	const forwardAdjString = getAmountFromAdjustedString(amountString, payoutAssetDecimals);

	let BN = context.library.utils.BN;

	if ((new BN(forwardAdjString)).cmp(new BN(0)) < 1) {
		alert(`You can only mint a positive number of swaps`);
		return;
	}

	if ((new BN(forwardAdjString)).cmp(new BN(approvalPayout)) === 1) {
		alert(`First approve ${amountString} ${symbol} to be spent`);
		return;
	}

	if ((new BN(forwardAdjString)).cmp(new BN(balancePayout)) === 1) {
		alert(`Insufficient balance ${symbol}`);
		return;
	}

	let caught = false;

	alert(`You will be prompted to spend ${amountString} ${symbol} to mint long and short variance swaps with a ${getBalanceString(fee, 2)}% fee`);

	try {
		await VarSwapContract.methods.mintVariance(context.account, forwardAdjString).send({from: context.account});
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
	maxPayout: string,
	symbol: string,
	payoutAssetDecimals: number,
	setBalanceLong: Function,
	setBalanceShort: Function,
	setBalancePayout: Function
	) {
	if (!context.active || context.error) return;

	const SwapAddress: string = window.location.pathname.split('/').slice(-1)[0];

	const VarSwapContract = new context.library.eth.Contract(VarSwapHandlerAbi, SwapAddress);

	const forwardAdjString = getAmountFromAdjustedString(amountString, 18);
	
	let BN = context.library.utils.BN;

	const payout = (new BN(maxPayout)).mul(new BN(forwardAdjString));

	if ((new BN(forwardAdjString)).cmp(new BN(0)) < 1) {
		alert(`You can only burn a positive number of swaps`);
		return;
	}

	if ((new BN(forwardAdjString)).cmp(new BN(balanceLong)) === 1) {
		alert(`Before you brun ${amountString} swaps you must have at least ${amountString} long variance swap tokens`);
		return;
	}

	if ((new BN(forwardAdjString)).cmp(new BN(balanceShort)) === 1) {
		alert(`Before you brun ${amountString} swaps you must have at least ${amountString} short variance swap tokens`);
		return;
	}

	let caught = false;

	alert(`You will be prompted to burn ${amountString} long and short variance tokens to receive ${getBalanceString(amountString, payoutAssetDecimals)} ${symbol}`);

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

	if(amountString === "") {
		alert('Please enter valid amount');	
		return;                            	
	}                                          	

	var forwardAdjString = getAmountFromAdjustedString(amountString, 18);

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

	if ((new BN(forwardAdjString)).cmp(new BN(0)) < 1) {
		alert(`You can only stake a positive number of liquidity tokens`);
		return;
	}

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

	const [onTestnet, setOnTestnet] = useState(null);

	const [balanceLong, setBalanceLong] = useState("");
	const [balanceShort, setBalanceShort] = useState("");
	const [balancePayout, setBalancePayout] = useState("");
	const [maxPayout, setMaxPayout] = useState("");
	const [payoutAtVarianceOf1, setPayoutAtVarianceOf1] = useState("");
	const [payoutAssetSymbol, setPayoutAssetSymbol] = useState("");
	const [payoutAssetAddress, setPayoutAssetAddress] = useState("");
	const [payoutAssetDecimals, setPayoutAssetDecimals] = useState(0);
	const [longVarAddress, setLongVarAddress] = useState("");
	const [shortVarAddress, setShortVarAddress] = useState("");
	const [fee, setFee] = useState("");
	const [iVolPayout, setIVolPayout] = useState(null);
	const [iVolRealized, setIVolRealized] = useState(null);
	const [daysSinceInception, setDaysSinceInception] = useState(null);
	const [startTimestamp, setStartTimestamp] = useState("");

	const [cap, setCap] = useState("");

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

	const [helperButtonState, setHelperButtonState] = useState(null);

	const SwapAddress: string = window.location.pathname.split('/').slice(-1)[0];

	useEffect(() => {
		if (!context.active || context.error) return;

		const VarSwapContract = new context.library.eth.Contract(VarSwapHandlerAbi, SwapAddress);

		async function asyncUseEffect() {

			if (onTestnet === null) {
				let _onTestnet = (await context.library.eth.net.getId()) === 42;
				setOnTestnet(_onTestnet);
			}

			if (balanceLong === "" && context.connectorName !== "Infura")
				setBalanceLong(await VarSwapContract.methods.balanceLong(context.account).call());
			if (balanceShort === "" && context.connectorName !== "Infura")
				setBalanceShort(await VarSwapContract.methods.balanceShort(context.account).call());
			if (payoutAssetAddress === ""){
				var _payoutAssetAddress = await VarSwapContract.methods.payoutAssetAddress().call();
				var payoutAssetContract = new context.library.eth.Contract(ERC20Abi, _payoutAssetAddress);
				setPayoutAssetAddress(_payoutAssetAddress);
				const [_symbol, _decimals] = await Promise.all([
					payoutAssetContract.methods.symbol().call(),
					payoutAssetContract.methods.decimals().call().then((res: string) => parseInt(res))

				]);
				setPayoutAssetSymbol(_symbol);
				setPayoutAssetDecimals(_decimals);
				if (context.connectorName !== "Infura") {
					const [_balance, _approval] = await Promise.all([
							payoutAssetContract.methods.balanceOf(context.account).call(),
							payoutAssetContract.methods.allowance(context.account, SwapAddress).call(),
					]);
					setBalancePayout(_balance);
					setApprovalPayout(_approval);
				}
			}
			if (payoutAssetAddress !== "" && balancePayout === "" && context.connectorName !== "Infura") {
				setBalancePayout(await (new context.library.eth.Contract(ERC20Abi, payoutAssetAddress)).methods.balanceOf(context.account).call());
			}
			if (payoutAssetAddress !== "" && context.connectorName === "Infura" && payoutAssetSymbol === "") {
				setPayoutAssetSymbol(await (new context.library.eth.Contract(ERC20Abi, payoutAssetAddress)).methods.symbol().call());
			}
			if (fee === "") {
				setFee(await VarSwapContract.methods.fee().call());
			}
			if (maxPayout === "" && payoutAssetAddress !== "") {
				let BN = context.library.utils.BN;
				let _cap: _BN;
				let payoutAtVarianceOf1: _BN;
				_cap = new BN(await VarSwapContract.methods.cap().call());
				//the address of the asset that the aToken settles to
				let payoutAssetContract = new context.library.eth.Contract(ATokenAbi, payoutAssetAddress);
				let underlyingAssetAddress = await payoutAssetContract.methods.UNDERLYING_ASSET_ADDRESS().call();
				let scaledContractBal = await payoutAssetContract.methods.scaledBalanceOf(VarSwapContract._address).call();
				let nonScaledContractBal = await payoutAssetContract.methods.balanceOf(VarSwapContract._address).call();
				let lendingPoolContract = new context.library.eth.Contract(LendingPoolAbi, await payoutAssetContract.methods.POOL().call());
				let reserveNormalizedIncome = new BN(await lendingPoolContract.methods.getReserveNormalizedIncome(underlyingAssetAddress).call());
				setMaxPayout(_cap.mul(reserveNormalizedIncome).div((new BN(10)).pow(new BN(27))).toString());
				payoutAtVarianceOf1 = new BN(await VarSwapContract.methods.payoutAtVarianceOf1().call());
				let volAtMax = Math.sqrt(_cap.div(_cap.gcd(payoutAtVarianceOf1)).toNumber()/payoutAtVarianceOf1.div(_cap.gcd(payoutAtVarianceOf1)).toNumber());
				setPayoutAtVarianceOf1(payoutAtVarianceOf1.mul(reserveNormalizedIncome).div((new BN(10)).pow(new BN(27))).toString());
				setIVolPayout(volAtMax);
				setCap(_cap.toString());
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
					var OracleContainerContract = new context.library.eth.Contract(OracleContainerAbi, await VarSwapContract.methods.oracleContainerAddress().call());
					var firstVarianceTS = _startTimestamp + (1+intervalsCalculated)*secondsPerDay;
					var length: number;
					
					if (currentTime > firstVarianceTS) {
						length= 1 + Math.ceil((currentTime-firstVarianceTS)/secondsPerDay);
						var lengthOfPriceSeriesRemaining: number = 1 + _lengthOfSeries - intervalsCalculated;
						length = length > lengthOfPriceSeriesRemaining ? lengthOfPriceSeriesRemaining : length;
						if (length < 2) length = 0;
					} else length = 0;
					priceSeries = Array(length);
					let phrase = await VarSwapContract.methods.phrase().call();
					for (let i = 0, measureAt = firstVarianceTS-secondsPerDay; i < length; i++, measureAt += secondsPerDay){
						priceSeries[i] = OracleContainerContract.methods.phraseToHistoricalPrice(phrase, measureAt).call().then((res: any) => res.spot);
					}
					priceSeries = await Promise.all(priceSeries);
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

				var results = await stakeContract.methods.allStakes(context.account).call();
				
				var elements0 = results._stakes0.map((obj: stake, index: number) => (<li key={index}>{getBalanceString(obj.amount, 18)} LP token stake started at {getDateFormat(obj.timestamp)}</li>));
				var elements1 = results._stakes1.map((obj: stake, index: number) => (<li key={index}>{getBalanceString(obj.amount, 18)} LP token stake started at {getDateFormat(obj.timestamp)}</li>));
				var elements2 = results._stakes2.map((obj: stake, index: number) => (<li key={index}>{getBalanceString(obj.amount, 18)} LP token stake started at {getDateFormat(obj.timestamp)}</li>));

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
				<div className="balance-container">
				<VarSwapInfo address={SwapAddress} link={false}/>
				<h2>Balance Long Variance Tokens(LVT): {getBalanceString(balanceLong, 18)}</h2>
				<h2>Balance Short Variance Tokens(SVT): {getBalanceString(balanceShort, 18)}</h2>
				<h2>Balance {payoutAssetSymbol}: {getBalanceString(balancePayout, payoutAssetDecimals)}</h2>
				<h2>Max Payout: {getBalanceString(maxPayout, payoutAssetDecimals)} {payoutAssetSymbol} + interest generated up to maturity</h2>
				<h2>Implied Annualized Volatility at Maximum Payout: {(iVolPayout*100).toPrecision(6)}%</h2>
				<h2>Implied Annualized Variance at Maximum Payout: {(iVolPayout*100).toPrecision(6)}%<sup>2</sup> = {(iVolPayout**2).toPrecision(6)}</h2>
				<h2>Realized Volatility over first {daysSinceInception} days: {(iVolRealized*100).toPrecision(6)}%</h2>
				<h2>Realized Variance over first {daysSinceInception} days: {(iVolRealized*100).toPrecision(6)}%<sup>2</sup> = {(iVolRealized**2).toPrecision(6)}</h2>
			</div>
			</div>
		);

	var outputFromHelpButtons;
	if (helperButtonState === 1){
		let volatility = parseFloat(amountString);
		let variance = Math.pow(volatility/100, 2);
		let uncappedLVT = variance * parseFloat(getBalanceString(payoutAtVarianceOf1, payoutAssetDecimals));
		let _maxPayout = parseFloat(getBalanceString(maxPayout, payoutAssetDecimals));
		let cappedLVT = Math.min(_maxPayout, uncappedLVT);
		let SVT = _maxPayout - cappedLVT;
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
		let uncappedLVT = variance * parseFloat(getBalanceString(payoutAtVarianceOf1, payoutAssetDecimals));
		let _maxPayout = parseFloat(getBalanceString(maxPayout, payoutAssetDecimals));
		let cappedLVT = Math.min(_maxPayout, uncappedLVT);
		let SVT = _maxPayout - cappedLVT;
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
		let variance = uncappedLVT / parseFloat(getBalanceString(payoutAtVarianceOf1, payoutAssetDecimals));
		let volatility = Math.sqrt(variance)*100.0;
		let _maxPayout = parseFloat(getBalanceString(maxPayout, payoutAssetDecimals));
		let cappedLVT = Math.min(_maxPayout, uncappedLVT);
		let SVT = _maxPayout - cappedLVT;
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
		let _maxPayout = parseFloat(getBalanceString(maxPayout, payoutAssetDecimals));
		let LVT = _maxPayout - SVT;
		let variance = LVT / parseFloat(getBalanceString(payoutAtVarianceOf1, payoutAssetDecimals));
		let volatility = Math.sqrt(variance)*100.0;
		if (SVT <= _maxPayout)
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
			outputFromHelpButtons = (<h2>Payout of SVT can never be more than {getBalanceString(maxPayout, 18)} + interest generated up to maturity</h2>)
	}

	else if (helperButtonState === 5) {
		let LVT_SVT = parseFloat(amountString);
		let _maxPayout = parseFloat(getBalanceString(maxPayout, payoutAssetDecimals));
		/*
			LVT/SVT == LVT_SVT
			LVT + SVT == _maxPayout
			LVT == _maxPayout - SVT
			(_maxPayout-SVT)/SVT == LVT_SVT
			(_maxPayout-SVT) == LVT_SVT * SVT
			_maxPayout == LVT_SVT * SVT + SVT
			_maxPayout == SVT * (LVT_SVT + 1.0)
			SVT == _maxPayout / (LVT_SVT + 1.0)
		*/
		let SVT = _maxPayout / (LVT_SVT + 1.0);
		let LVT = _maxPayout - SVT;
		let variance = LVT / parseFloat(getBalanceString(payoutAtVarianceOf1, payoutAssetDecimals));
		let volatility = Math.sqrt(variance)*100.0;
		if (SVT <= _maxPayout)
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
			outputFromHelpButtons = (<h2>SVT can never be more than {_maxPayout} + interest generated up to maturity</h2>);
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
					<button onClick={() => approvePayoutAsset(context, amountString, payoutAssetAddress, payoutAssetSymbol, payoutAssetDecimals, setApprovalPayout)}>
						Approve {payoutAssetSymbol}
					</button>
				</div>

				<br />

				<div className="buttonBox">
					<button onClick={() => mintSwaps(context, amountString, payoutAssetDecimals, approvalPayout, balancePayout, payoutAssetSymbol, fee, setBalanceLong, setBalanceShort, setBalancePayout)}>
						Mint Swaps from {amountString} {payoutAssetSymbol}
					</button>

					<button onClick={() => burnSwaps(context, amountString, balanceLong, balanceShort, maxPayout, payoutAssetSymbol, payoutAssetDecimals, setBalanceLong, setBalanceShort, setBalancePayout)}>
						Burn {amountString} Swaps
					</button>
				</div>

				<br />

				<span className="InputTitle">Amount: </span>
				<input className="InputField" value={amountString} type="number" onChange={(event: any) => {setAmountString(removeNegative(event.target.value))}}/>
			</div>
		);

	const rewardsInfo = (
			<div>
				<h2>Balance Rewards Tokens: {getBalanceString(balanceRewardsToken, 18)}</h2>
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
				<h1 className="header">LVT / {payoutAssetSymbol} Balancer Pool</h1>
				<h2>Balance LP Tokens {getBalanceString(balanceLPT0, 18)}</h2>
				<div className="_3buttonBox">
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://"+(onTestnet ? "kovan." : "")+"balancer.exchange/#/swap/"+longVarAddress+"/"+payoutAssetAddress}>Swap</a></button>
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://"+(onTestnet ? "kovan." : "")+"pools.balancer.exchange/#/pool/"+(lpTkn0 !== null ? lpTkn0._address: "")}>Add Liquidity</a></button>
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://"+(onTestnet ? "kovan." : "")+"pools.balancer.exchange/#/pool/"+(lpTkn0 !== null ? lpTkn0._address: "")}>Remove Liquidity</a></button>
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

	// const pool1HeaderAndLinks =
	// 	(
	// 		<div>
	// 			<h1 className="header">LVT / SVT Balancer Pool</h1>
	// 			<h2>Balance LP Tokens {getBalanceString(balanceLPT1, 18)}</h2>
	// 			<div className="_3buttonBox">
	// 				<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://"+(onTestnet ? "kovan." : "")+"balancer.exchange/#/swap/"+longVarAddress+"/"+shortVarAddress}>Swap</a></button>
	// 				<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://"+(onTestnet ? "kovan." : "")+"pools.balancer.exchange/#/pool/"+(lpTkn1 !== null ? lpTkn1._address : "")}>Add Liquidity</a></button>
	// 				<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://"+(onTestnet ? "kovan." : "")+"pools.balancer.exchange/#/pool/"+(lpTkn1 !== null ? lpTkn1._address : "")}>Remove Liquidity</a></button>
	// 			</div>
	// 		</div>
	// 	);
	// const pool1Staking = 
	// 	(
	// 		<div>
	// 			<h1 className="subHeader">Staking</h1>
	// 			<h2>Rewards Tokens = {inflator1} * Amount Staked * Days Staked<sup>2</sup></h2>
	// 			<ol>
	// 				{stakes1 !== null && stakes1.length > 0 ? stakes1 : <li>Currently There Are No Open Stakes</li>}
	// 			</ol>
	// 		</div>
	// 	);
	// const pool1Core = currentTime > parseInt(lastStakingTimestamp) ?
	// 	(
	// 		<div>
	// 			<div className="spanButton">
	// 				<button onClick={() => endStakes(context, 1, (stakes1 === null ? 0 : stakes1.length), `LVT / SVT`, stakeContract, setReloadStakes)}>End All Stakes</button>
	// 			</div>
	// 		</div>
	// 	)
	// 	:
	// 	(
	// 		<div>
	// 			<div className="_3buttonBox">
	// 				<button onClick={() => approveLPToken(context, amountString, `LVT / SVT`, lpTkn1, stakeContract._address, setApprovalLPT1)}>Approve LVT / SVT</button>
	// 				<button onClick={() => startStake(context, amountString, balanceLPT1, approvalLPT1, 1, `LVT / SVT`, stakeContract, setReloadStakes)}>Start Stake</button>
	// 				<button onClick={() => endStakes(context, 1, (stakes1 === null ? 0 : stakes1.length), `LVT / SVT`, stakeContract, setReloadStakes)}>End All Stakes</button>
	// 			</div>

	// 			<span className="InputTitle">Amount: </span>
	// 			<input className="InputField" value={amountString} type="number" onChange={(event: any) => {setAmountString(removeNegative(event.target.value))}}/>
	// 		</div>
	// 	);

	const pool2HeaderAndLinks =
		(
			<div>
				<h1 className="header">SVT / {payoutAssetSymbol} Balancer Pool</h1>
				<h2>Balance LP Tokens {getBalanceString(balanceLPT2, 18)}</h2>
				<div className="_3buttonBox">
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://"+(onTestnet ? "kovan." : "")+"balancer.exchange/#/swap/"+shortVarAddress+"/"+payoutAssetAddress}>Swap</a></button>
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://"+(onTestnet ? "kovan." : "")+"pools.balancer.exchange/#/pool/"+(lpTkn2 !== null ? lpTkn2._address : "")}>Add Liquidity</a></button>
					<button><a className="noDec" target="_blank" rel="noreferrer" href={"https://"+(onTestnet ? "kovan." : "")+"pools.balancer.exchange/#/pool/"+(lpTkn2 !== null ? lpTkn2._address : "")}>Remove Liquidity</a></button>
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
        <div className="simple-trade-background">
            <div className="simple-trade-content">
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

                {/* {pool1HeaderAndLinks}
			{pool1Core}
			{pool1Staking} */}

                <br />

                {pool2HeaderAndLinks}
                {pool2Core}
                {pool2Staking}

                {notice}
            </div>
        </div>
    );

	return content;
}

export default TradeVarSwap;
