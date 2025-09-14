import { useContext, useEffect, useCallback } from 'react';
import { SocketContext } from '../contexts/SocketContext';

// Custom hook for socket operations
export const useSocket = () => {
	const context = useContext(SocketContext);

	if (!context) {
		throw new Error('useSocket must be used within a SocketProvider');
	}

	return context;
};

// Hook for socket event listeners with cleanup
export const useSocketEvent = (socket, eventName, handler, deps = []) => {
	useEffect(() => {
		if (!socket) return;

		socket.on(eventName, handler);

		return () => {
			socket.off(eventName, handler);
		};
	}, [socket, eventName, handler, ...deps]);
};

// Hook for emitting socket events
export const useSocketEmit = (socket) => {
	const emit = useCallback(
		(eventName, data = {}) => {
			if (socket && socket.connected) {
				socket.emit(eventName, data);
				return true;
			}
			console.warn(`Cannot emit ${eventName}: socket not connected`);
			return false;
		},
		[socket]
	);

	return emit;
};
