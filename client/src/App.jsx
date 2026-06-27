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

function CoupCard({ role, dead, onClick, isSelectable }) {
  const roleClass = dead ? 'dead' : role === 'hidden' ? 'role-hidden' : `role-${role}`;
  const displayRole = {
    duke: 'Duke (ดยุก)',
    assassin: 'Assassin (นักฆ่า)',
    captain: 'Captain (กัปตัน)',
    ambassador: 'Ambassador (ทูต)',
    contessa: 'Contessa (คอนเตส)',
    hidden: 'Influence'
  }[role] || role;

  return (
    <div 
      className={`coup-card ${roleClass}`} 
      onClick={onClick} 
      style={{ cursor: isSelectable ? 'pointer' : 'default' }}
    >
      <span>{displayRole}</span>
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
  const [gameType, setGameType] = useState('poker'); // 'poker' or 'checkers'
  const [selectedSquare, setSelectedSquare] = useState(null); // { row, col }
  const [targetSelectMode, setTargetSelectMode] = useState(null); // 'steal' | 'assassinate' | 'coup'
  const [selectedExchangeIndices, setSelectedExchangeIndices] = useState([]); // indices for Ambassador swap
  
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
      
      // Auto-set the initial raise slider value when turn updates (poker-only)
      if (state.gameType !== 'checkers') {
        const myPlayer = state.players.find(p => p.id === newSocket.id);
        if (myPlayer && state.currentTurnIndex !== null && state.players[state.currentTurnIndex]?.id === newSocket.id) {
          const minVal = Math.min(state.minRaise, myPlayer.chips + myPlayer.currentBet);
          setRaiseAmount(minVal);
        }
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
      socket.emit('createRoom', { name, gameType });
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

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leaveRoom');
      setJoined(false);
      setRoomState(null);
      setSelectedSquare(null);
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

  const handlePlayerNodeClick = (targetPlayer) => {
    if (!targetSelectMode) return;
    socket.emit('coupAction', { type: targetSelectMode, targetId: targetPlayer.id });
    setTargetSelectMode(null);
  };

  const renderCoupActionPanel = () => {
    if (!roomState || roomState.gameType !== 'coup') return null;

    const myActivePlayer = roomState.players.find(p => p.id === socket.id);
    const activeActor = roomState.players[roomState.turnIndex];
    const isMyTurn = activeActor?.id === socket.id;

    if (!isMyTurn || roomState.gameState !== 'PLAYING') {
      return (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {myActivePlayer?.isDead ? 'คุณตายแล้ว นั่งชมเกมอยู่...' : 'กรุณารอตาของคุณ...'}
        </span>
      );
    }

    if (myActivePlayer?.coins >= 10) {
      return (
        <button 
          className="coup-action-btn btn-coup-action" 
          onClick={() => setTargetSelectMode('coup')}
          style={{ gridColumn: 'span 4', width: '100%', height: '54px' }}
        >
          <span className="coup-action-title">⚔️ COUP (บังคับ)</span>
          <span className="coup-action-cost">จ่าย 7 เหรียญ</span>
        </button>
      );
    }

    return (
      <div className="coup-action-panel">
        <button className="coup-action-btn" onClick={() => socket.emit('coupAction', { type: 'income' })}>
          <span className="coup-action-title">Income</span>
          <span className="coup-action-cost">+1 เหรียญ</span>
        </button>

        <button className="coup-action-btn" onClick={() => socket.emit('coupAction', { type: 'foreign_aid' })}>
          <span className="coup-action-title">Foreign Aid</span>
          <span className="coup-action-cost">+2 เหรียญ</span>
        </button>

        <button className="coup-action-btn" onClick={() => socket.emit('coupAction', { type: 'tax' })}>
          <span className="coup-action-title">Tax (Duke)</span>
          <span className="coup-action-cost">+3 เหรียญ</span>
        </button>

        <button className="coup-action-btn" onClick={() => setTargetSelectMode('steal')}>
          <span className="coup-action-title">Steal (Captain)</span>
          <span className="coup-action-cost">ขโมย 2 เหรียญ</span>
        </button>

        <button 
          className="coup-action-btn" 
          disabled={myActivePlayer?.coins < 3} 
          onClick={() => setTargetSelectMode('assassinate')}
        >
          <span className="coup-action-title">Assassinate</span>
          <span className="coup-action-cost">จ่าย 3 เหรียญ</span>
        </button>

        <button className="coup-action-btn" onClick={() => socket.emit('coupAction', { type: 'exchange' })}>
          <span className="coup-action-title">Exchange (Amb)</span>
          <span className="coup-action-cost">สลับไพ่ 2 ใบ</span>
        </button>

        <button 
          className="coup-action-btn btn-coup-action" 
          disabled={myActivePlayer?.coins < 7} 
          onClick={() => setTargetSelectMode('coup')}
          style={{ gridColumn: 'span 2' }}
        >
          <span className="coup-action-title">⚔️ COUP</span>
          <span className="coup-action-cost">จ่าย 7 เหรียญ</span>
        </button>
      </div>
    );
  };

  const renderCoupCenterPrompt = () => {
    if (!roomState || roomState.gameType !== 'coup') return null;

    const myActivePlayer = roomState.players.find(p => p.id === socket.id);
    const activeActor = roomState.players[roomState.turnIndex];
    const isMyTurn = activeActor?.id === socket.id;

    switch (roomState.gameState) {
      case 'PLAYING':
        return (
          <div className="coup-prompt-desc">
            ตาของ <b style={{ color: 'var(--primary)' }}>{activeActor?.name}</b> กำลังเลือกแอคชัน...
          </div>
        );
      case 'ACTION_PENDING':
        const activeAction = roomState.activeAction;
        if (!activeAction) return null;

        const actorName = roomState.players.find(p => p.id === activeAction.sourceId)?.name;
        const targetName = activeAction.targetId 
          ? roomState.players.find(p => p.id === activeAction.targetId)?.name 
          : '';

        if (activeAction.sourceId === socket.id) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="coup-prompt-desc">
                คุณประกาศใช้ <b style={{ color: 'var(--primary)' }}>{activeAction.type}</b> {targetName && `ใส่ ${targetName}`}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {activeAction.status === 'blocked' 
                  ? `รอการท้าทายจากคุณ หรือกดยอมรับการบล็อค` 
                  : `รอเพื่อนๆ ตัดสินใจ...`}
              </div>
              {activeAction.status === 'blocked' && (
                <div className="coup-prompt-buttons">
                  <button className="btn-primary" onClick={() => socket.emit('coupChallengeBlock')} style={{ background: '#ff4757', color: '#fff', boxShadow: 'none' }}>
                    ⚔️ จับโกหกการขัดขวาง (Challenge Block)
                  </button>
                  <button className="btn-secondary" onClick={() => socket.emit('coupPass')}>
                    ยอมรับการโดนบล็อค (Accept Block)
                  </button>
                </div>
              )}
            </div>
          );
        }

        const canIBlock = activeAction.status !== 'blocked' && (
          activeAction.type === 'foreign_aid' 
            ? (myActivePlayer && !myActivePlayer.isDead && myActivePlayer.id !== activeAction.sourceId)
            : (activeAction.type === 'steal' || activeAction.type === 'assassinate')
              ? myActivePlayer?.id === activeAction.targetId
              : false
        );

        const canIChallenge = activeAction.status !== 'blocked' && activeAction.claimedRole && myActivePlayer && !myActivePlayer.isDead;
        const canIChallengeBlock = activeAction.status === 'blocked' && myActivePlayer && !myActivePlayer.isDead && myActivePlayer.id !== activeAction.blockedBy;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="coup-prompt-desc">
              {activeAction.status === 'blocked' ? (
                <span>
                  <b>{roomState.players.find(p => p.id === activeAction.blockedBy)?.name}</b> ขัดขวางโดยอ้างตัวเป็น <b>{activeAction.blockedRole}</b>
                </span>
              ) : (
                <span>
                  <b>{actorName}</b> ประกาศใช้ <b>{activeAction.type}</b> {targetName && `ใส่ ${targetName}`}
                </span>
              )}
            </div>
            
            {myActivePlayer && !myActivePlayer.isDead && !myActivePlayer.spectating && (
              <div className="coup-prompt-buttons">
                {canIChallenge && (
                  <button className="btn-primary" onClick={() => socket.emit('coupChallenge')} style={{ background: '#ff4757', color: '#fff', boxShadow: 'none', marginBottom: '4px' }}>
                    ⚔️ ท้าทายจับโกหก (Challenge)
                  </button>
                )}
                {canIBlock && (
                  <div style={{ display: 'flex', gap: '8px', width: '100%', marginBottom: '4px' }}>
                    {activeAction.type === 'foreign_aid' && (
                      <button className="btn-secondary" onClick={() => socket.emit('coupBlock', { blockRole: 'duke' })} style={{ flex: 1 }}>
                        🛡️ บล็อค (ดยุก)
                      </button>
                    )}
                    {activeAction.type === 'steal' && (
                      <>
                        <button className="btn-secondary" onClick={() => socket.emit('coupBlock', { blockRole: 'captain' })} style={{ flex: 1, fontSize: '0.75rem' }}>
                          🛡️ บล็อค (กัปตัน)
                        </button>
                        <button className="btn-secondary" onClick={() => socket.emit('coupBlock', { blockRole: 'ambassador' })} style={{ flex: 1, fontSize: '0.75rem' }}>
                          🛡️ บล็อค (ทูต)
                        </button>
                      </>
                    )}
                    {activeAction.type === 'assassinate' && (
                      <button className="btn-secondary" onClick={() => socket.emit('coupBlock', { blockRole: 'contessa' })} style={{ flex: 1 }}>
                        🛡️ บล็อค (คอนเตส)
                      </button>
                    )}
                  </div>
                )}
                {canIChallengeBlock && (
                  <button className="btn-primary" onClick={() => socket.emit('coupChallengeBlock')} style={{ background: '#ff4757', color: '#fff', boxShadow: 'none', marginBottom: '4px' }}>
                    ⚔️ จับโกหกการบล็อค (Challenge Block)
                  </button>
                )}
                {!roomState.hasPassed && (
                  <button className="btn-secondary" onClick={() => socket.emit('coupPass')}>
                    ผ่าน / ยอมรับ (Pass)
                  </button>
                )}
                {roomState.hasPassed && (
                  <span style={{ color: 'var(--accent-blue)', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ ผ่านแล้ว รอเพื่อนๆ</span>
                )}
              </div>
            )}
          </div>
        );
      case 'CHALLENGE_RESOLVING':
        const challengedPlayerName = roomState.players.find(p => p.id === roomState.activeAction.sourceId)?.name;
        const isChallengedMe = roomState.activeAction.sourceId === socket.id;

        return (
          <div className="coup-prompt-desc">
            {isChallengedMe ? (
              <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                ⚠️ คุณถูกท้าทาย! คลิกเปิดไพ่ที่เคลม ({roomState.activeAction.claimedRole}) เพื่อสู้ตัวตน
              </span>
            ) : (
              <span>รอ <b>{challengedPlayerName}</b> โชว์ไพ่สู้คดีท้าทาย...</span>
            )}
          </div>
        );
      case 'BLOCK_CHALLENGE_RESOLVING':
        const blockerPlayerName = roomState.players.find(p => p.id === roomState.activeAction.blockedBy)?.name;
        const isBlockerMe = roomState.activeAction.blockedBy === socket.id;

        return (
          <div className="coup-prompt-desc">
            {isBlockerMe ? (
              <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                ⚠️ การขัดขวางของคุณถูกท้าทาย! คลิกเปิดไพ่ขัดขวาง ({roomState.activeAction.blockedRole}) เพื่อสู้ตัวตน
              </span>
            ) : (
              <span>รอ <b>{blockerPlayerName}</b> โชว์ไพ่พิสูจน์การขัดขวาง...</span>
            )}
          </div>
        );
      case 'DISCARDING':
        const discardPlayerName = roomState.players.find(p => p.id === roomState.pendingDiscardPlayerId)?.name;
        const isDiscardMe = roomState.pendingDiscardPlayerId === socket.id;

        return (
          <div className="coup-prompt-desc">
            {isDiscardMe ? (
              <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                ☠️ ไพ่ของคุณตายลง 1 ใบ! คลิกเลือกไพ่ที่จะทิ้ง (Discard)
              </span>
            ) : (
              <span>รอ <b>{discardPlayerName}</b> เลือกทิ้งการ์ดเพื่อเสียอิทธิพล...</span>
            )}
          </div>
        );
      case 'EXCHANGING':
        const isExchangerMe = activeActor?.id === socket.id;
        
        if (isExchangerMe) {
          const myLiveCards = myActivePlayer?.cards.filter(c => !c.dead) || [];
          const allOptions = [...myLiveCards.map(c => c.role), ...roomState.exchangeCards];

          const handleExchangeCheckboxChange = (idx) => {
            if (selectedExchangeIndices.includes(idx)) {
              setSelectedExchangeIndices(selectedExchangeIndices.filter(i => i !== idx));
            } else {
              if (selectedExchangeIndices.length < myLiveCards.length) {
                setSelectedExchangeIndices([...selectedExchangeIndices, idx]);
              }
            }
          };

          const submitExchange = () => {
            if (selectedExchangeIndices.length !== myLiveCards.length) return;
            socket.emit('coupExchangeSelect', { keptIndices: selectedExchangeIndices });
            setSelectedExchangeIndices([]);
          };

          return (
            <div className="exchange-selector-container">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                เลือกไพ่ {myLiveCards.length} ใบที่คุณต้องการเก็บไว้:
              </span>
              <div className="exchange-cards-row">
                {allOptions.map((role, idx) => (
                  <label key={idx} className="exchange-card-option">
                    <input 
                      type="checkbox" 
                      checked={selectedExchangeIndices.includes(idx)} 
                      onChange={() => handleExchangeCheckboxChange(idx)} 
                    />
                    <CoupCard role={role} dead={false} isSelectable={true} />
                  </label>
                ))}
              </div>
              <button 
                className="btn-primary" 
                disabled={selectedExchangeIndices.length !== myLiveCards.length} 
                onClick={submitExchange}
                style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }}
              >
                ยืนยันสลับไพ่
              </button>
            </div>
          );
        }

        return (
          <div className="coup-prompt-desc">
            รอ <b>{activeActor?.name}</b> แลกเปลี่ยนไพ่ทูต...
          </div>
        );
      case 'GAME_OVER':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>
              🏆 {roomState.winner?.name} ชนะการแข่งขัน!
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              โค่นอำนาจเพื่อนทุกคนบนโต๊ะสำเร็จ
            </span>
          </div>
        );
      default:
        return null;
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

            <div className="form-group">
              <label className="form-label">เลือกเกมที่ต้องการเล่น (Select Game)</label>
              <div className="game-type-selector">
                <label className="game-type-option">
                  <input 
                    type="radio" 
                    name="gameType" 
                    value="poker" 
                    checked={gameType === 'poker'}
                    onChange={() => setGameType('poker')} 
                  />
                  <div className="game-type-card">
                    <span className="game-type-icon">♣️</span>
                    <span className="game-type-label">เท็กซัส โฮลเด็ม</span>
                  </div>
                </label>
                <label className="game-type-option">
                  <input 
                    type="radio" 
                    name="gameType" 
                    value="checkers" 
                    checked={gameType === 'checkers'}
                    onChange={() => setGameType('checkers')} 
                  />
                  <div className="game-type-card">
                    <span className="game-type-icon">🏁</span>
                    <span className="game-type-label">หมากฮอส</span>
                  </div>
                </label>
                <label className="game-type-option">
                  <input 
                    type="radio" 
                    name="gameType" 
                    value="coup" 
                    checked={gameType === 'coup'}
                    onChange={() => setGameType('coup')} 
                  />
                  <div className="game-type-card">
                    <span className="game-type-icon">👑</span>
                    <span className="game-type-label">โค่นอำนาจ (Coup)</span>
                  </div>
                </label>
              </div>
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

          <button 
            id="leave-room-btn" 
            className="host-btn" 
            onClick={handleLeaveRoom}
            style={{ 
              background: 'rgba(255, 71, 87, 0.15)', 
              border: '1px solid rgba(255, 71, 87, 0.3)', 
              color: '#ff4757', 
              boxShadow: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.85rem'
            }}
          >
            🚪 ออกจากห้อง
          </button>

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

        {roomState.gameType === 'checkers' ? (
          <div className="checkers-board-wrapper">
            {/* Checkers Info Bar */}
            <div className="checkers-info-bar">
              <div style={{ display: 'flex', gap: '16px' }}>
                <span style={{ color: '#ff5252' }}>
                  🔴 แดง: {roomState.players.find(p => p.color === 'red')?.name || 'ว่าง'}
                </span>
                <span style={{ color: '#a0a0a0' }}>VS</span>
                <span style={{ color: '#ffffff' }}>
                  ⚫ ดำ: {roomState.players.find(p => p.color === 'black')?.name || 'ว่าง'}
                </span>
              </div>
              
              <div className="checkers-active-turn">
                {roomState.gameState === 'PLAYING' && (
                  <>
                    <span className={`checkers-turn-dot ${roomState.turn === 'red' ? 'dot-red' : 'dot-black'}`}></span>
                    <span>ตาของ: {roomState.turn === 'red' ? 'สีแดง' : 'สีดำ'}</span>
                  </>
                )}
                {roomState.gameState === 'WAITING' && <span>รอเริ่มเกม</span>}
                {roomState.gameState === 'GAME_OVER' && (
                  <span style={{ color: 'var(--accent-blue)' }}>
                    🎉 {roomState.winner === 'red' ? 'สีแดงชนะ!' : 'สีดำชนะ!'}
                  </span>
                )}
              </div>
            </div>

            {/* Checkers Board Grid */}
            <div className="checkers-board">
              {[7, 6, 5, 4, 3, 2, 1, 0].map(r => (
                [0, 1, 2, 3, 4, 5, 6, 7].map(c => {
                  const piece = roomState.board[r][c];
                  const isDarkSquare = (r + c) % 2 === 1;
                  const isSelected = selectedSquare && selectedSquare.row === r && selectedSquare.col === c;
                  
                  // Filter valid moves
                  const activeMovesForSelectedPiece = selectedSquare
                    ? (roomState.validMoves || []).filter(m => m.from.row === selectedSquare.row && m.from.col === selectedSquare.col)
                    : [];
                  
                  const isDest = activeMovesForSelectedPiece.some(m => m.to.row === r && m.to.col === c);
                  
                  const isLastMoveSquare = roomState.lastMove && (
                    (roomState.lastMove.from.row === r && roomState.lastMove.from.col === c) ||
                    (roomState.lastMove.to.row === r && roomState.lastMove.to.col === c)
                  );

                  let squareClass = `checkers-square ${isDarkSquare ? 'square-dark' : 'square-light'}`;
                  if (isDest) squareClass += ' square-highlight';
                  else if (isLastMoveSquare) squareClass += ' square-last-move';

                  const handleSquareClick = () => {
                    if (roomState.gameState !== 'PLAYING') return;

                    // If clicking a highlighted destination, make the move
                    if (isDest) {
                      socket.emit('makeMove', { from: selectedSquare, to: { row: r, col: c } });
                      setSelectedSquare(null);
                      return;
                    }

                    // Otherwise check if clicking own piece to select
                    if (piece && piece.color === myPlayer?.color) {
                      const hasMoves = (roomState.validMoves || []).some(m => m.from.row === r && m.from.col === c);
                      if (hasMoves) {
                        setSelectedSquare({ row: r, col: c });
                      } else {
                        setSelectedSquare(null);
                      }
                    } else {
                      setSelectedSquare(null);
                    }
                  };

                  return (
                    <div 
                      key={`${r}-${c}`} 
                      className={squareClass}
                      onClick={handleSquareClick}
                    >
                      {/* Render Piece */}
                      {piece && (
                        <div className={`checkers-piece ${piece.color === 'red' ? 'piece-red' : 'piece-black'} ${piece.type === 'king' ? 'piece-king' : ''} ${isSelected ? 'piece-selected' : ''}`} />
                      )}
                    </div>
                  );
                })
              ))}
            </div>

            {/* Checkers Game Over / Lobby buttons */}
            {roomState.gameState === 'GAME_OVER' && (
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: '8px' }}>เกมจบลงแล้ว!</h3>
                {isHost && (
                  <button className="host-btn" onClick={handleStartGame}>
                    เริ่มใหม่ (Play Again)
                  </button>
                )}
              </div>
            )}
            
            {roomState.gameState === 'WAITING' && (
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <h3 style={{ color: 'var(--text-muted)' }}>รอคู่แข่งเตรียมตัว...</h3>
                {isHost && (
                  <button id="start-game-btn" className="host-btn" style={{ marginTop: '12px' }} onClick={handleStartGame}>
                    เริ่มบอร์ดเกม (Start Game)
                  </button>
                )}
              </div>
            )}
          </div>
        ) : roomState.gameType === 'coup' ? (
          <>
            {/* The Coup Table container */}
            <div className="poker-table-container">
              <div className="coup-table">
                {/* Event banner */}
                {roomState.lastEvent && (
                  <div className="last-action-indicator" style={{ top: '8%', fontSize: '0.85rem' }}>
                    📢 {roomState.lastEvent}
                  </div>
                )}

                {/* Center status prompt card */}
                <div className="coup-center-prompt glass">
                  <span className="coup-prompt-title">
                    {roomState.gameState === 'PLAYING' ? 'กำลังเล่น (Playing)' : 
                     roomState.gameState === 'ACTION_PENDING' ? 'รอยืนยันแอคชัน' :
                     roomState.gameState === 'CHALLENGE_RESOLVING' ? 'จับโกหก (Challenge)' :
                     roomState.gameState === 'BLOCK_CHALLENGE_RESOLVING' ? 'จับโกหกการขัดขวาง' :
                     roomState.gameState === 'DISCARDING' ? 'เลือกทิ้งการ์ด' :
                     roomState.gameState === 'EXCHANGING' ? 'เอกอัครราชทูตแลกเปลี่ยน' :
                     roomState.gameState === 'GAME_OVER' ? 'จบการแข่งขัน' : ''}
                  </span>

                  {/* Sub status descriptions */}
                  {renderCoupCenterPrompt()}
                </div>

                {/* Render circular players */}
                {playerNodes.map(({ player, x, y, isTurn }) => {
                  const isTargetable = targetSelectMode && player.id !== socket.id && !player.isDead && !player.spectating;
                  const isMyNode = player.id === socket.id;

                  return (
                    <div 
                      key={player.id}
                      className={`player-node ${isTurn ? 'is-turn' : ''} ${player.isDead ? 'folded' : ''} ${isTargetable ? 'is-target' : ''}`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      onClick={() => isTargetable && handlePlayerNodeClick(player)}
                    >
                      {/* Render target selection banner */}
                      {isTargetable && (
                        <div className="target-select-indicator">
                          🎯 เลือกคนนี้
                        </div>
                      )}

                      {/* Coins bubble */}
                      {!player.spectating && !player.isDead && (
                        <div className="coup-coins-bubble">
                          🪙 {player.coins}
                        </div>
                      )}

                      {/* Avatar */}
                      <div className="player-avatar-wrapper">
                        <div className="player-avatar">
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>

                      {/* Player Info Card */}
                      <div className="player-info-card" style={{ marginBottom: '8px' }}>
                        <div className="player-name">{player.name} {isMyNode && '(คุณ)'}</div>
                        <div className="player-chips" style={{ fontSize: '0.75rem' }}>
                          {player.spectating ? 'Spectator' : player.isDead ? '☠️ ตายแล้ว' : 'กำลังเล่น'}
                        </div>
                      </div>

                      {/* Player Cards (Influence) */}
                      {!player.spectating && player.cards && (
                        <div className="coup-card-wrapper">
                          {player.cards.map((c, cidx) => {
                            const isSelectableReveal = (roomState.gameState === 'CHALLENGE_RESOLVING' && roomState.activeAction?.sourceId === socket.id && isMyNode && !c.dead) ||
                                                      (roomState.gameState === 'BLOCK_CHALLENGE_RESOLVING' && roomState.activeAction?.blockedBy === socket.id && isMyNode && !c.dead);
                            
                            const isSelectableDiscard = roomState.gameState === 'DISCARDING' && roomState.pendingDiscardPlayerId === socket.id && isMyNode && !c.dead;
                            
                            const handleCardClick = () => {
                              if (isSelectableReveal) {
                                socket.emit('coupReveal', { cardIdx: cidx });
                              } else if (isSelectableDiscard) {
                                socket.emit('coupDiscard', { cardIdx: cidx });
                              }
                            };

                            return (
                              <CoupCard 
                                key={cidx} 
                                role={c.role} 
                                dead={c.dead} 
                                onClick={handleCardClick}
                                isSelectable={isSelectableReveal || isSelectableDiscard}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Control Panel (Bottom) */}
            <div className="action-panel-container">
              <div className="action-bar glass" style={{ minHeight: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {targetSelectMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      🎯 เลือกผู้เล่นเป้าหมายสำหรับคำสั่ง {targetSelectMode === 'steal' ? 'ขโมยเงิน' : targetSelectMode === 'assassinate' ? 'ลอบสังหาร' : 'โค่นอำนาจ'}
                    </span>
                    <button className="btn-secondary" onClick={() => setTargetSelectMode(null)} style={{ padding: '6px 12px', width: 'auto', fontSize: '0.8rem', cursor: 'pointer' }}>
                      ยกเลิก (Cancel)
                    </button>
                  </div>
                ) : (
                  renderCoupActionPanel()
                )}
              </div>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
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
