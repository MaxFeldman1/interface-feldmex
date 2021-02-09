import React from 'react';
import './Header.css';
import {Link, BrowserRouter as Router} from 'react-router-dom';
import feldmexLogo from '../../assets/feldmex.png'

function Header() {
	return (
		<div className="navbar">
				<div className="logo">
					<Link to="/"><img src={feldmexLogo} alt="Feldmex Logo" /></Link>
				</div>
				<div className="links">
					<ul>
						<li><Link to="/About">About</Link></li>
						<li><Link to="/">My Positions</Link></li>
						<li><Link to="/">Products</Link></li>
					</ul>
				</div>
		</div>
		);
}

export default Header;
