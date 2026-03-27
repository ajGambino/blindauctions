# Fantasy Football Blind Auction

A real-time multiplayer fantasy football auction app featuring a unique **blind bidding** mechanic. Players simultaneously submit hidden bids for NFL players, creating an exciting and strategic draft experience.

## Features

- **Blind Auction Mechanics** - All players submit bids simultaneously without seeing others' bids
- **Real-time Multiplayer** - Live game updates using WebSocket technology
- **User Authentication** - Secure sign-up and login via Supabase
- **Flexible Game Modes** - Support for 2-6 players per game
- **Configurable Buy-ins** - Choose from 1🍌, 3🍌, or 5🍌 stakes
- **Reconnection Support** - Players can rejoin active games if disconnected
- **Game History** - View results and team rosters from completed games
- **Auto-timers** - Automatic nomination and bidding when players are inactive

## Game Rules

### Roster Requirements

Each team must draft exactly 5 players:

- 1 Quarterback (QB)
- 1 Running Back (RB)
- 2 Wide Receivers (WR)
- 1 Tight End (TE)

### Auction Budget

- Every player starts with **$100** auction budget
- Minimum bid is **$1** per player
- Must reserve $1 for each remaining roster spot

### How It Works

1. **Nomination Phase** - The current nominator selects a player to auction (25 seconds)
2. **Blind Bidding** - All eligible players simultaneously submit secret bids (25 seconds)
3. **Winner Determined** - Highest bid wins; ties broken by earliest bid timestamp
4. **Next Round** - Nominator rotates, process repeats until all rosters are filled

### Special Rules

- Players can only bid on positions they haven't filled
- If only one player needs a position, they get it for $1 (auto-assigned)
- If no bids are submitted, the nominator gets the player for $1
- Disconnected players are automatically handled with timeouts

## Tech Stack

**Frontend:**

- React 18
- Vite
- Socket.IO Client
- Supabase Client

**Backend:**

- Node.js
- Express
- Socket.IO Server
- CSV Parser

**Database:**

- Supabase (PostgreSQL)
- Real-time subscriptions

## Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn
- Supabase account (free tier works)

## Project Structure

```
blindauction/
├── server.js                 # Main server file with Socket.IO logic
├── server/
│   └── gameManager.js        # Game state management
├── playerList.csv            # NFL player data with projections
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/         # Login/signup components
│   │   │   ├── lobby/        # Game lobby & waiting room
│   │   │   ├── auction/      # Auction board & bidding UI
│   │   │   ├── game/         # Game status & results
│   │   │   └── common/       # Reusable components
│   │   ├── contexts/         # React contexts (Auth, Auction, Socket)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API services
│   │   ├── utils/            # Helper functions
│   │   └── App.jsx           # Main app component
│   └── public/               # Static assets
└── package.json
```

## How to Play

1. **Sign Up/Login** - Create an account or sign in
2. **Create or Join Game** - Start a new game or join an available one
3. **Wait for Players** - Game starts when all players join
4. **Nominate Players** - When it's your turn, select a player to auction
5. **Place Bids** - Submit your secret bid during the auction
6. **Build Your Team** - Continue until all rosters are complete
7. **View Results** - See final teams and total projections

### Game Settings

When creating a game, you can configure:

- **Buy-in Amount**: 1🍌 ($1), 3🍌 ($3), or 5🍌 ($5)
- **Max Players**: 2-6 players

## Features in Detail

### Blind Bidding System

Unlike traditional auctions where bids are public, this app implements blind bidding:

- All players see the nominated player
- Bids are submitted secretly
- Timer counts down for all players simultaneously
- Highest bid wins (ties broken by timestamp)

### Reconnection Logic

- If a player disconnects during an active game, they're marked as disconnected
- They can rejoin by refreshing and joining the same game
- Auto-timeout handles their turns if they don't reconnect
- Game continues seamlessly for connected players

### Smart Auto-assignment

- If only one player can bid (others have filled that position), they get the player for $1
- If no one bids during the timer, the nominator gets the player for $1
- Budget validation prevents overbidding

## Security Notes

- Supabase handles user authentication securely
- Service role key is used server-side only for game management
- Row Level Security (RLS) policies should be configured in Supabase
- Never commit `.env` files to version control

## Troubleshooting

**Client can't connect to server:**

- Check that both server and client are running
- Verify Socket.IO CORS settings in `server.js`
- Ensure ports 3000 and 5177 are available

**Database errors:**

- Verify Supabase credentials in `.env`
- Check that database tables and functions are created
- Ensure service role key has proper permissions

**Players not loading:**

- Verify `playerList.csv` exists and has valid format
- Check server console for CSV parsing errors
