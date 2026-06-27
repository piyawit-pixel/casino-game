const INVESTORS = ['A', 'B', 'C', 'D', 'E', 'F'];

// 10 Deal spots around the board
const DEALS_BOARD = [
  { id: 1, name: 'ดีลโรงภาพยนตร์', needs: ['A', 'B', 'C'], shares: 3 },
  { id: 2, name: 'ดีลโรงแรมสี่ดาว', needs: ['B', 'D', 'F'], shares: 4 },
  { id: 3, name: 'ดีลท่าเรือขนส่ง', needs: ['A', 'C', 'D', 'E'], shares: 5 },
  { id: 4, name: 'ดีลโรงกลั่นน้ำมัน', needs: ['B', 'C', 'E', 'F'], shares: 6 },
  { id: 5, name: 'ดีลสายการบินหรู', needs: ['A', 'B', 'D', 'E', 'F'], shares: 7 },
  { id: 6, name: 'ดีลศูนย์การค้า', needs: ['A', 'C', 'F'], shares: 5 },
  { id: 7, name: 'ดีลตึกระฟ้าใจกลางกรุง', needs: ['B', 'C', 'D', 'F'], shares: 6 },
  { id: 8, name: 'ดีลคาสิโนริเวียร่า', needs: ['A', 'D', 'E', 'F'], shares: 7 },
  { id: 9, name: 'ดีลนิคมอุตสาหกรรม', needs: ['A', 'B', 'C', 'D', 'E'], shares: 8 },
  { id: 10, name: 'ดีลรถไฟความเร็วสูง', needs: ['A', 'B', 'C', 'D', 'E', 'F'], shares: 10 }
];

function generateBossDeck() {
  const deck = [];
  let id = 1;

  // 6 Kinsman cards for each letter A-F (36 total)
  INVESTORS.forEach(letter => {
    for (let i = 0; i < 6; i++) {
      deck.push({ id: id++, type: 'kinsman', value: letter });
    }
  });

  // 3 Travel cards for each letter A-F (18 total)
  INVESTORS.forEach(letter => {
    for (let i = 0; i < 3; i++) {
      deck.push({ id: id++, type: 'travel', value: letter });
    }
  });

  // 10 Stop cards
  for (let i = 0; i < 10; i++) {
    deck.push({ id: id++, type: 'stop' });
  }

  // 10 Boss cards
  for (let i = 0; i < 10; i++) {
    deck.push({ id: id++, type: 'boss_card' });
  }

  return deck;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[j], arr[i]] = [arr[i], arr[j]];
  }
  return arr;
}

export class BossRoom {
  constructor(id) {
    this.id = id;
    this.gameType = 'boss';
    this.players = []; // { id, name, money, permanentInvestors: [], hand: [], spectating, isOnline, isHost }
    this.gameState = 'WAITING'; // WAITING, PLAYING, INTERRUPTED, GAME_OVER
    
    // Board positions
    this.boardIndex = 0; // Current deal spot on DEALS_BOARD
    this.turnIndex = 0; // Active turn player index
    this.bossPlayerId = null; // Current Boss of the negotiation (can change via I'm the Boss card)
    
    // Cards & Deck
    this.deck = [];
    this.discardPile = [];

    // Current negotiation details
    this.proposedShares = {}; // playerId -> shares count
    this.activeKinsmen = []; // ['A', 'B'] - Kinsman cards played for current deal
    this.activeTravels = []; // ['C'] - Investors sent on travel for current deal

    // Chain Reaction Interruption state
    this.pendingAction = null;
    /*
      {
        timerSeconds: number,
        initiatorId: string,
        card: object, // The card that caused the interruption
        cardChain: object[], // Array of cards in the current Stop-Chain
      }
    */

    this.messages = [];
    this.lastEvent = null;
  }

  addMessage(sender, text) {
    this.messages.push({
      sender,
      text,
      timestamp: Date.now()
    });
    if (this.messages.length > 50) this.messages.shift();
  }

  addPlayer(id, name) {
    const existing = this.players.find(p => p.id === id || (p.name.toLowerCase() === name.toLowerCase() && !p.isOnline));
    
    if (existing) {
      existing.id = id;
      existing.isOnline = true;
      this.addMessage('System', `${existing.name} has reconnected.`);
      return existing;
    }

    const isHost = this.players.length === 0;
    const spectating = this.gameState !== 'WAITING';
    const newPlayer = {
      id,
      name,
      money: 0,
      permanentInvestors: [],
      hand: [],
      spectating,
      isOnline: true,
      isHost
    };

    this.players.push(newPlayer);
    this.addMessage('System', `${name} joined.`);
    return newPlayer;
  }

  removePlayer(id) {
    const idx = this.players.findIndex(p => p.id === id);
    if (idx !== -1) {
      const p = this.players[idx];
      p.isOnline = false;
      this.addMessage('System', `${p.name} disconnected.`);
      
      if (this.gameState === 'WAITING') {
        this.players.splice(idx, 1);
        if (p.isHost && this.players.length > 0) {
          this.players[0].isHost = true;
        }
      }
    }
  }

  startGame() {
    const active = this.players.filter(p => p.isOnline);
    if (active.length < 3) {
      throw new Error('Need at least 3 players to start "I\'m the Boss!".');
    }

    this.gameState = 'PLAYING';
    this.boardIndex = 0;
    this.turnIndex = 0;
    this.bossPlayerId = active[0].id;
    this.pendingAction = null;
    this.activeKinsmen = [];
    this.activeTravels = [];
    this.proposedShares = {};

    // 1. Distribute permanent investors based on player count
    // 3 Players: 2 permanent investors each
    // 4 Players: 1 permanent investor each, 2 on table
    // 5 Players: 1 permanent investor each, 1 on table
    // 6 Players: 1 permanent investor each
    const shuffledInvestors = shuffle(INVESTORS);
    this.players.forEach(p => {
      p.spectating = !p.isOnline;
      p.money = 0;
      p.permanentInvestors = [];
      p.hand = [];
    });

    const activePlayers = this.players.filter(p => !p.spectating);
    const count = activePlayers.length;
    const investorsPerPlayer = count === 3 ? 2 : 1;

    activePlayers.forEach(p => {
      for (let i = 0; i < investorsPerPlayer; i++) {
        p.permanentInvestors.push(shuffledInvestors.pop());
      }
    });

    // 2. Generate and deal 5 cards to each player
    this.deck = shuffle(generateBossDeck());
    this.discardPile = [];

    activePlayers.forEach(p => {
      for (let i = 0; i < 5; i++) {
        p.hand.push(this.drawCardFromDeck());
      }
    });

    this.lastEvent = 'เริ่มเกม! ข้อเสนอดีลแรกเริ่มเจรจา';
    this.addMessage('System', this.lastEvent);
    this.startNegotiation();
  }

  startNegotiation() {
    const currentDeal = DEALS_BOARD[this.boardIndex];
    this.bossPlayerId = this.players[this.turnIndex].id;
    this.activeKinsmen = [];
    this.activeTravels = [];
    this.pendingAction = null;
    
    // Clear proposed shares
    this.proposedShares = {};
    this.players.forEach(p => {
      if (!p.spectating) this.proposedShares[p.id] = 0;
    });
    // Boss takes everything by default initially
    this.proposedShares[this.bossPlayerId] = currentDeal.shares;

    this.lastEvent = `ดีลใหม่: ${currentDeal.name} (ต้องการหุ้นส่วน: ${currentDeal.needs.join(', ')} | มูลค่า: ${currentDeal.shares} หุ้น)`;
    this.addMessage('System', this.lastEvent);
  }

  // Submit a negotiation offer
  submitSharesProposal(bossId, sharesMap) {
    if (this.bossPlayerId !== bossId || this.gameState !== 'PLAYING') {
      throw new Error("You are not the Boss of this negotiation.");
    }

    const currentDeal = DEALS_BOARD[this.boardIndex];
    let totalProposed = 0;
    Object.values(sharesMap).forEach(val => totalProposed += Number(val));

    if (totalProposed !== currentDeal.shares) {
      throw new Error(`Total proposed shares must equal ${currentDeal.shares}.`);
    }

    this.proposedShares = sharesMap;
    this.addMessage('System', `บอสเสนอสัดส่วนแบ่งหุ้น: ${this.players.map(p => p.spectating ? '' : `${p.name}: ${this.proposedShares[p.id] || 0}`).filter(Boolean).join(', ')}`);
  }

  // Play card
  playBossCard(playerId, cardId, targetLetter = null) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.spectating || this.gameState === 'GAME_OVER') {
      throw new Error("You are not playing.");
    }

    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) throw new Error("Card not found in hand.");
    const card = player.hand[cardIdx];

    // Card plays
    if (card.type === 'kinsman') {
      // Plays kinsman for A-F immediately (no reactions needed)
      if (this.gameState !== 'PLAYING') throw new Error("Cannot play kinsman now.");
      player.hand.splice(cardIdx, 1);
      this.discardPile.push(card);
      
      this.activeKinsmen.push(card.value);
      this.lastEvent = `${player.name} ส่งการ์ดลูกหลานตระกูล ${card.value} เข้าดีล`;
      this.addMessage('System', this.lastEvent);

    } else if (card.type === 'travel') {
      // Travel requires reaction time
      if (this.gameState !== 'PLAYING') throw new Error("Cannot play travel now.");
      if (!targetLetter) throw new Error("Specify which investor to send on travel.");

      player.hand.splice(cardIdx, 1);
      
      this.gameState = 'INTERRUPTED';
      this.pendingAction = {
        timerSeconds: 10,
        initiatorId: playerId,
        card: card,
        targetLetter: targetLetter,
        cardChain: [card]
      };
      
      this.lastEvent = `${player.name} เล่นการ์ดส่งตระกูล ${targetLetter} ไปเที่ยวพักร้อน!`;
      this.addMessage('System', this.lastEvent);

    } else if (card.type === 'boss_card') {
      // Steal boss role
      if (this.gameState !== 'PLAYING') throw new Error("Cannot steal boss role now.");
      if (this.bossPlayerId === playerId) throw new Error("You are already the Boss.");

      player.hand.splice(cardIdx, 1);
      
      this.gameState = 'INTERRUPTED';
      this.pendingAction = {
        timerSeconds: 10,
        initiatorId: playerId,
        card: card,
        cardChain: [card]
      };

      this.lastEvent = `${player.name} โยนการ์ด "อย่าซ่ากับบอส" เพื่อชิงเก้าอี้เจรจา!`;
      this.addMessage('System', this.lastEvent);

    } else if (card.type === 'stop') {
      // Counter react to the pending action chain
      if (this.gameState !== 'INTERRUPTED' || !this.pendingAction) {
        throw new Error("No card in play to stop.");
      }

      player.hand.splice(cardIdx, 1);
      
      // Push stop card to the active chain
      this.pendingAction.cardChain.push(card);
      this.pendingAction.timerSeconds = 10; // Reset countdown
      
      this.lastEvent = `🛑 ${player.name} โยนการ์ด STOP ขัดขวางการกระทำล่าสุด!`;
      this.addMessage('System', this.lastEvent);
    }
  }

  // Ticks countdown for reactions
  tickTimer() {
    if (this.gameState !== 'INTERRUPTED' || !this.pendingAction) return;

    this.pendingAction.timerSeconds--;
    if (this.pendingAction.timerSeconds <= 0) {
      this.resolveInterruptionChain();
    }
  }

  resolveInterruptionChain() {
    const chain = this.pendingAction.cardChain;
    
    // Stop resolution:
    // If cardChain has odd length (e.g. 1 card: travel / boss), it triggers.
    // If cardChain has even length (e.g. 1 card + 1 stop, or 1 card + 3 stops), it is cancelled!
    const success = (chain.length % 2) !== 0;

    const baseCard = chain[0];
    const initiator = this.players.find(p => p.id === this.pendingAction.initiatorId);

    if (success) {
      // Action succeeds!
      if (baseCard.type === 'travel') {
        const letter = this.pendingAction.targetLetter;
        this.activeTravels.push(letter);
        this.addMessage('System', `✈️ การส่งตระกูล ${letter} ไปเที่ยว สำเร็จแล้ว!`);
      } else if (baseCard.type === 'boss_card') {
        this.bossPlayerId = initiator.id;
        // Re-proposed shares: Boss takes everything by default
        const currentDeal = DEALS_BOARD[this.boardIndex];
        this.proposedShares = {};
        this.players.forEach(p => {
          if (!p.spectating) this.proposedShares[p.id] = 0;
        });
        this.proposedShares[this.bossPlayerId] = currentDeal.shares;
        
        this.addMessage('System', `👑 ${initiator.name} ขึ้นเป็นบอสโต๊ะเจรจาสำเร็จ!`);
      }
    } else {
      // Action failed/stopped
      this.addMessage('System', `🛡️ ขัดขวางสำเร็จ! การเล่นการ์ด ${baseCard.type.toUpperCase()} ของ ${initiator.name} ถูกยกเลิก`);
    }

    // Dump all cards in the chain to discard pile
    chain.forEach(c => this.discardPile.push(c));

    this.gameState = 'PLAYING';
    this.pendingAction = null;
  }

  // Agree and close deal (requires all needed investors to be present)
  closeDeal(bossId) {
    if (this.bossPlayerId !== bossId || this.gameState !== 'PLAYING') {
      throw new Error("You are not the Boss of this negotiation.");
    }

    const currentDeal = DEALS_BOARD[this.boardIndex];
    const needs = currentDeal.needs;

    // Check which investors are participating:
    // Any investor letter is active if:
    // 1. A participant player in the deal (shares > 0) owns that investor permanently.
    // OR 2. It has been played as Kinsman (activeKinsmen).
    // AND 3. It is NOT blocked on travel (activeTravels).
    const blocked = this.activeTravels;
    
    // Find investors owned by players getting > 0 shares
    const participatingInvestors = [];
    this.players.forEach(p => {
      if (!p.spectating && (this.proposedShares[p.id] || 0) > 0) {
        participatingInvestors.push(...p.permanentInvestors);
      }
    });

    const activeAvailable = [...participatingInvestors, ...this.activeKinsmen].filter(letter => !blocked.includes(letter));

    // Check if all needed investors are present
    const missing = needs.filter(letter => !activeAvailable.includes(letter));
    if (missing.length > 0) {
      throw new Error(`Missing required investors for deal: ${missing.join(', ')} (หรือพวกเขาไม่ได้แบ่งหุ้นส่วนปันเงิน)`);
    }

    // Trigger deal success!
    // Shares value calculation:
    // Deals 1-5 = $1M per share
    // Deals 6-10 = $2M per share
    const multiplier = this.boardIndex < 5 ? 1000000 : 2000000;
    
    this.players.forEach(p => {
      if (!p.spectating) {
        const shares = this.proposedShares[p.id] || 0;
        p.money += shares * multiplier;
      }
    });

    this.lastEvent = `🎉 ดีลสำเร็จ! โอนเงินให้ผู้ร่วมทุนเสร็จสิ้น มูลค่ารวม $${currentDeal.shares * multiplier / 1000000}M`;
    this.addMessage('System', this.lastEvent);

    this.advanceBoardTurn();
  }

  // Cancel deal (no deal reached, move to next)
  cancelDeal(bossId) {
    if (this.bossPlayerId !== bossId || this.gameState !== 'PLAYING') {
      throw new Error("You are not the Boss.");
    }

    this.lastEvent = `❌ ดีลล่ม! บอสยกเลิกการเจรจา`;
    this.addMessage('System', this.lastEvent);
    this.advanceBoardTurn();
  }

  advanceBoardTurn() {
    // Each player draws 3 cards at end of negotiation
    const active = this.players.filter(p => !p.spectating);
    active.forEach(p => {
      p.hand.push(this.drawCardFromDeck());
      p.hand.push(this.drawCardFromDeck());
      p.hand.push(this.drawCardFromDeck());
    });

    this.boardIndex++;
    if (this.boardIndex >= DEALS_BOARD.length) {
      // Game Over after 10 deals
      this.gameState = 'GAME_OVER';
      let highestMoney = -1;
      let winnerPlayer = null;
      
      this.players.forEach(p => {
        if (!p.spectating && p.money > highestMoney) {
          highestMoney = p.money;
          winnerPlayer = p;
        }
      });

      this.lastEvent = `🏆 จบการต่อสู้เจรจา! ผู้ชนะคือ ${winnerPlayer?.name} มีเงินทั้งหมด $${highestMoney / 1000000}M`;
      this.addMessage('System', this.lastEvent);
    } else {
      // Move turnIndex to next living player
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
      while (this.players[this.turnIndex].spectating) {
        this.turnIndex = (this.turnIndex + 1) % this.players.length;
      }

      this.startNegotiation();
    }
  }

  drawCardFromDeck() {
    if (this.deck.length === 0) {
      if (this.discardPile.length > 0) {
        this.deck = shuffle([...this.discardPile]);
        this.discardPile = [];
        this.addMessage('System', '🔄 กองจั่วหมด ทำการสับไพ่ใหม่เข้ากอง.');
      } else {
        this.deck = shuffle(generateBossDeck());
      }
    }
    return this.deck.pop();
  }

  getClientState(playerId) {
    const currentDeal = DEALS_BOARD[this.boardIndex] || null;

    return {
      id: this.id,
      gameType: this.gameType,
      gameState: this.gameState,
      boardIndex: this.boardIndex,
      turnIndex: this.turnIndex,
      bossPlayerId: this.bossPlayerId,
      currentDeal,
      messages: this.messages,
      lastEvent: this.lastEvent,
      activeKinsmen: this.activeKinsmen,
      activeTravels: this.activeTravels,
      proposedShares: this.proposedShares,
      pendingAction: this.pendingAction ? {
        timerSeconds: this.pendingAction.timerSeconds,
        initiatorName: this.players.find(p => p.id === this.pendingAction.initiatorId)?.name,
        cardType: this.pendingAction.card.type,
        cardValue: this.pendingAction.card.value,
        targetLetter: this.pendingAction.targetLetter,
        chainLength: this.pendingAction.cardChain.length
      } : null,
      players: this.players.map(p => {
        const isSelf = p.id === playerId;
        return {
          id: p.id,
          name: p.name,
          money: p.money,
          permanentInvestors: p.permanentInvestors,
          spectating: p.spectating,
          isOnline: p.isOnline,
          isHost: p.isHost,
          cardCount: p.hand.length,
          // Only show cards to owner
          hand: isSelf ? p.hand : Array(p.hand.length).fill({ type: 'hidden' })
        };
      })
    };
  }
}
