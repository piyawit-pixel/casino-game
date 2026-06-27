import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Room } from './room.js';
import { CheckersRoom } from './checkersRoom.js';
import { CoupRoom } from './coupRoom.js';
import { UnoRoom } from './unoRoom.js';
import { BangRoom } from './bangRoom.js';
import { InsiderRoom } from './insiderRoom.js';
import { UndercoverRoom } from './undercoverRoom.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow connections from any origin (development React client is on 5173)
    methods: ['GET', 'POST']
  }
});

const rooms = new Map(); // roomId -> Room instance

// Helper to generate a unique room ID
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms.has(result)) {
    return generateRoomId(); // Ensure uniqueness
  }
  return result;
}

// Function to broadcast room state to all players in the room
function broadcastRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.forEach(p => {
    // Only send the state if the player is connected
    if (p.isOnline) {
      io.to(p.id).emit('roomState', room.getClientState(p.id));
    }
  });
}

io.on('connection', (socket) => {
  let currentRoomId = null;
  let playerProfile = null;

  console.log(`Socket connected: ${socket.id}`);

  // Create a new room
  socket.on('createRoom', ({ name, gameType }) => {
    if (!name || name.trim() === '') {
      socket.emit('errorMsg', 'Please enter a valid name.');
      return;
    }
    const roomId = generateRoomId();
    const room = gameType === 'checkers' ? new CheckersRoom(roomId) : gameType === 'coup' ? new CoupRoom(roomId) : gameType === 'uno' ? new UnoRoom(roomId) : gameType === 'bang' ? new BangRoom(roomId) : gameType === 'insider' ? new InsiderRoom(roomId) : gameType === 'undercover' ? new UndercoverRoom(roomId) : new Room(roomId);
    rooms.set(roomId, room);

    const player = room.addPlayer(socket.id, name.trim());
    currentRoomId = roomId;
    playerProfile = player;

    socket.join(roomId);
    socket.emit('roomCreated', { roomId, player });
    broadcastRoomState(roomId);
    console.log(`Room created: ${roomId} by ${name}`);
  });

  // Join an existing room
  socket.on('joinRoom', ({ roomId, name }) => {
    if (!roomId || !name || name.trim() === '') {
      socket.emit('errorMsg', 'Room ID and Name are required.');
      return;
    }

    const cleanRoomId = roomId.toUpperCase().trim();
    const room = rooms.get(cleanRoomId);

    if (!room) {
      socket.emit('errorMsg', 'Room not found.');
      return;
    }

    try {
      const player = room.addPlayer(socket.id, name.trim());
      currentRoomId = cleanRoomId;
      playerProfile = player;

      socket.join(cleanRoomId);
      socket.emit('roomJoined', { roomId: cleanRoomId, player });
      broadcastRoomState(cleanRoomId);
      console.log(`Player ${name} joined Room: ${cleanRoomId}`);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  // Start the game
  socket.on('startGame', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    // Only host can start game
    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) {
      socket.emit('errorMsg', 'Only the host can start the game.');
      return;
    }

    try {
      room.startGame();
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  // Deal next hand
  socket.on('startNextHand', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) {
      socket.emit('errorMsg', 'Only the host can deal the next hand.');
      return;
    }

    if (room.gameState !== 'SHOWDOWN') {
      socket.emit('errorMsg', 'Cannot start next hand yet.');
      return;
    }

    try {
      room.startNewHand();
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  // Process a player action (Fold, Check, Call, Raise)
  socket.on('playerAction', ({ action, amount }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    try {
      room.processAction(socket.id, action, amount);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  // Process a checkers board move
  socket.on('makeMove', ({ from, to }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'checkers') return;

    try {
      room.makeMove(socket.id, from, to);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  // Coup Game events
  socket.on('coupAction', ({ type, targetId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'coup') return;
    try {
      room.selectAction(socket.id, type, targetId);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('coupChallenge', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'coup') return;
    try {
      room.challengeAction(socket.id);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('coupBlock', ({ blockRole }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'coup') return;
    try {
      room.blockAction(socket.id, blockRole);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('coupChallengeBlock', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'coup') return;
    try {
      room.challengeBlock(socket.id);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('coupPass', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'coup') return;
    try {
      room.passAction(socket.id);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('coupReveal', ({ cardIdx }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'coup') return;
    try {
      room.revealCard(socket.id, cardIdx);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('coupDiscard', ({ cardIdx }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'coup') return;
    try {
      room.discardCard(socket.id, cardIdx);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('coupExchangeSelect', ({ keptIndices }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'coup') return;
    try {
      room.exchangeSelect(socket.id, keptIndices);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  // UNO Game events
  socket.on('unoPlayCard', ({ cardId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'uno') return;
    try {
      room.playCard(socket.id, cardId);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('unoDrawCard', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'uno') return;
    try {
      room.drawCard(socket.id);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('unoSelectColor', ({ color }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'uno') return;
    try {
      room.selectColor(socket.id, color);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('unoKeepCard', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'uno') return;
    try {
      room.keepDrawnCard(socket.id);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('unoResolvePenalty', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'uno') return;
    try {
      room.resolveDrawPenalty(socket.id);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  // BANG! Game events
  socket.on('bangPlayBrown', ({ cardId, targetId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'bang') return;
    try {
      room.playBrownCard(socket.id, cardId, targetId);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('bangPlayBlue', ({ cardId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'bang') return;
    try {
      room.playBlueCard(socket.id, cardId);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('bangRespond', ({ cardId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'bang') return;
    try {
      room.respondToAttack(socket.id, cardId);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('bangEndTurn', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'bang') return;
    try {
      room.endTurn(socket.id);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('bangDiscardLimit', ({ cardId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'bang') return;
    try {
      room.discardCardToLimit(socket.id, cardId);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  // Insider Game events
  socket.on('insiderSubmitGuess', ({ text }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'insider') return;
    try {
      room.submitGuess(socket.id, text);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('insiderRespondGuess', ({ guessId, approved }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'insider') return;
    try {
      room.respondToGuess(guessId, approved);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('insiderVote', ({ targetId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'insider') return;
    try {
      room.votePlayer(socket.id, targetId);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  // Undercover Game events
  socket.on('undercoverSubmitDesc', ({ text }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'undercover') return;
    try {
      room.submitDescription(socket.id, text);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('undercoverVote', ({ targetId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'undercover') return;
    try {
      room.votePlayer(socket.id, targetId);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('undercoverWhiteGuess', ({ text }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'undercover') return;
    try {
      room.guessCivilianWord(socket.id, text);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  // Send a chat message
  socket.on('sendMessage', (text) => {
    if (!currentRoomId || !text || text.trim() === '') return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    const senderName = player ? player.name : 'Spectator';

    room.addMessage(senderName, text.trim());
    broadcastRoomState(currentRoomId);
  });

  // Leave a room
  socket.on('leaveRoom', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.removePlayer(socket.id);
        socket.leave(currentRoomId);
        
        // If room is empty of all players (online/offline), clean it up
        const anyPlayersLeft = room.players.some(p => p.isOnline);
        if (!anyPlayersLeft) {
          console.log(`Room ${currentRoomId} is empty. Cleaning up.`);
          rooms.delete(currentRoomId);
        } else {
          broadcastRoomState(currentRoomId);
        }
      }
      currentRoomId = null;
      playerProfile = null;
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.removePlayer(socket.id);
        
        // If room is empty of all players (online/offline), clean it up after a delay
        const anyPlayersLeft = room.players.some(p => p.isOnline);
        if (!anyPlayersLeft) {
          console.log(`Room ${currentRoomId} is empty. Cleaning up.`);
          rooms.delete(currentRoomId);
        } else {
          broadcastRoomState(currentRoomId);
        }
      }
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Serve client build in production
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// Fallback to index.html for client side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Poker backend server running on port ${PORT}`);
});

// Global Timer Tick for Insider Game (once per second)
setInterval(() => {
  rooms.forEach((room, roomId) => {
    if (room.gameType === 'insider' && room.gameState === 'PLAYING') {
      room.tickTimer();
      broadcastRoomState(roomId);
    }
  });
}, 1000);
