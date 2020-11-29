import React from 'react';
import '../Home/Home.css';
import github from '../../assets/github.png';
import discord from '../../assets/discord.svg';

function Footer() {
	return (
		<div className="footer">
			<a href="https://discord.gg/HrBM8zV" target="_blank" rel="noreferrer"><img alt={"discord.svg"} src={discord} /></a>
			<a href="https://github.com/Feldmex/varianceSwaps.git" target="_blank" rel="noreferrer"><img alt={"github.png"} src={github} /></a>
		</div>
		);
}

export default Footer;