import React from 'react';
import '../Home/Home.css';
import github from '../../assets/github.svg';
import discord from '../../assets/discord.svg';
import email from '../../assets/email.svg';

function Footer() {
    return (
        <div className="footer">
            <div className="footer-content">
                <div className="footer-header">
                    <h1>Contact Us</h1>
                </div>
                <div className="icon-container">
                    <a
                        href="https://discord.gg/HrBM8zV"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <img
                            className="icon"
                            alt={'discord.svg'}
                            src={discord}
                        />
                    </a>
                    <a
                        href="https://github.com/Feldmex/varianceSwaps.git"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <img className="icon" alt={'github.svg'} src={github} />
                    </a>
                    <a
                        href="mailto:feldmex@protonmail.com"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <img className="icon" alt={'email.svg'} src={email} />
                    </a>
                </div>
                <div className="risk">
                    <b>
                        *The Feldmex Variance Swap Platform is unaudited, you
                        are responsible for your funds use at your own risk*
                    </b>
                </div>
            </div>
        </div>
    );
}

export default Footer;
