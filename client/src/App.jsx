import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const SUIT_SYMBOLS = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠'
};

const SUIT_NAMES = {
  h: 'Hearts',
  d: 'Diamonds',
  c: 'Clubs',
  s: 'Spades'
};

const SUIT_CLASSES = {
  h: 'suit-red',
  d: 'suit-red',
  c: 'suit-black',
  s: 'suit-black'
};

// Map card rank for display (e.g. 'T' -> '10')
const DISPLAY_RANKS = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
};

function Card({ rank, suit, isMini = false, isDealt = false }) {
  if (!rank || !suit) {
    return <div className={`poker-card card-back ${isDealt ? 'animate-deal' : ''}`} />;
  }

  const suitSymbol = SUIT_SYMBOLS[suit];
  const suitClass = SUIT_CLASSES[suit];
  const displayRank = DISPLAY_RANKS[rank];

  if (isMini) {
    return (
      <div className={`showdown-mini-card ${suitClass}`}>
        <div className="card-top-left">{displayRank}</div>
        <div className="card-suit-large">{suitSymbol}</div>
      </div>
    );
  }

  return (
    <div className={`poker-card ${suitClass} ${isDealt ? 'animate-deal' : ''}`}>
      <div className="card-top-left">
        <span>{displayRank}</span>
        <span style={{ fontSize: '0.85rem' }}>{suitSymbol}</span>
      </div>
      <div className="card-suit-large">{suitSymbol}</div>
    </div>
  );
}

function App() {
  const [socket, setSocket] = useState(null);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [chatText, setChatText] = useState('');
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize Socket.io connection
  useEffect(() => {
    const socketUrl = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;
    const newSocket = io(socketUrl);
    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('Connected to websocket server.');
    });

    newSocket.on('roomCreated', ({ roomId }) => {
      setJoined(true);
      setErrorMsg('');
    });

    newSocket.on('roomJoined', ({ roomId }) => {
      setJoined(true);
      setErrorMsg('');
    });

    newSocket.on('roomState', (state) => {
      setRoomState(state);
      
      // Auto-set the initial raise slider value when turn updates
      const myPlayer = state.players.find(p => p.id === newSocket.id);
      if (myPlayer && state.currentTurnIndex !== null && state.players[state.currentTurnIndex]?.id === newSocket.id) {
        const minVal = Math.min(state.minRaise, myPlayer.chips + myPlayer.currentBet);
        setRaiseAmount(minVal);
      }
    });

    newSocket.on('errorMsg', (msg) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomState?.messages]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (socket && name.trim()) {
      socket.emit('createRoom', { name });
    } else {
      setErrorMsg('Please enter your name.');
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (socket && name.trim() && roomIdInput.trim()) {
      socket.emit('joinRoom', { roomId: roomIdInput, name });
    } else {
      setErrorMsg('Please enter your name and Room ID.');
    }
  };

  const handleStartGame = () => {
    if (socket) socket.emit('startGame');
  };

  const handleStartNextHand = () => {
    if (socket) socket.emit('startNextHand');
  };

  const handleAction = (action, amount = 0) => {
    if (socket) {
      socket.emit('playerAction', { action, amount });
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (socket && chatText.trim()) {
      socket.emit('sendMessage', chatText);
      setChatText('');
    }
  };

  const copyRoomCode = () => {
    if (roomState?.id) {
      navigator.clipboard.writeText(roomState.id);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Quick Bet presets
  const handleQuickBet = (multiplier) => {
    if (!roomState || !socket) return;
    const myPlayer = roomState.players.find(p => p.id === socket.id);
    if (!myPlayer) return;

    const maxTotalBet = myPlayer.chips + myPlayer.currentBet;
    let target = 0;

    if (roomState.currentBetSize === 0) {
      // Pot-size calculations or chip stacks
      // 1/2 pot, 3/4 pot, Full pot
      const potSize = roomState.pot;
      target = Math.round(potSize * multiplier);
    } else {
      // 2x, 3x, 4x current bet size
      target = Math.round(roomState.currentBetSize * multiplier);
    }

    // Clamp between min raise and all-in
    target = Math.max(roomState.minRaise, target);
    target = Math.min(maxTotalBet, target);
    setRaiseAmount(target);
  };

  // If not in a room yet, render Lobby
  if (!joined || !roomState) {
    return (
      <div className="lobby-container">
        <div className="lobby-card glass">
          <h1 className="lobby-title animate-float">♣ POKER FRIENDS ♠</h1>
          <p className="lobby-subtitle">เล่นเท็กซัส โฮลเด็ม ออนไลน์กับเพื่อนได้ทันที</p>

          {errorMsg && <div style={{ color: 'var(--accent)', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 'bold' }}>{errorMsg}</div>}

          <form onSubmit={handleCreateRoom}>
            <div className="form-group">
              <label className="form-label">ชื่อผู้เล่น (Player Name)</label>
              <input 
                id="player-name-input"
                type="text" 
                className="form-input" 
                placeholder="เช่น สมชาย" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                maxLength={12}
                required
              />
            </div>
            
            <button id="create-room-btn" type="submit" className="btn-primary">
              สร้างห้องใหม่ (Create Room)
            </button>
          </form>

          <div className="divider">หรือเข้าร่วมห้องที่มีอยู่</div>

          <form onSubmit={handleJoinRoom}>
            <div className="form-group">
              <label className="form-label">รหัสห้อง (Room Code)</label>
              <input 
                id="room-code-input"
                type="text" 
                className="form-input" 
                placeholder="ใส่รหัสห้อง 4 หลัก เช่น ABCD" 
                value={roomIdInput} 
                onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())} 
                maxLength={4}
              />
            </div>
            
            <button id="join-room-btn" type="submit" className="btn-secondary">
              เข้าร่วมห้อง (Join Room)
            </button>
          </form>
        </div>
      </div>
    );
  }

  const myPlayer = roomState.players.find(p => p.id === socket.id);
  const isHost = myPlayer?.isHost;
  const isMyTurn = roomState.currentTurnIndex !== null && roomState.players[roomState.currentTurnIndex]?.id === socket.id;

  // Reorder players array to place current player at position 0 (bottom of table)
  let reorderedPlayers = [...roomState.players];
  const myIndex = roomState.players.findIndex(p => p.id === socket.id);
  if (myIndex !== -1) {
    const beforeMe = roomState.players.slice(0, myIndex);
    const fromMe = roomState.players.slice(myIndex);
    reorderedPlayers = [...fromMe, ...beforeMe];
  }

  // Calculate coordinates for circular layout on oval table
  const totalPlayers = reorderedPlayers.length;
  const playerNodes = reorderedPlayers.map((player, idx) => {
    // For idx out of totalPlayers: player 0 (me) is bottom center (Math.PI / 2)
    // The angle moves clockwise around the oval
    const angle = (Math.PI / 2) + (idx * (2 * Math.PI / totalPlayers));
    
    // Seat coordinates
    const x = 50 + 38 * Math.cos(angle);
    const y = 50 + 31 * Math.sin(angle);

    // Bet bubble coordinates (placed closer to center)
    const betX = 50 + 21 * Math.cos(angle);
    const betY = 50 + 17 * Math.sin(angle);

    const isTurn = roomState.currentTurnIndex !== null && roomState.players[roomState.currentTurnIndex]?.id === player.id;
    const isDealer = roomState.dealerIndex !== null && roomState.players[roomState.dealerIndex]?.id === player.id;

    return {
      player,
      x,
      y,
      betX,
      betY,
      isTurn,
      isDealer
    };
  });

  // Action Panel Calculations
  const canCheck = isMyTurn && myPlayer && myPlayer.currentBet === roomState.currentBetSize;
  const canCall = isMyTurn && myPlayer && myPlayer.currentBet < roomState.currentBetSize;
  const callAmountNeeded = roomState.currentBetSize - (myPlayer?.currentBet || 0);
  const maxTotalBet = myPlayer ? (myPlayer.chips + myPlayer.currentBet) : 0;
  const minTotalBet = Math.min(roomState.minRaise, maxTotalBet);
  
  // Can raise only if we have more chips than the call amount and we can match the minRaise
  const canRaise = isMyTurn && myPlayer && myPlayer.chips > callAmountNeeded && maxTotalBet >= roomState.minRaise;

  return (
    <div className="game-layout">
      {/* Table Area (Left Side) */}
      <div className="table-area">
        {/* Room Header Info */}
        <div className="room-header">
          <div className="room-code-tag glass">
            <span>ROOM: {roomState.id}</span>
            <button id="copy-room-code-btn" className="copy-btn" onClick={copyRoomCode}>
              {copySuccess ? 'คัดลอกแล้ว!' : '📋 คัดลอกโค้ด'}
            </button>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            สถานะ: <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{roomState.gameState}</span>
          </div>
        </div>

        {/* Spectator Notice */}
        {myPlayer?.spectating && (
          <div className="spectating-notice glass">
            👁️ คุณกำลังรับชม (กรุณารอเริ่มตาถัดไป)
          </div>
        )}

        {/* Host Game Controller Buttons */}
        {isHost && (
          <div className="host-controls">
            {roomState.gameState === 'WAITING' && (
              <button id="start-game-btn" className="host-btn" onClick={handleStartGame}>
                เริ่มเกม (Start Game)
              </button>
            )}
            {roomState.gameState === 'SHOWDOWN' && (
              <button id="next-hand-btn-header" className="host-btn" onClick={handleStartNextHand}>
                แจกตาถัดไป (Next Hand)
              </button>
            )}
          </div>
        )}

        {/* Temporary toast errors */}
        {errorMsg && (
          <div style={{
            position: 'absolute',
            top: '80px',
            background: 'rgba(255, 71, 87, 0.9)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            zIndex: 100,
            fontSize: '0.9rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* The Poker Table container */}
        <div className="poker-table-container">
          <div className="poker-table">
            <div className="table-center">
              {/* Pot display */}
              <div className="pot-display">
                <span>POT:</span>
                <span className="pot-amount">{roomState.pot} chips</span>
              </div>

              {/* Board community cards */}
              <div className="board-cards">
                {roomState.communityCards.map((card, idx) => (
                  <Card key={idx} rank={card.rank} suit={card.suit} isDealt={true} />
                ))}
                {/* Visual placeholders for remaining cards */}
                {Array.from({ length: 5 - roomState.communityCards.length }).map((_, idx) => (
                  <div key={idx} className="poker-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }} />
                ))}
              </div>
            </div>

            {/* Last Action display */}
            {roomState.lastAction && (
              <div className="last-action-indicator">
                {roomState.lastAction.name} {roomState.lastAction.action}
                {roomState.lastAction.amount > 0 && ` (${roomState.lastAction.amount})`}
              </div>
            )}

            {/* Render Player Nodes */}
            {playerNodes.map(({ player, x, y, betX, betY, isTurn, isDealer }) => (
              <React.Fragment key={player.id}>
                {/* Player seat bubble */}
                <div 
                  className={`player-node ${isTurn ? 'is-turn' : ''} ${player.folded ? 'folded' : ''} ${!player.isOnline ? 'offline' : ''}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  {/* Player Hand hole cards (show if not folded and has cards) */}
                  {player.cards && player.cards.length > 0 && (
                    <div className="player-hand">
                      {player.cards.map((c, cidx) => (
                        <Card key={cidx} rank={c.rank} suit={c.suit} isDealt={true} />
                      ))}
                    </div>
                  )}

                  <div className="player-avatar-wrapper">
                    <div className="player-avatar">
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>
                    {isDealer && <div className="player-dealer-btn">D</div>}
                  </div>

                  <div className="player-info-card">
                    <div className="player-name">{player.name} {player.id === socket.id && '(คุณ)'}</div>
                    <div className="player-chips">{player.chips} 🪙</div>
                  </div>

                  {player.allIn && <div className="player-status-tag all-in">ALL-IN</div>}
                  {player.folded && <div className="player-status-tag folded-tag">FOLDED</div>}
                  {!player.isOnline && <div className="player-status-tag" style={{ color: '#ff4757', borderColor: '#ff4757' }}>OFFLINE</div>}
                  {player.spectating && <div className="player-status-tag" style={{ color: 'var(--text-muted)' }}>WATCHING</div>}
                </div>

                {/* Bet Chips stack/bubble */}
                {player.currentBet > 0 && (
                  <div className="player-bet-bubble" style={{ left: `${betX}%`, top: `${betY}%` }}>
                    {player.currentBet}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Action Panel controls (Bottom) */}
        <div className="action-panel-container">
          <div className="action-bar glass">
            <div className="action-buttons">
              <button 
                id="action-fold-btn"
                className="action-btn fold-btn" 
                disabled={!isMyTurn || myPlayer?.folded || myPlayer?.spectating}
                onClick={() => handleAction('FOLD')}
              >
                FOLD (หมอบ)
              </button>

              {canCheck ? (
                <button 
                  id="action-check-btn"
                  className="action-btn check-btn" 
                  disabled={!isMyTurn || myPlayer?.spectating}
                  onClick={() => handleAction('CHECK')}
                >
                  CHECK (ผ่าน)
                </button>
              ) : (
                <button 
                  id="action-call-btn"
                  className="action-btn call-btn" 
                  disabled={!isMyTurn || !canCall || myPlayer?.spectating}
                  onClick={() => handleAction('CALL')}
                >
                  CALL {callAmountNeeded > 0 ? callAmountNeeded : ''} (สู้)
                </button>
              )}

              <button 
                id="action-raise-btn"
                className="action-btn raise-btn" 
                disabled={!isMyTurn || !canRaise || myPlayer?.spectating}
                onClick={() => handleAction('RAISE', raiseAmount)}
              >
                {roomState.currentBetSize === 0 ? 'BET' : 'RAISE TO'} {raiseAmount}
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {isMyTurn ? (
                  <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>ตาของคุณแล้ว!</span>
                ) : (
                  <span>รอตาถัดไป...</span>
                )}
                {myPlayer && <span>ชิปของคุณ: <b style={{ color: '#fff' }}>{myPlayer.chips}</b></span>}
              </div>
            </div>

            {/* Slider controls for raising */}
            {canRaise && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div className="raise-slider-group">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>MIN: {minTotalBet}</span>
                  <input 
                    id="raise-range-slider"
                    type="range" 
                    className="raise-slider" 
                    min={minTotalBet} 
                    max={maxTotalBet} 
                    step={1}
                    value={raiseAmount} 
                    onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>MAX: {maxTotalBet}</span>
                  
                  <div className="raise-input-wrapper">
                    <input 
                      id="raise-number-input"
                      type="number" 
                      className="raise-input" 
                      value={raiseAmount} 
                      min={minTotalBet} 
                      max={maxTotalBet}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                          setRaiseAmount(Math.max(minTotalBet, Math.min(maxTotalBet, val)));
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Quick Bet Options */}
                <div className="quick-bet-buttons">
                  {roomState.currentBetSize === 0 ? (
                    <>
                      <button className="quick-bet-btn" onClick={() => handleQuickBet(0.5)}>1/2 Pot</button>
                      <button className="quick-bet-btn" onClick={() => handleQuickBet(0.75)}>3/4 Pot</button>
                      <button className="quick-bet-btn" onClick={() => handleQuickBet(1)}>Pot</button>
                      <button className="quick-bet-btn" onClick={() => handleQuickBet(100)}>All-In</button>
                    </>
                  ) : (
                    <>
                      <button className="quick-bet-btn" onClick={() => handleQuickBet(2)}>2x Bet</button>
                      <button className="quick-bet-btn" onClick={() => handleQuickBet(3)}>3x Bet</button>
                      <button className="quick-bet-btn" onClick={() => handleQuickBet(4)}>4x Bet</button>
                      <button className="quick-bet-btn" onClick={() => handleQuickBet(100)}>All-In</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Sidebar Area (Right Side) */}
      <div className="chat-sidebar">
        <div className="chat-header">
          <span>สนทนากับเพื่อน</span>
          <span className="active-count">ออนไลน์: {roomState.players.filter(p => p.isOnline).length}</span>
        </div>

        <div className="chat-messages">
          {roomState.messages.map((msg, idx) => {
            let msgClass = 'chat-msg';
            if (msg.sender === 'System') msgClass += ' system-msg';
            else if (msg.sender === 'Dealer') msgClass += ' dealer-msg';

            return (
              <div key={idx} className={msgClass}>
                {msg.sender !== 'System' && msg.sender !== 'Dealer' && (
                  <span className="msg-sender">{msg.sender}:</span>
                )}
                <span>{msg.text}</span>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendChat} className="chat-input-area">
          <input 
            id="chat-message-input"
            type="text" 
            className="chat-input" 
            placeholder="พิมพ์ข้อความคุยกัน..." 
            value={chatText} 
            onChange={(e) => setChatText(e.target.value)} 
          />
          <button id="chat-send-btn" type="submit" className="chat-send-btn">ส่ง</button>
        </form>
      </div>

      {/* Showdown Results Modal (Pop up when round is SHOWDOWN) */}
      {roomState.gameState === 'SHOWDOWN' && roomState.showdownResults && roomState.showdownResults.length > 0 && (
        <div className="modal-overlay">
          <div className="modal-content glass">
            <h2 className="modal-title">🏆 ผลแพ้ชนะ (Showdown Results)</h2>
            <div className="showdown-list">
              {roomState.showdownResults.map((result, idx) => {
                const isWinner = result.winAmount > 0;
                return (
                  <div key={idx} className={`showdown-player-row ${isWinner ? 'winner-row' : ''}`}>
                    <div className="showdown-player-info">
                      <span className="showdown-player-name">
                        {result.name} {isWinner && '👑'}
                      </span>
                      <span className="showdown-hand-type">
                        {result.handType}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {result.handCards && result.handCards.length > 0 && (
                        <div className="showdown-cards">
                          {result.handCards.map((c, cidx) => (
                            <Card key={cidx} rank={c.rank} suit={c.suit} isMini={true} />
                          ))}
                        </div>
                      )}

                      {isWinner && (
                        <span className="showdown-win-amount">
                          +{result.winAmount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {isHost ? (
              <button id="next-hand-btn-modal" className="btn-primary" onClick={handleStartNextHand} style={{ margin: 0 }}>
                แจกตาถัดไป (Next Hand)
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                รอหัวห้องเริ่มตาถัดไป...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
