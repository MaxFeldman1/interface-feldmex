import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3Context } from 'web3-react';
import { abi as VarSwapHandlerAbi } from '../../abi/varianceSwapHandler.js';
import { abi as ERC20Abi } from '../../abi/ERC20.js';

const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec',
];

function getDateFormatNoHours(timestamp: string) {
    var d = new Date(parseInt(timestamp) * 1000);
    var day = d.getUTCDate();
    var month = monthNames[d.getUTCMonth()];
    var year = d.getUTCFullYear();
    return month + ' ' + day + ', ' + year;
}

interface VarSwapProps {
    address: string;
    link: boolean;
}

function VarSwapInfo(props: VarSwapProps) {
    const context = useWeb3Context();

    const [phrase, setPhrase] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [paysIn, setPaysIn] = useState('');

    useEffect(() => {
        if (!context.active || context.error) return;

        const VarSwapContract = new context.library.eth.Contract(
            VarSwapHandlerAbi,
            props.address
        );
        if (phrase === '') {
            VarSwapContract.methods
                .phrase()
                .call()
                .then((res: string) => {
                    setPhrase(res);
                });
        }
        if (startDate === '') {
            let _startDate: string;
            VarSwapContract.methods
                .startTimestamp()
                .call()
                .then((res: string) => {
                    _startDate = res;
                    setStartDate(res);
                    return VarSwapContract.methods.lengthOfPriceSeries().call();
                })
                .then((res: string) => {
                    const secondsPerDay = 24 * 60 * 60;
                    setEndDate(
                        (
                            parseInt(_startDate) +
                            secondsPerDay * parseInt(res)
                        ).toString()
                    );
                });
        }
        if (paysIn === '') {
            VarSwapContract.methods
                .payoutAssetAddress()
                .call()
                .then((res: string) => {
                    return new context.library.eth.Contract(
                        ERC20Abi,
                        res
                    ).methods
                        .symbol()
                        .call();
                })
                .then((res: string) => {
                    setPaysIn(res);
                });
        }
    }, []);

    if (props.link)
        return (
            <div className="noDec-content">
                <ul>
                    <div className="noDec1-container">
                        <li>
                            <Link
                                className="noDec1"
                                to={'/trade/' + props.address}
                            >
                                {phrase}
                            </Link>
                        </li>
                    </div>
                    <div className="noDec2-container">
                        <li>
                            <div className="noDec2">
                                <li>
                                    Annualized Variance from{' '}
                                    {getDateFormatNoHours(startDate)} to{' '}
                                    {getDateFormatNoHours(endDate)}, pays in{' '}
                                    {paysIn}
                                </li>
                            </div>
                        </li>
                    </div>
                </ul>
                <ul>
                    <div className="noDec1-container">
                        <li>
                            <Link
                                className="noDec1"
                                to={'/trade/' + props.address}
                            >
                                {phrase}
                            </Link>
                        </li>
                    </div>
                    <div className="noDec2-container">
                        <li>
                            <div className="noDec2">
                                <li>
                                    Annualized Variance from{' '}
                                    {getDateFormatNoHours(startDate)} to{' '}
                                    {getDateFormatNoHours(endDate)}, pays in{' '}
                                    {paysIn}
                                </li>
                            </div>
                        </li>
                    </div>
                </ul>
                <ul>
                    <div className="noDec1-container">
                        <li>
                            <Link
                                className="noDec1"
                                to={'/trade/' + props.address}
                            >
                                {phrase}
                            </Link>
                        </li>
                    </div>
                    <div className="noDec2-container">
                        <li>
                            <div className="noDec2">
                                <li>
                                    Annualized Variance from{' '}
                                    {getDateFormatNoHours(startDate)} to{' '}
                                    {getDateFormatNoHours(endDate)}, pays in{' '}
                                    {paysIn}
                                </li>
                            </div>
                        </li>
                    </div>
                </ul>
            </div>
        );
    else
        return (
            <h1 className="VarSwapInfo">
                {phrase} Annualized Variance from{' '}
                {getDateFormatNoHours(startDate)} to{' '}
                {getDateFormatNoHours(endDate)}, pays in {paysIn}
            </h1>
        );
}

export default VarSwapInfo;
