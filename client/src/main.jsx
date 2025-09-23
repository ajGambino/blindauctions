import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { SocketProvider } from './contexts/SocketContext.jsx';
import { AuctionProvider } from './contexts/AuctionContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<AuthProvider>
			<SocketProvider>
				<AuctionProvider>
					<App />
				</AuctionProvider>
			</SocketProvider>
		</AuthProvider>
	</React.StrictMode>
);
