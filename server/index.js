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
import { BossRoom } from './bossRoom.js';
import jwt from 'jsonwebtoken';
import { registerUser, loginUser, getUserChips, saveUserChips } from './db.js';

const JWT_SECRET = 'poker-online-jwt-secret-key-123';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// API Endpoints for Authentication
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await registerUser(username, password);
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, username: user.username, chips: user.chips });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await loginUser(username, password);
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, username: user.username, chips: user.chips });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const chips = await getUserChips(decoded.username);
    res.json({ success: true, username: decoded.username, chips });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

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
async function broadcastRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  // If this is a poker room, save player chips to database
  if (room.constructor.name === 'Room') {
    for (const p of room.players) {
      try {
        await saveUserChips(p.name, p.chips);
      } catch (err) {
        console.error('Failed to save user chips:', err);
      }
    }
  }

  room.players.forEach(p => {
    // Only send the state if the player is connected
    if (p.isOnline) {
      io.to(p.id).emit('roomState', room.getClientState(p.id));
    }
  });
}
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.username = decoded.username;
    } catch (err) {
      console.log('Socket authentication failed:', err.message);
    }
  }
  next();
});

io.on('connection', (socket) => {
  let currentRoomId = null;
  let playerProfile = null;

  console.log(`Socket connected: ${socket.id} (Authenticated: ${socket.username || 'No'})`);

  // Create a new room
  socket.on('createRoom', async ({ name, gameType, password }) => {
    let playerName = name ? name.trim() : '';
    if (socket.username) {
      playerName = socket.username;
    }

    if (!playerName || playerName === '') {
      socket.emit('errorMsg', 'Please enter a valid name.');
      return;
    }
    const roomId = generateRoomId();
    const room = gameType === 'checkers' ? new CheckersRoom(roomId) : gameType === 'coup' ? new CoupRoom(roomId) : gameType === 'uno' ? new UnoRoom(roomId) : gameType === 'bang' ? new BangRoom(roomId) : gameType === 'insider' ? new InsiderRoom(roomId) : gameType === 'undercover' ? new UndercoverRoom(roomId) : gameType === 'boss' ? new BossRoom(roomId) : new Room(roomId);
    
    // Save password if set
    if (password && password.trim() !== '') {
      room.password = password.trim();
    }

    rooms.set(roomId, room);

    let initialChips = 1000;
    if (socket.username && room.constructor.name === 'Room') {
      initialChips = await getUserChips(socket.username);
    }

    const player = room.addPlayer(socket.id, playerName, initialChips);
    currentRoomId = roomId;
    playerProfile = player;

    socket.join(roomId);
    socket.emit('roomCreated', { roomId, player });
    await broadcastRoomState(roomId);
    console.log(`Room created: ${roomId} by ${playerName} (Password protected: ${!!room.password})`);
  });

  // Join an existing room
  socket.on('joinRoom', async ({ roomId, name, password }) => {
    let playerName = name ? name.trim() : '';
    if (socket.username) {
      playerName = socket.username;
    }

    if (!roomId || !playerName || playerName === '') {
      socket.emit('errorMsg', 'Room ID and Name are required.');
      return;
    }

    const cleanRoomId = roomId.toUpperCase().trim();
    const room = rooms.get(cleanRoomId);

    if (!room) {
      socket.emit('errorMsg', 'Room not found.');
      return;
    }

    // Verify Password if required by the room
    if (room.password && room.password !== '') {
      const trimmedInput = password ? password.trim() : '';
      if (trimmedInput !== room.password) {
        socket.emit('errorMsg', 'รหัสผ่านห้องไม่ถูกต้อง (Incorrect room password)');
        return;
      }
    }

    try {
      let initialChips = 1000;
      if (socket.username && room.constructor.name === 'Room') {
        initialChips = await getUserChips(socket.username);
      }

      const player = room.addPlayer(socket.id, playerName, initialChips);
      currentRoomId = cleanRoomId;
      playerProfile = player;

      socket.join(cleanRoomId);
      socket.emit('roomJoined', { roomId: cleanRoomId, player });
      await broadcastRoomState(cleanRoomId);
      console.log(`Player ${playerName} joined Room: ${cleanRoomId}`);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  // Refill Chips handler
  socket.on('refillChips', async ({ amount }) => {
    const refillAmount = parseInt(amount) || 10000;
    let newDbChips = null;

    if (socket.username) {
      try {
        const currentChips = await getUserChips(socket.username);
        newDbChips = currentChips + refillAmount;
        await saveUserChips(socket.username, newDbChips);
      } catch (err) {
        console.error('Database refill error:', err);
      }
    }

    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room && room.constructor.name === 'Room') {
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          player.chips += refillAmount;
          await broadcastRoomState(currentRoomId);
        }
      }
    }

    socket.emit('refillSuccess', { chips: newDbChips });
    console.log(`Refill successful for ${socket.username || socket.id}: +${refillAmount} chips`);
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

  // Boss Game events
  socket.on('bossSubmitProposal', ({ sharesMap }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'boss') return;
    try {
      room.submitSharesProposal(socket.id, sharesMap);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('bossPlayCard', ({ cardId, targetLetter }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'boss') return;
    try {
      room.playBossCard(socket.id, cardId, targetLetter);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('bossCloseDeal', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'boss') return;
    try {
      room.closeDeal(socket.id);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  socket.on('bossCancelDeal', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameType !== 'boss') return;
    try {
      room.cancelDeal(socket.id);
      broadcastRoomState(currentRoomId);
    } catch (err) {
      socket.emit('errorMsg', err.message);
    }
  });

  // Profile customizer event
  socket.on('updateProfile', ({ avatar, frame }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.avatar = avatar || null;
      player.frame = frame || 'default';
      broadcastRoomState(currentRoomId);
    }
  });

  // Lobby slots spin event
  socket.on('lobbySpinSlots', ({ bet }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.gameState !== 'WAITING') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    if (player.chips === undefined) {
      player.chips = 1000;
    }

    const betAmount = Number(bet);
    if (isNaN(betAmount) || betAmount <= 0) {
      socket.emit('errorMsg', 'กรุณาระบุจำนวนชิปที่ถูกต้อง');
      return;
    }

    if (player.chips < betAmount) {
      socket.emit('errorMsg', 'ชิปไม่เพียงพอสำหรับการสปิน');
      return;
    }

    // Deduct bet
    player.chips -= betAmount;

    // Spin reels
    const symbols = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];
    const reels = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];

    // Calculate win multiplier
    let winMultiplier = 0;
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      const matchSymbol = reels[0];
      if (matchSymbol === '7️⃣') winMultiplier = 25;
      else if (matchSymbol === '💎') winMultiplier = 15;
      else if (matchSymbol === '🔔') winMultiplier = 10;
      else winMultiplier = 5;
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      winMultiplier = 2;
    }

    const winAmount = betAmount * winMultiplier;
    player.chips += winAmount;

    // Send back specific slots outcome
    socket.emit('slotsResult', {
      reels,
      winAmount,
      balance: player.chips
    });

    if (winMultiplier >= 5) {
      room.addMessage('System', `🎉 ${player.name} ชนะรางวัลแจ็คพอตสล็อตในห้องล็อบบี้ ได้รับ ${winAmount} ชิป! (${reels.join(' ')})`);
    }

    broadcastRoomState(currentRoomId);
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
          // Verify that there is at least one online host
          const hostOnline = room.players.find(p => p.isOnline && p.isHost);
          if (!hostOnline) {
            const nextHost = room.players.find(p => p.isOnline);
            if (nextHost) {
              room.players.forEach(p => p.isHost = false);
              nextHost.isHost = true;
              room.addMessage('System', `${nextHost.name} has been appointed as the new host.`);
            }
          }
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
          // Verify that there is at least one online host
          const hostOnline = room.players.find(p => p.isOnline && p.isHost);
          if (!hostOnline) {
            const nextHost = room.players.find(p => p.isOnline);
            if (nextHost) {
              room.players.forEach(p => p.isHost = false);
              nextHost.isHost = true;
              room.addMessage('System', `${nextHost.name} has been appointed as the new host.`);
            }
          }
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

// Global Timer Tick for Insider & Boss Games (once per second)
setInterval(() => {
  rooms.forEach((room, roomId) => {
    if (room.gameType === 'insider' && room.gameState === 'PLAYING') {
      room.tickTimer();
      broadcastRoomState(roomId);
    } else if (room.gameType === 'boss' && room.gameState === 'INTERRUPTED') {
      room.tickTimer();
      broadcastRoomState(roomId);
    }
  });
}, 1000);
