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

function UnoCard({ color, type, onClick, isSelectable = true, isMini = false }) {
  const displayColorClass = `color-${color}`;
  
  const displayType = {
    'skip': '🚫',
    'reverse': '🔄',
    'discard_all': '🗑️',
    '+2': '+2',
    '+6': '+6',
    'wild': '🎨',
    'wild_draw_10': '+10',
    'wild_swap': '🌀',
    'wild_skip_all': '💥',
    'wild_draw_4_reverse': '↩️+4',
    'hidden': '?'
  }[type] || type;

  const style = isMini ? { width: '40px', height: '60px', fontSize: '0.9rem' } : {};

  return (
    <div 
      className={`uno-card ${displayColorClass} ${onClick && isSelectable ? '' : 'no-hover'}`} 
      onClick={isSelectable ? onClick : undefined}
      style={style}
    >
      <div className="uno-card-oval" />
      <span style={{ zIndex: 5 }}>{displayType}</span>
    </div>
  );
}

function BangCard({ type, color, onClick, isSelectable = true }) {
  const isHidden = type === 'hidden';
  const colorClass = isHidden ? 'card-hidden' : `card-${color}`;
  
  const displayType = {
    'bang': '💥 BANG!',
    'missed': '🛡️ MISSED!',
    'beer': '🍺 BEER',
    'stagecoach': '🐎 STAGECOACH',
    'wells_fargo': '🚂 WELLS FARGO',
    'gatling': '🔫 GATLING',
    'indians': '🏹 INDIANS!',
    'cat_balou': '✂️ CAT BALOU',
    'panic': '🎒 PANIC!',
    'barrel': '🛢️ BARREL',
    'mustang': '🐎 MUSTANG',
    'schofield': '🔫 SCHOFIELD (2)',
    'winchester': '🔫 WINCHESTER (5)',
    'volcanic': '🔫 VOLCANIC (1)'
  }[type] || type;

  return (
    <div 
      className={`bang-card ${colorClass} ${onClick && isSelectable ? '' : 'no-hover'}`}
      onClick={isSelectable ? onClick : undefined}
    >
      <span style={{ fontSize: '0.6rem', textAlign: 'center' }}>{displayType}</span>
      {!isHidden && <span style={{ fontSize: '0.45rem', opacity: 0.6, alignSelf: 'center', marginTop: 'auto' }}>{color === 'blue' ? 'อุปกรณ์' : 'กดใช้งาน'}</span>}
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
  const [insiderGuessInput, setInsiderGuessInput] = useState('');
  const [undercoverDescInput, setUndercoverDescInput] = useState('');
  const [undercoverWhiteGuessInput, setUndercoverWhiteGuessInput] = useState('');
  
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
    if (typeof targetSelectMode === 'string') {
      socket.emit('coupAction', { type: targetSelectMode, targetId: targetPlayer.id });
    } else if (targetSelectMode.cardId) {
      socket.emit('bangPlayBrown', { cardId: targetSelectMode.cardId, targetId: targetPlayer.id });
    }
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
          <h1 className="lobby-title animate-float">🎲 TABLETOP FRIENDS 👑</h1>
          <p className="lobby-subtitle">ห้องรวมบอร์ดเกมออนไลน์ เล่นสนุกกับกลุ่มเพื่อนแบบพรีเมียม</p>

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
              <label className="form-label" htmlFor="game-select-input">เลือกเกมที่ต้องการเล่น (Select Game)</label>
              <select 
                id="game-select-input"
                className="form-input" 
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
                style={{ 
                  background: 'rgba(22, 17, 13, 0.95)', 
                  border: '1px solid rgba(255, 183, 3, 0.25)', 
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  width: '100%',
                  outline: 'none'
                }}
              >
                <option value="poker" style={{ background: '#221913', color: '#fff' }}>♣️ เท็กซัส โฮลเด็ม โป๊กเกอร์ (Texas Hold'em)</option>
                <option value="checkers" style={{ background: '#221913', color: '#fff' }}>🏁 หมากฮอสไทย (Thai Checkers)</option>
                <option value="coup" style={{ background: '#221913', color: '#fff' }}>👑 โค่นอำนาจ (Coup - Social Deduction)</option>
                <option value="uno" style={{ background: '#221913', color: '#fff' }}>🎴 อูโน่ ไร้ความปรานี (UNO No Mercy)</option>
                <option value="bang" style={{ background: '#221913', color: '#fff' }}>🤠 นายอำเภอดวลปืน (BANG! Cowboy)</option>
                <option value="insider" style={{ background: '#221913', color: '#fff' }}>🕵️ จับโกหกคนวงใน (Insider)</option>
                <option value="undercover" style={{ background: '#221913', color: '#fff' }}>🕵️‍♂️ สายลับประลองรหัสลับ (Undercover)</option>
              </select>
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
        ) : roomState.gameType === 'uno' ? (
          <>
            {/* The UNO Table container */}
            <div className="poker-table-container">
              <div className="uno-table" style={{ border: `15px solid #14171f`, borderColor: roomState.currentColor ? `var(--color-${roomState.currentColor}, #14171f)` : '#14171f' }}>
                
                {/* Event banner */}
                {roomState.lastEvent && (
                  <div className="last-action-indicator" style={{ top: '8%', fontSize: '0.85rem' }}>
                    📢 {roomState.lastEvent}
                  </div>
                )}

                {/* Stacking Penalty Banner */}
                {roomState.drawPenalty > 0 && (
                  <div className="spectating-notice glass" style={{ top: '15%', border: '1px solid #ff4757', background: 'rgba(255, 71, 87, 0.15)', color: '#ff4757', fontWeight: 'bold', animation: 'pulse-turn 1s infinite' }}>
                    ⚠️ โทษสะสมสะสม: +{roomState.drawPenalty} ใบ! (ต้องสะสมหรือจั่ว!)
                  </div>
                )}

                {/* Color selector popup (Active player choose color) */}
                {roomState.gameState === 'COLOR_SELECT' && roomState.players[roomState.turnIndex]?.id === socket.id && (
                  <div className="color-select-popup">
                    <span className="coup-prompt-title">🎨 เลือกสีที่ต้องการเปลี่ยน</span>
                    <div className="color-select-grid">
                      <button className="color-btn btn-red" onClick={() => socket.emit('unoSelectColor', { color: 'red' })}>แดง</button>
                      <button className="color-btn btn-green" onClick={() => socket.emit('unoSelectColor', { color: 'green' })}>เขียว</button>
                      <button className="color-btn btn-blue" onClick={() => socket.emit('unoSelectColor', { color: 'blue' })}>ฟ้า</button>
                      <button className="color-btn btn-yellow" onClick={() => socket.emit('unoSelectColor', { color: 'yellow' })}>เหลือง</button>
                    </div>
                  </div>
                )}

                {/* Keep or Play choice for drawn card */}
                {roomState.recentlyDrawnCard && roomState.players[roomState.turnIndex]?.id === socket.id && (
                  <div className="color-select-popup" style={{ width: '300px' }}>
                    <span className="coup-prompt-title">🎲 จั่วได้การ์ดที่เล่นได้!</span>
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
                      <UnoCard color={roomState.recentlyDrawnCard.color} type={roomState.recentlyDrawnCard.type} isSelectable={false} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-primary" style={{ flex: 1, padding: '8px 0', fontSize: '0.8rem' }} onClick={() => socket.emit('unoPlayCard', { cardId: roomState.recentlyDrawnCard.id })}>
                        วางทันที (Play)
                      </button>
                      <button className="btn-secondary" style={{ flex: 1, padding: '8px 0', fontSize: '0.8rem' }} onClick={() => socket.emit('unoKeepCard')}>
                        เก็บขึ้นมือ (Keep)
                      </button>
                    </div>
                  </div>
                )}

                {/* Center Piles */}
                <div className="uno-center-pile">
                  {/* Draw Pile (Card back) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div 
                      className="uno-card uno-card-back" 
                      onClick={() => {
                        const isMyTurn = roomState.players[roomState.turnIndex]?.id === socket.id;
                        if (isMyTurn && roomState.gameState === 'PLAYING' && !roomState.recentlyDrawnCard) {
                          socket.emit('unoDrawCard');
                        }
                      }}
                      style={{ cursor: roomState.players[roomState.turnIndex]?.id === socket.id && roomState.gameState === 'PLAYING' && !roomState.recentlyDrawnCard ? 'pointer' : 'default' }}
                    >
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>กองจั่ว (Draw)</span>
                  </div>

                  {/* Discard Pile */}
                  {roomState.currentCard && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <UnoCard color={roomState.currentColor} type={roomState.currentType} isSelectable={false} />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        สีปัจจุบัน: 
                        <span 
                          className={`uno-active-color-indicator color-dot-${roomState.currentColor}`} 
                          style={{ marginLeft: '4px', verticalAlign: 'middle' }}
                        />
                      </span>
                    </div>
                  )}
                </div>

                {/* Circular Players */}
                {playerNodes.map(({ player, x, y, isTurn }) => {
                  const isMyNode = player.id === socket.id;
                  return (
                    <div 
                      key={player.id}
                      className={`player-node ${isTurn ? 'is-turn' : ''} ${player.spectating ? 'folded' : ''}`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                    >
                      {/* Cards counter */}
                      {!player.spectating && (
                        <div className="uno-cards-counter" style={{ background: player.cardCount >= 20 ? '#ff4757' : player.cardCount === 1 ? '#ffa502' : '#2ed573' }}>
                          🎴 {player.cardCount}
                        </div>
                      )}

                      {/* UNO shout indicator */}
                      {player.cardCount === 1 && (
                        <div className="target-select-indicator" style={{ background: '#ffa502', animation: 'pulse-turn 0.8s infinite' }}>
                          🔊 UNO!
                        </div>
                      )}

                      {/* Avatar */}
                      <div className="player-avatar-wrapper">
                        <div className="player-avatar">
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>

                      {/* Player Info Card */}
                      <div className="player-info-card">
                        <div className="player-name">{player.name} {isMyNode && '(คุณ)'}</div>
                        <div className="player-chips" style={{ fontSize: '0.75rem' }}>
                          {player.spectating ? '☠️ ตกรอบ / ผู้ชม' : `การ์ด: ${player.cardCount} ใบ`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom active player hand */}
            <div className="uno-hand-wrapper">
              <div className="uno-hand-scroll">
                {myPlayer && !myPlayer.spectating && myPlayer.cards && myPlayer.cards.map((c) => {
                  // Card playable checks
                  const isMyTurn = roomState.players[roomState.turnIndex]?.id === socket.id;
                  const isPlayableColor = c.color === 'wild' || c.color === roomState.currentColor;
                  const isPlayableType = c.type === roomState.currentType;

                  let isPlayable = isMyTurn && roomState.gameState === 'PLAYING' && !roomState.recentlyDrawnCard && (isPlayableColor || isPlayableType);
                  
                  // Stacking check: If drawPenalty > 0, we can ONLY play equal/greater draw cards
                  if (roomState.drawPenalty > 0) {
                    const isDrawCard = c.type === '+2' || c.type === '+6' || c.type === 'wild_draw_10' || c.type === 'wild_draw_4_reverse';
                    if (isDrawCard) {
                      const getVal = (t) => {
                        if (t === '+2') return 2;
                        if (t === 'wild_draw_4_reverse') return 4;
                        if (t === '+6') return 6;
                        if (t === 'wild_draw_10') return 10;
                        return 0;
                      };
                      const activePenaltyCardType = roomState.currentCard.type;
                      isPlayable = isMyTurn && roomState.gameState === 'PLAYING' && getVal(c.type) >= getVal(activePenaltyCardType);
                    } else {
                      isPlayable = false;
                    }
                  }

                  return (
                    <UnoCard 
                      key={c.id} 
                      color={c.color} 
                      type={c.type} 
                      onClick={() => socket.emit('unoPlayCard', { cardId: c.id })}
                      isSelectable={isPlayable}
                    />
                  );
                })}
              </div>
            </div>

            {/* Bottom action bar overlay for Draw Penalty */}
            {roomState.drawPenalty > 0 && roomState.players[roomState.turnIndex]?.id === socket.id && (
              <div className="action-panel-container">
                <div className="action-bar glass" style={{ minHeight: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <button 
                    className="btn-primary" 
                    onClick={() => socket.emit('unoResolvePenalty')}
                    style={{ background: '#ff4757', color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(255, 71, 87, 0.4)', padding: '10px 24px', width: 'auto', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    ☠️ ยอมรับโทษและจั่วการ์ด +{roomState.drawPenalty} ใบ
                  </button>
                </div>
              </div>
            )}
          </>
        ) : roomState.gameType === 'undercover' ? (
          <>
            {/* The Undercover Table container */}
            <div className="poker-table-container">
              <div className="undercover-table">
                
                {/* Event banner */}
                {roomState.lastEvent && (
                  <div className="last-action-indicator" style={{ top: '8%', fontSize: '0.85rem' }}>
                    📢 {roomState.lastEvent}
                  </div>
                )}

                {/* Center Word & Prompt */}
                <div className="coup-center-prompt glass" style={{ width: '310px', padding: '16px' }}>
                  <span className="coup-prompt-title">คำคีย์เวิร์ดของคุณ (Your Word)</span>
                  
                  <div style={{ margin: '12px 0', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>คำศัพท์สปาย:</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: myPlayer?.word === '???' ? '#ff4757' : '#2ed573', letterSpacing: '1px' }}>
                      {myPlayer?.word}
                    </div>
                  </div>

                  {roomState.gameState === 'PLAYING' && (
                    <div className="coup-prompt-desc">
                      ตาของ <b style={{ color: 'var(--primary)' }}>{roomState.players[roomState.turnIndex]?.name}</b> ในการเขียนคำอธิบาย
                    </div>
                  )}

                  {roomState.gameState === 'VOTING' && (
                    <div className="coup-prompt-desc" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                      🗳️ ช่วงเวลาโหวตจับผิด! คลิกเลือกคนที่มีคำใบ้ต่างจากพวกเพื่อคัดออก
                    </div>
                  )}

                  {roomState.gameState === 'MR_WHITE_GUESSING' && (
                    <div className="coup-prompt-desc" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                      ⏳ กำลังรอให้ Mr. White ทายคำของคนธรรมดา...
                    </div>
                  )}

                  {roomState.gameState === 'GAME_OVER' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: roomState.winner === 'civilians' ? '#2ed573' : '#ff4757' }}>
                        {roomState.winner === 'civilians' ? '🎉 ฝั่งคนธรรมดา (Civilians) ชนะ!' : '👽 ฝั่งสายลับ/คนใบ้ ชนะ!'}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>คำของคนธรรมดา: <b>{roomState.civilianWord}</b></span>
                        <span>คำของสายลับ: <b>{roomState.undercoverWord}</b></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Circular Players */}
                {playerNodes.map(({ player, x, y, isTurn }) => {
                  const isMyNode = player.id === socket.id;
                  const hasVoted = player.votedFor !== null;
                  
                  // Can vote for this player if in voting phase, player is alive/not me/not spectator, and I haven't voted yet
                  const canVoteThisPlayer = roomState.gameState === 'VOTING' && 
                                           player.id !== socket.id && 
                                           !player.spectating && 
                                           !player.isDead &&
                                           myPlayer && !myPlayer.spectating && !myPlayer.isDead &&
                                           !myPlayer.votedFor;

                  return (
                    <div 
                      key={player.id}
                      className={`player-node ${isTurn && roomState.gameState === 'PLAYING' ? 'is-turn' : ''} ${player.isDead ? 'folded' : ''} ${canVoteThisPlayer ? 'is-target' : ''}`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      onClick={() => canVoteThisPlayer && socket.emit('undercoverVote', { targetId: player.id })}
                    >
                      {/* Voting indicator */}
                      {canVoteThisPlayer && (
                        <div className="target-select-indicator" style={{ top: '-35px' }}>
                          🗳️ โหวตคัดออก
                        </div>
                      )}

                      {/* Vote badge mark */}
                      {roomState.gameState === 'VOTING' && hasVoted && (
                        <div className="bang-role-badge role-hidden" style={{ background: '#ffa502', color: '#000' }}>
                          โหวตแล้ว ✓
                        </div>
                      )}

                      {/* Role display badge */}
                      {!player.spectating && (
                        <div className={`bang-role-badge role-${player.role}`}>
                          {player.isDead || roomState.gameState === 'GAME_OVER' || isMyNode ? (
                            player.role === 'civilian' ? 'Civilian 🧑' :
                            player.role === 'undercover' ? 'Spy 👽' : 'Mr. White 👁️'
                          ) : 'Hidden 🕵️'}
                        </div>
                      )}

                      {/* Avatar */}
                      <div className="player-avatar-wrapper">
                        <div className="player-avatar">
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>

                      {/* Player Info Card */}
                      <div className="player-info-card">
                        <div className="player-name">
                          {player.name} {isMyNode && '(คุณ)'}
                        </div>
                        <div className="player-chips" style={{ fontSize: '0.75rem' }}>
                          {player.isDead ? '☠️ คัดออกแล้ว' : player.spectating ? 'ผู้ชม' : 'มีชีวิต'}
                        </div>
                      </div>

                      {/* Word Description Bubble */}
                      {!player.spectating && !player.isDead && player.description && (
                        <div className={`player-desc-bubble ${isTurn ? 'active' : ''}`}>
                          💬 {player.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom panel control inputs */}
            <div className="action-panel-container">
              <div className="action-bar glass" style={{ minHeight: '80px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 24px', justifyContent: 'center', alignItems: 'center' }}>
                {roomState.gameState === 'PLAYING' && (
                  <>
                    {roomState.players[roomState.turnIndex]?.id === socket.id ? (
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (undercoverDescInput.trim()) {
                            socket.emit('undercoverSubmitDesc', { text: undercoverDescInput });
                            setUndercoverDescInput('');
                          }
                        }}
                        style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '400px' }}
                      >
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="เขียนคำอธิบายสั้นๆ ของคุณ (เช่น เครื่องดื่ม, แฟชั่น)..." 
                          value={undercoverDescInput}
                          onChange={(e) => setUndercoverDescInput(e.target.value)}
                          maxLength={25}
                        />
                        <button type="submit" className="btn-primary" style={{ width: '80px', margin: 0, padding: '0 12px', fontSize: '0.85rem' }}>
                          ส่งคำใบ้
                        </button>
                      </form>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        รอ <b>{roomState.players[roomState.turnIndex]?.name}</b> เขียนอธิบายคำใบ้...
                      </span>
                    )}
                  </>
                )}

                {roomState.gameState === 'VOTING' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    {myPlayer?.isDead || myPlayer?.spectating ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>คุณโดนคัดออกแล้ว นั่งชมเพื่อนโหวต...</span>
                    ) : myPlayer?.votedFor ? (
                      <span style={{ color: '#2ed573', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        ✓ โหวตเรียบร้อยแล้ว รอผู้เล่นคนอื่นลงคะแนน...
                      </span>
                    ) : (
                      <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        👉 กรุณาคลิกเลือกโหวตคนที่พูดคำใบ้ต่างจากกลุ่มบนหน้าจอโต๊ะด้านบน
                      </span>
                    )}
                  </div>
                )}

                {roomState.gameState === 'MR_WHITE_GUESSING' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' }}>
                    {roomState.mrWhiteGuesserId === socket.id ? (
                      <>
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          👁️ คุณคือ Mr. White! ทายคำรหัสของคนธรรมดาเพื่อพลิกชนะเกม:
                        </span>
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (undercoverWhiteGuessInput.trim()) {
                              socket.emit('undercoverWhiteGuess', { text: undercoverWhiteGuessInput });
                              setUndercoverWhiteGuessInput('');
                            }
                          }}
                          style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '350px' }}
                        >
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="พิมพ์คำทาย (เช่น แอปเปิ้ล, กาแฟ)..." 
                            value={undercoverWhiteGuessInput}
                            onChange={(e) => setUndercoverWhiteGuessInput(e.target.value)}
                            maxLength={20}
                          />
                          <button type="submit" className="btn-primary" style={{ width: '80px', margin: 0, padding: '0 12px', fontSize: '0.85rem' }}>
                            ส่งคำทาย
                          </button>
                        </form>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        รอ <b>{roomState.players.find(p => p.id === roomState.mrWhiteGuesserId)?.name}</b> (Mr. White) พิมพ์สะกดคำทายรหัสลับ...
                      </span>
                    )}
                  </div>
                )}

                {roomState.gameState === 'GAME_OVER' && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    เกมสิ้นสุดลงแล้ว! หัวหน้าห้องสามารถกดสลับหรือแจกตาใหม่ต่อได้เลย
                  </span>
                )}
              </div>
            </div>
          </>
        ) : roomState.gameType === 'insider' ? (
          <>
            {/* The Insider Table container */}
            <div className="poker-table-container">
              <div className="insider-table">
                
                {/* Event banner */}
                {roomState.lastEvent && (
                  <div className="last-action-indicator" style={{ top: '8%', fontSize: '0.85rem' }}>
                    📢 {roomState.lastEvent}
                  </div>
                )}

                {/* Center Word & Timer Display */}
                <div className="coup-center-prompt glass" style={{ width: '320px', padding: '16px' }}>
                  <span className="coup-prompt-title">คำปริศนา (Secret Word)</span>
                  
                  {/* Timer display */}
                  {roomState.gameState === 'PLAYING' && (
                    <div className="insider-timer">
                      ⏳ {Math.floor(roomState.timerSeconds / 60)}:{(roomState.timerSeconds % 60).toString().padStart(2, '0')}
                    </div>
                  )}

                  <div className="coup-prompt-desc" style={{ marginTop: '4px' }}>
                    หมวดหมู่: <b style={{ color: 'var(--primary)' }}>{roomState.category}</b>
                  </div>

                  <div style={{ margin: '14px 0', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>คำศัพท์ปริศนา:</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: roomState.targetWord === '???' ? 'var(--text-muted)' : '#2ed573', letterSpacing: '1px' }}>
                      {roomState.targetWord}
                    </div>
                  </div>

                  {/* Guess validation queue (Shown to Master) */}
                  {roomState.gameState === 'PLAYING' && myPlayer?.role === 'master' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>👮 แผงควบคุมคำทายของ Master:</span>
                      
                      <div className="insider-guesses-box">
                        {roomState.guesses.length === 0 ? (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>ยังไม่มีคำทายเข้ามา...</span>
                        ) : (
                          roomState.guesses.map((g) => (
                            <div key={g.id} className={`guess-row ${g.approved === true ? 'approved' : g.approved === false ? 'rejected' : 'pending'}`}>
                              <span><b>{g.name}:</b> {g.text}</span>
                              {g.approved === null && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button 
                                    className="btn-primary" 
                                    onClick={() => socket.emit('insiderRespondGuess', { guessId: g.id, approved: true })}
                                    style={{ background: '#2ed573', color: '#000', border: 'none', padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', cursor: 'pointer', width: 'auto' }}
                                  >
                                    ถูก
                                  </button>
                                  <button 
                                    className="btn-secondary" 
                                    onClick={() => socket.emit('insiderRespondGuess', { guessId: g.id, approved: false })}
                                    style={{ background: '#ff4757', color: '#fff', border: 'none', padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', cursor: 'pointer', width: 'auto' }}
                                  >
                                    ผิด
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Voting Instruction or Game Over details */}
                  {roomState.gameState === 'VOTING' && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      กดที่อวตาร์ผู้เล่นรอบโต๊ะเพื่อเลือกโหวตว่าใครเป็น **Insider**!
                    </div>
                  )}

                  {roomState.gameState === 'GAME_OVER' && (
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: roomState.winner === 'commoners' ? '#2ed573' : '#ff4757', marginTop: '6px' }}>
                      {roomState.winner === 'commoners' ? '🎉 ฝั่งคนธรรมดา (Commoners) ชนะ!' : '👽 ฝั่งคนวงใน (Insider) ชนะ!'}
                    </div>
                  )}
                </div>

                {/* Circular Players */}
                {playerNodes.map(({ player, x, y }) => {
                  const isMyNode = player.id === socket.id;
                  const hasVoted = player.votedFor !== null;
                  
                  // In voting phase, we can click players to vote for them (except master/self/spectator)
                  const canVoteThisPlayer = roomState.gameState === 'VOTING' && 
                                           player.id !== socket.id && 
                                           !player.spectating && 
                                           myPlayer && !myPlayer.spectating && 
                                           !myPlayer.votedFor;

                  return (
                    <div 
                      key={player.id}
                      className={`player-node ${canVoteThisPlayer ? 'is-target' : ''}`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      onClick={() => canVoteThisPlayer && socket.emit('insiderVote', { targetId: player.id })}
                    >
                      {/* Voting indicator */}
                      {canVoteThisPlayer && (
                        <div className="target-select-indicator" style={{ top: '-35px' }}>
                          🗳️ โหวตคนนี้
                        </div>
                      )}

                      {/* Vote tally/mark badge */}
                      {roomState.gameState === 'VOTING' && hasVoted && (
                        <div className="bang-role-badge role-hidden" style={{ background: '#ffa502', color: '#000' }}>
                          โหวตแล้ว ✓
                        </div>
                      )}

                      {/* Revealed Roles (GameOver) */}
                      {!player.spectating && (
                        <div className={`bang-role-badge role-${player.role}`}>
                          {player.role === 'master' ? 'Master 🎤' :
                           player.role === 'insider' && (isMyNode || roomState.gameState === 'GAME_OVER') ? 'Insider 👽' :
                           player.role === 'commoner' && (isMyNode || roomState.gameState === 'GAME_OVER') ? 'Commoner 🧑' : 'Hidden 🕵️'}
                        </div>
                      )}

                      {/* Avatar */}
                      <div className="player-avatar-wrapper">
                        <div className="player-avatar">
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>

                      {/* Player Info Card */}
                      <div className="player-info-card">
                        <div className="player-name">
                          {player.name} {isMyNode && '(คุณ)'}
                          {roomState.guesserId === player.id && ' 💡'}
                        </div>
                        <div className="player-chips" style={{ fontSize: '0.75rem' }}>
                          {player.spectating ? 'ผู้ชม' : player.role === 'master' ? 'ผู้ตอบคำถาม' : 'ผู้ร่วมถามสืบ'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active player guess submission area (Bottom panel) */}
            <div className="action-panel-container">
              <div className="action-bar glass" style={{ minHeight: '80px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 24px', justifyContent: 'center', alignItems: 'center' }}>
                {roomState.gameState === 'PLAYING' && (
                  <>
                    {myPlayer?.role === 'master' ? (
                      <span style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        🎤 คุณคือ Master! คอยตอบคำถามในแชท และตรวจสอบคำทายด้านบน
                      </span>
                    ) : (
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (insiderGuessInput.trim()) {
                            socket.emit('insiderSubmitGuess', { text: insiderGuessInput });
                            setInsiderGuessInput('');
                          }
                        }}
                        style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '400px' }}
                      >
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="พิมพ์เพื่อส่งคำทายศัพท์ปริศนา..." 
                          value={insiderGuessInput}
                          onChange={(e) => setInsiderGuessInput(e.target.value)}
                          maxLength={30}
                        />
                        <button type="submit" className="btn-primary" style={{ width: '80px', margin: 0, padding: '0 12px', fontSize: '0.85rem' }}>
                          ส่งคำทาย
                        </button>
                      </form>
                    )}
                  </>
                )}

                {roomState.gameState === 'VOTING' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    {myPlayer?.spectating ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>คุณกำลังรับชมช่วงโหวต...</span>
                    ) : myPlayer?.votedFor ? (
                      <span style={{ color: '#2ed573', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        ✓ โหวตเรียบร้อยแล้ว รอผู้เล่นท่านอื่นโหวตให้ครบ...
                      </span>
                    ) : (
                      <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        👉 ใครคือคนวงใน (Insider)? กรุณาคลิกเลือกโหวตที่ผู้เล่นคนอื่นบนโต๊ะ
                      </span>
                    )}
                  </div>
                )}

                {roomState.gameState === 'GAME_OVER' && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    การสืบคดีเสร็จสิ้นแล้ว! หัวหน้าห้องสามารถแจกตาถัดไปด้านซ้ายเพื่อเล่นต่อ
                  </span>
                )}
              </div>
            </div>
          </>
        ) : roomState.gameType === 'bang' ? (
          <>
            {/* The BANG! Table container */}
            <div className="poker-table-container">
              <div className="bang-table">
                
                {/* Event banner */}
                {roomState.lastEvent && (
                  <div className="last-action-indicator" style={{ top: '8%', fontSize: '0.85rem' }}>
                    📢 {roomState.lastEvent}
                  </div>
                )}

                {/* Center response / prompt card */}
                <div className="coup-center-prompt glass" style={{ width: '310px' }}>
                  <span className="coup-prompt-title">
                    {roomState.gameState === 'PLAYING' ? 'กำลังเล่น (Playing)' : 
                     roomState.gameState === 'WAITING_RESPONSE' ? 'ดวลเดือด (Duel)' :
                     roomState.gameState === 'GAME_OVER' ? 'จบเกมดวลปืน' : ''}
                  </span>

                  {roomState.gameState === 'PLAYING' && (
                    <div className="coup-prompt-desc">
                      ตาของ <b style={{ color: 'var(--primary)' }}>{roomState.players[roomState.turnIndex]?.name}</b> กำลังเลือกการ์ดเล่น...
                    </div>
                  )}

                  {roomState.gameState === 'WAITING_RESPONSE' && roomState.pendingResponse && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="coup-prompt-desc">
                        {roomState.pendingResponse.playerId === socket.id ? (
                          <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                            ⚠️ คุณตกเป็นเป้าหมาย! โดน {roomState.pendingResponse.attackCardType.toUpperCase()}
                            {roomState.pendingResponse.type === 'missed' ? ' (ต้องการการ์ด หลบ/Missed)' : ' (ต้องการการ์ด ยิง/Bang)'}
                          </span>
                        ) : (
                          <span>
                            รอ <b>{roomState.players.find(p => p.id === roomState.pendingResponse.playerId)?.name}</b> ป้องกันตัวจากการโจมตี...
                          </span>
                        )}
                      </div>
                      
                      {roomState.pendingResponse.playerId === socket.id && (
                        <button 
                          className="btn-primary" 
                          onClick={() => socket.emit('bangRespond', { cardId: null })}
                          style={{ background: '#ff4757', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          💥 ยอมรับกระสุน (-1 เลือด)
                        </button>
                      )}
                    </div>
                  )}

                  {roomState.gameState === 'GAME_OVER' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ color: 'var(--primary)', fontSize: '1.1rem', fontWeight: 'bold' }}>
                        🏆 ฝ่าย {roomState.winnerRole === 'law' ? 'ผู้พิทักษ์กฎหมาย 🤠' : roomState.winnerRole === 'outlaws' ? 'กลุ่มนอกกฎหมาย 💀' : 'คนทรยศ 🐍'} ชนะ!
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        การประลองฝุ่นตลบจบลงแล้ว
                      </span>
                    </div>
                  )}
                </div>

                {/* Circular Players */}
                {playerNodes.map(({ player, x, y, isTurn }) => {
                  const isMyNode = player.id === socket.id;
                  
                  // Range check for targets:
                  // Targetable if targetSelectMode is active, player is not me, player is not dead/spectating
                  let isTargetable = false;
                  if (targetSelectMode && player.id !== socket.id && !player.spectating && player.bullets > 0) {
                    if (targetSelectMode.type === 'panic') {
                      // Panic requires distance <= 1
                      const living = roomState.players.filter(p => !p.spectating && p.bullets > 0);
                      const myIdx = living.findIndex(p => p.id === socket.id);
                      const targetIdx = living.findIndex(p => p.id === player.id);
                      if (myIdx !== -1 && targetIdx !== -1) {
                        const dist = Math.min(Math.abs(myIdx - targetIdx), living.length - Math.abs(myIdx - targetIdx));
                        // Factor Mustang
                        const hasMustang = player.blueCards.some(c => c.type === 'mustang');
                        const finalDist = hasMustang ? dist + 1 : dist;
                        isTargetable = finalDist <= 1;
                      }
                    } else if (targetSelectMode.type === 'bang') {
                      // Bang requires distance <= range
                      const living = roomState.players.filter(p => !p.spectating && p.bullets > 0);
                      const myIdx = living.findIndex(p => p.id === socket.id);
                      const targetIdx = living.findIndex(p => p.id === player.id);
                      if (myIdx !== -1 && targetIdx !== -1) {
                        const dist = Math.min(Math.abs(myIdx - targetIdx), living.length - Math.abs(myIdx - targetIdx));
                        // Factor Mustang
                        const hasMustang = player.blueCards.some(c => c.type === 'mustang');
                        const finalDist = hasMustang ? dist + 1 : dist;
                        
                        // Active weapon range
                        const myPlayerDetails = roomState.players.find(p => p.id === socket.id);
                        const weapon = myPlayerDetails?.blueCards.find(c => ['schofield', 'winchester', 'volcanic'].includes(c.type));
                        let range = 1;
                        if (weapon?.type === 'schofield') range = 2;
                        else if (weapon?.type === 'winchester') range = 5;
                        else if (weapon?.type === 'volcanic') range = 1;
                        
                        isTargetable = finalDist <= range;
                      }
                    } else if (targetSelectMode.type === 'cat_balou') {
                      // Cat Balou has infinite range
                      isTargetable = true;
                    }
                  }

                  return (
                    <div 
                      key={player.id}
                      className={`player-node ${isTurn ? 'is-turn' : ''} ${player.spectating ? 'folded' : ''} ${isTargetable ? 'is-target' : ''}`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      onClick={() => isTargetable && handlePlayerNodeClick(player)}
                    >
                      {/* Target select indicator */}
                      {isTargetable && (
                        <div className="target-select-indicator" style={{ top: '-40px' }}>
                          🎯 ยิงเป้าหมายนี้
                        </div>
                      )}

                      {/* Role Badge (Sheriff is public, others are hidden/revealed) */}
                      {!player.spectating && (
                        <div className={`bang-role-badge role-${player.role}`}>
                          {player.role === 'sheriff' ? ' Sheriff ⭐' :
                           player.role === 'deputy' ? ' Deputy 🛡️' :
                           player.role === 'outlaw' ? ' Outlaw 💀' :
                           player.role === 'renegade' ? ' Renegade 🐍' : ' Hidden 🕵️'}
                        </div>
                      )}

                      {/* Avatar */}
                      <div className="player-avatar-wrapper">
                        <div className="player-avatar">
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>

                      {/* Player Info Card */}
                      <div className="player-info-card">
                        <div className="player-name">{player.name} {isMyNode && '(คุณ)'}</div>
                        <div className="player-chips" style={{ fontSize: '0.7rem' }}>
                          {player.spectating ? '☠️ ตายแล้ว / ผู้ชม' : `${player.character?.name}`}
                        </div>
                      </div>

                      {/* Bullets (Health) */}
                      {!player.spectating && (
                        <div className="bang-bullets-container">
                          {Array.from({ length: player.maxBullets }).map((_, idx) => (
                            <div 
                              key={idx} 
                              className={`bang-bullet ${idx >= player.bullets ? 'lost' : ''}`} 
                            />
                          ))}
                        </div>
                      )}

                      {/* Blue cards in play */}
                      {!player.spectating && player.blueCards && player.blueCards.length > 0 && (
                        <div className="bang-blue-equipped-row">
                          {player.blueCards.map((c, cidx) => (
                            <span key={cidx} className="bang-blue-badge">
                              {c.type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active player hand panel (Bottom) */}
            <div className="uno-hand-wrapper">
              <div className="uno-hand-scroll">
                {myPlayer && !myPlayer.spectating && myPlayer.hand && myPlayer.hand.map((c) => {
                  const isMyTurn = roomState.players[roomState.turnIndex]?.id === socket.id;
                  
                  // Card playable checks
                  let isPlayable = false;
                  
                  if (roomState.gameState === 'PLAYING' && isMyTurn) {
                    // It is my turn to play cards:
                    // Weapons or blue cards can always be played
                    const isBlue = c.color === 'blue';
                    const isVolcanic = myPlayer.blueCards.some(bc => bc.type === 'volcanic');
                    const isWilly = myPlayer.character?.name === 'Willy the Kid';
                    
                    if (isBlue) {
                      isPlayable = true;
                    } else {
                      // Brown cards
                      if (c.type === 'bang') {
                        // Can play bang if limit not reached
                        isPlayable = roomState.bangPlayedCount < 1 || isWilly || isVolcanic;
                      } else {
                        // Other cards
                        isPlayable = true;
                      }
                    }
                  } else if (roomState.gameState === 'WAITING_RESPONSE' && roomState.pendingResponse?.playerId === socket.id) {
                    // It is my turn to defend:
                    const isCalamity = myPlayer.character?.name === 'Calamity Janet';
                    if (roomState.pendingResponse.type === 'missed') {
                      isPlayable = c.type === 'missed' || (isCalamity && c.type === 'bang');
                    } else if (roomState.pendingResponse.type === 'indians') {
                      isPlayable = c.type === 'bang' || (isCalamity && c.type === 'missed');
                    }
                  }

                  // Discard checks: If my turn is ending and hand size > bullets, we are forcing discards
                  const isForcedDiscard = isMyTurn && roomState.gameState === 'PLAYING' && myPlayer.hand.length > myPlayer.bullets;

                  const handleCardClick = () => {
                    if (isForcedDiscard) {
                      socket.emit('bangDiscardLimit', { cardId: c.id });
                    } else if (roomState.gameState === 'WAITING_RESPONSE') {
                      socket.emit('bangRespond', { cardId: c.id });
                    } else if (roomState.gameState === 'PLAYING') {
                      const isBlue = c.color === 'blue';
                      if (isBlue) {
                        socket.emit('bangPlayBlue', { cardId: c.id });
                      } else {
                        // Brown cards
                        const needsTarget = ['bang', 'panic', 'cat_balou'].includes(c.type);
                        if (needsTarget) {
                          setTargetSelectMode({ type: c.type, cardId: c.id });
                        } else {
                          socket.emit('bangPlayBrown', { cardId: c.id });
                        }
                      }
                    }
                  };

                  return (
                    <BangCard 
                      key={c.id} 
                      color={c.color} 
                      type={c.type} 
                      onClick={handleCardClick}
                      isSelectable={isPlayable || isForcedDiscard}
                    />
                  );
                })}
              </div>
            </div>

            {/* Bottom action panel controls */}
            <div className="action-panel-container">
              <div className="action-bar glass" style={{ minHeight: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {targetSelectMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      🎯 เลือกผู้เล่นเป้าหมายสำหรับความสามารถ {targetSelectMode.type.toUpperCase()}
                    </span>
                    <button className="btn-secondary" onClick={() => setTargetSelectMode(null)} style={{ padding: '6px 12px', width: 'auto', fontSize: '0.8rem', cursor: 'pointer' }}>
                      ยกเลิก (Cancel)
                    </button>
                  </div>
                ) : (
                  <>
                    {roomState.players[roomState.turnIndex]?.id === socket.id && roomState.gameState === 'PLAYING' && (
                      <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        {myPlayer && myPlayer.hand.length > myPlayer.bullets ? (
                          <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                            ⚠️ คุณต้องทิ้งการ์ดให้เหลือ {myPlayer.bullets} ใบ (คลิกการ์ดในมือเพื่อเลือกทิ้ง)
                          </span>
                        ) : (
                          <button 
                            className="btn-primary" 
                            onClick={() => socket.emit('bangEndTurn')}
                            style={{ width: 'auto', padding: '10px 24px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            🔔 จบเทิร์น (End Turn)
                          </button>
                        )}
                      </div>
                    )}
                    {roomState.players[roomState.turnIndex]?.id !== socket.id && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {myPlayer?.spectating ? 'คุณตกรอบแล้ว นั่งชมเกมคาวบอยอยู่...' : 'กรุณารอเทิร์นของคุณ...'}
                      </span>
                    )}
                  </>
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
