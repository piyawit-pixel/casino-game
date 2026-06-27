function generateUnoDeck() {
  const colors = ['red', 'green', 'blue', 'yellow'];
  const deck = [];
  let id = 1;

  for (const color of colors) {
    // Numbers 1-9 (2 of each)
    for (let num = 1; num <= 9; num++) {
      deck.push({ id: id++, color, type: String(num) });
      deck.push({ id: id++, color, type: String(num) });
    }
    // Action cards (2 of each)
    for (const type of ['skip', 'reverse', 'discard_all', '+2', '+6']) {
      deck.push({ id: id++, color, type });
      deck.push({ id: id++, color, type });
    }
  }

  // Wild cards (4 of each)
  for (let i = 0; i < 4; i++) {
    deck.push({ id: id++, color: 'wild', type: 'wild' });
    deck.push({ id: id++, color: 'wild', type: 'wild_draw_10' });
    deck.push({ id: id++, color: 'wild', type: 'wild_swap' });
    deck.push({ id: id++, color: 'wild', type: 'wild_skip_all' });
    deck.push({ id: id++, color: 'wild', type: 'wild_draw_4_reverse' });
  }

  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export class UnoRoom {
  constructor(id) {
    this.id = id;
    this.gameType = 'uno';
    this.players = []; // { id, name, cards: [], spectating: false, isOnline: true, isHost: false }
    this.gameState = 'WAITING'; // WAITING, PLAYING, COLOR_SELECT, GAME_OVER
    this.deck = [];
    this.discardPile = [];
    this.currentCard = null;
    this.currentColor = null;
    this.currentType = null;
    this.direction = 1; // 1 = Clockwise, -1 = Counter-Clockwise
    this.turnIndex = 0;
    this.drawPenalty = 0; // Cumulative draw penalty (+2, +6, +10, etc.)
    this.winner = null;
    this.messages = [];
    
    // Temp storage for pending Wild play
    this.pendingWildCard = null;
    this.lastEvent = null;
    this.recentlyDrawnCard = null; // Stored to allow play-on-draw choice
  }

  addMessage(sender, text) {
    this.messages.push({
      sender,
      text,
      timestamp: Date.now()
    });
    if (this.messages.length > 50) {
      this.messages.shift();
    }
  }

  addPlayer(id, name) {
    const existingPlayer = this.players.find(p => p.id === id || (p.name.toLowerCase() === name.toLowerCase() && !p.isOnline));
    
    if (existingPlayer) {
      existingPlayer.id = id;
      existingPlayer.isOnline = true;
      this.addMessage('System', `${existingPlayer.name} has reconnected.`);
      return existingPlayer;
    }

    const isHost = this.players.length === 0;
    const isSpectating = this.gameState !== 'WAITING';
    const newPlayer = {
      id,
      name,
      cards: [],
      spectating: isSpectating,
      isOnline: true,
      isHost
    };

    this.players.push(newPlayer);
    this.addMessage('System', `${name} joined.`);
    return newPlayer;
  }

  removePlayer(id) {
    const playerIndex = this.players.findIndex(p => p.id === id);
    if (playerIndex !== -1) {
      const player = this.players[playerIndex];
      player.isOnline = false;
      this.addMessage('System', `${player.name} disconnected.`);

      if (this.gameState === 'WAITING') {
        this.players.splice(playerIndex, 1);
        if (player.isHost && this.players.length > 0) {
          this.players[0].isHost = true;
        }
      } else {
        // If in-game, clear their hand and mark them as spectator
        player.cards = [];
        player.spectating = true;
        this.addMessage('System', `${player.name} is now spectating.`);
        
        // If it was their turn, move to next
        if (this.players[this.turnIndex].id === id) {
          this.moveToNextTurn();
        }
        this.checkWinCondition();
      }
    }
  }

  startGame() {
    const active = this.players.filter(p => p.isOnline);
    if (active.length < 2) {
      throw new Error('Need at least 2 players to start UNO.');
    }

    this.players.forEach(p => {
      p.spectating = !p.isOnline;
      p.cards = [];
    });

    this.deck = shuffle(generateUnoDeck());
    this.discardPile = [];
    this.direction = 1;
    this.drawPenalty = 0;
    this.winner = null;
    this.lastEvent = null;
    this.pendingWildCard = null;
    this.recentlyDrawnCard = null;

    // Deal 7 cards to each active player
    const playersToPlay = this.players.filter(p => !p.spectating);
    for (let i = 0; i < 7; i++) {
      playersToPlay.forEach(p => {
        p.cards.push(this.deck.pop());
      });
    }

    // Draw first card (must not be a wild card to keep start clean, if it is, reshuffle)
    let firstCard = this.deck.pop();
    while (firstCard.color === 'wild') {
      this.deck.unshift(firstCard);
      this.deck = shuffle(this.deck);
      firstCard = this.deck.pop();
    }

    this.currentCard = firstCard;
    this.currentColor = firstCard.color;
    this.currentType = firstCard.type;
    this.discardPile.push(firstCard);

    this.gameState = 'PLAYING';
    const active = this.players.filter(p => !p.spectating);
    if (active.length > 0) {
      const starter = active[Math.floor(Math.random() * active.length)];
      this.turnIndex = this.players.findIndex(p => p.id === starter.id);
    } else {
      this.turnIndex = 0;
    }
    this.addMessage('System', `UNO Show 'Em No Mercy started! First card is ${firstCard.color} ${firstCard.type}.`);
  }

  drawCard(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.players[this.turnIndex].id !== playerId || this.gameState !== 'PLAYING') {
      throw new Error("It's not your turn.");
    }

    // If there is a draw penalty, player MUST resolve the penalty by drawing all of them
    if (this.drawPenalty > 0) {
      this.resolveDrawPenalty(playerId);
      return;
    }

    // Normal single draw
    const drawn = this.drawFromDeck();
    player.cards.push(drawn);
    this.lastEvent = `${player.name} จั่วการ์ด 1 ใบ`;
    this.addMessage('System', this.lastEvent);

    // Apply Mercy check
    if (player.cards.length >= 25) {
      this.eliminatePlayer(player);
      return;
    }

    // Check if drawn card can be played immediately
    const isPlayable = drawn.color === 'wild' || drawn.color === this.currentColor || drawn.type === this.currentType;
    if (isPlayable) {
      this.recentlyDrawnCard = drawn;
    } else {
      this.recentlyDrawnCard = null;
      this.moveToNextTurn();
    }
  }

  // Draw penalty resolution
  resolveDrawPenalty(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.players[this.turnIndex].id !== playerId) return;

    const cardsToDraw = this.drawPenalty;
    this.lastEvent = `${player.name} โดนจั่วโทษสะสม +${cardsToDraw} ใบ!`;
    this.addMessage('System', this.lastEvent);

    for (let i = 0; i < cardsToDraw; i++) {
      player.cards.push(this.drawFromDeck());
    }

    this.drawPenalty = 0;
    this.recentlyDrawnCard = null;

    // Apply Mercy rule check
    if (player.cards.length >= 25) {
      this.eliminatePlayer(player);
      return;
    }

    this.moveToNextTurn();
  }

  // Keep the drawn card and pass turn
  keepDrawnCard(playerId) {
    if (this.players[this.turnIndex].id !== playerId) return;
    this.recentlyDrawnCard = null;
    this.moveToNextTurn();
  }

  playCard(playerId, cardId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.players[this.turnIndex].id !== playerId || this.gameState !== 'PLAYING') {
      throw new Error("It's not your turn.");
    }

    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) throw new Error("Card not found in hand.");
    const card = player.cards[cardIndex];

    // Stacking verification: If there is an active draw penalty, you can only play a draw card
    if (this.drawPenalty > 0) {
      const isDrawCard = card.type === '+2' || card.type === '+6' || card.type === 'wild_draw_10' || card.type === 'wild_draw_4_reverse';
      if (!isDrawCard) {
        throw new Error("You must play a Draw card to stack, or click to Draw cards!");
      }

      // Check stacking hierarchy: Can only play a card of equal or greater value
      const activePenaltyCardType = this.currentCard.type;
      const getVal = (t) => {
        if (t === '+2') return 2;
        if (t === 'wild_draw_4_reverse') return 4;
        if (t === '+6') return 6;
        if (t === 'wild_draw_10') return 10;
        return 0;
      };

      if (getVal(card.type) < getVal(activePenaltyCardType)) {
        throw new Error(`You must play a draw card of equal or greater penalty than +${getVal(activePenaltyCardType)}!`);
      }
    } else {
      // Normal match verification
      const isColorMatch = card.color === 'wild' || card.color === this.currentColor;
      const isTypeMatch = card.type === this.currentType;

      if (!isColorMatch && !isTypeMatch) {
        throw new Error("Card does not match current color or type!");
      }
    }

    // Play card
    player.cards.splice(cardIndex, 1);
    this.recentlyDrawnCard = null;

    // Discard Pile handling
    this.currentCard = card;
    this.currentType = card.type;
    this.discardPile.push(card);

    // Event log
    const cardText = card.color === 'wild' ? card.type : `${card.color} ${card.type}`;
    this.lastEvent = `${player.name} โยนการ์ด: ${cardText}`;
    this.addMessage('System', this.lastEvent);

    // Apply special card functions
    if (card.color === 'wild') {
      this.pendingWildCard = card;
      this.gameState = 'COLOR_SELECT';
    } else {
      this.currentColor = card.color;
      this.resolveActionCard(card);
    }
  }

  // Resolve color selection for Wild cards
  selectColor(playerId, color) {
    if (this.gameState !== 'COLOR_SELECT' || this.players[this.turnIndex].id !== playerId) {
      throw new Error('Not your turn to select color.');
    }

    const validColors = ['red', 'green', 'blue', 'yellow'];
    if (!validColors.includes(color)) throw new Error('Invalid color.');

    const player = this.players.find(p => p.id === playerId);
    this.currentColor = color;
    this.gameState = 'PLAYING';

    this.lastEvent = `${player.name} เลือกเปลี่ยนสีเป็น: ${color.toUpperCase()}`;
    this.addMessage('System', this.lastEvent);

    const card = this.pendingWildCard;
    this.pendingWildCard = null;

    this.resolveActionCard(card);
  }

  resolveActionCard(card) {
    const activePlayer = this.players[this.turnIndex];

    switch (card.type) {
      case 'skip':
        // Skip next player
        this.addMessage('System', 'ผู้เล่นคนถัดไปถูกข้าม!');
        this.moveToNextTurn(2);
        break;
      case 'reverse':
        // Reverse play direction
        this.direction *= -1;
        this.addMessage('System', `สลับทิศการเล่น! (${this.direction === 1 ? 'ตามเข็มนาฬิกา' : 'ทวนเข็มนาฬิกา'})`);
        this.moveToNextTurn();
        break;
      case 'discard_all':
        // Discard all cards of matching color
        const matchColor = this.currentColor;
        const toDiscard = activePlayer.cards.filter(c => c.color === matchColor);
        
        toDiscard.forEach(c => {
          const idx = activePlayer.cards.findIndex(cardInHand => cardInHand.id === c.id);
          if (idx !== -1) {
            activePlayer.cards.splice(idx, 1);
            this.discardPile.push(c);
          }
        });
        this.addMessage('System', `${activePlayer.name} ทิ้งการ์ดสี ${matchColor} ทั้งหมดจำนวน ${toDiscard.length} ใบ!`);
        
        this.checkWinCondition();
        this.moveToNextTurn();
        break;
      case '+2':
        this.drawPenalty += 2;
        this.moveToNextTurn();
        break;
      case '+6':
        this.drawPenalty += 6;
        this.moveToNextTurn();
        break;
      case 'wild_draw_10':
        this.drawPenalty += 10;
        this.moveToNextTurn();
        break;
      case 'wild_skip_all':
        // Skip everyone: Active player takes another turn immediately
        this.addMessage('System', `💥 ${activePlayer.name} ข้ามทุกคน ได้เล่นอีกรอบ!`);
        // Do not advance turn index, just clear events
        this.checkWinCondition();
        break;
      case 'wild_swap':
        // Swap hands with next player in current direction
        this.swapHands();
        this.moveToNextTurn();
        break;
      case 'wild_draw_4_reverse':
        // Reverse direction AND apply +4 draw penalty to the next player (which was the previous player)
        this.direction *= -1;
        this.drawPenalty += 4;
        this.addMessage('System', `🔄 ย้อนศรและวางโทษ +4 ให้คนถัดไป!`);
        this.moveToNextTurn();
        break;
      default:
        // Number cards
        this.checkWinCondition();
        this.moveToNextTurn();
        break;
    }
  }

  // Swap hands of all players in current play direction
  swapHands() {
    this.addMessage('System', '🌀 การ์ดสลับมือ! ทุกคนต้องส่งการ์ดในมือต่อกัน!');
    const activePlayers = this.players.filter(p => !p.spectating);
    if (activePlayers.length < 2) return;

    // Create array of hands in play order
    const hands = activePlayers.map(p => [...p.cards]);

    if (this.direction === 1) {
      // Clockwise swap (A passes to B, B to C, Z to A)
      for (let i = 0; i < activePlayers.length; i++) {
        const fromIdx = (i - 1 + activePlayers.length) % activePlayers.length;
        activePlayers[i].cards = hands[fromIdx];
      }
    } else {
      // Counter-clockwise swap
      for (let i = 0; i < activePlayers.length; i++) {
        const fromIdx = (i + 1) % activePlayers.length;
        activePlayers[i].cards = hands[fromIdx];
      }
    }

    // Run Mercy rule check for all players after swapping
    activePlayers.forEach(p => {
      if (p.cards.length >= 25) {
        this.eliminatePlayer(p);
      }
    });
  }

  eliminatePlayer(player) {
    this.addMessage('System', `☠️ ${player.name} ตกรอบเนื่องจากการ์ดในมือมีเกิน 25 ใบ! (No Mercy)`);
    
    // Put their cards back into discard pile
    this.discardPile.push(...player.cards);
    player.cards = [];
    player.spectating = true;

    this.checkWinCondition();

    // If it was their turn, move to next
    if (this.players[this.turnIndex].id === player.id) {
      this.moveToNextTurn();
    }
  }

  moveToNextTurn(steps = 1) {
    const activePlayers = this.players.filter(p => !p.spectating);
    if (activePlayers.length <= 1) {
      this.checkWinCondition();
      return;
    }

    for (let i = 0; i < steps; i++) {
      do {
        this.turnIndex = (this.turnIndex + this.direction + this.players.length) % this.players.length;
      } while (this.players[this.turnIndex].spectating);
    }
  }

  checkWinCondition() {
    const livePlayers = this.players.filter(p => !p.spectating);
    
    // Win by playing all cards
    const winnerByEmptyHand = livePlayers.find(p => p.cards.length === 0);
    if (winnerByEmptyHand) {
      this.declareWinner(winnerByEmptyHand);
      return true;
    }

    // Win by last man standing
    if (livePlayers.length === 1) {
      this.declareWinner(livePlayers[0]);
      return true;
    }

    if (livePlayers.length === 0) {
      this.gameState = 'GAME_OVER';
      this.addMessage('System', 'ทุกคนตกรอบพร้อมกัน! ไม่มีผู้ชนะ.');
      return true;
    }

    return false;
  }

  declareWinner(player) {
    this.winner = player;
    this.gameState = 'GAME_OVER';
    this.addMessage('System', `🏆 ${player.name} ชนะการแข่งขัน UNO Show 'Em No Mercy!`);
  }

  drawFromDeck() {
    if (this.deck.length === 0) {
      // Reshuffle discard pile except the currentCard
      if (this.discardPile.length > 1) {
        const top = this.discardPile.pop();
        this.deck = shuffle([...this.discardPile]);
        this.discardPile = [top];
        this.addMessage('System', '🔄 การ์ดกองจั่วหมด ทำการสับการ์ดกองทิ้งมาจั่วใหม่.');
      } else {
        // Safe check: generate fresh deck if discard pile is empty
        this.deck = shuffle(generateUnoDeck());
        this.addMessage('System', '🔄 โหลดการ์ดสำรับใหม่เข้าระบบ.');
      }
    }
    return this.deck.pop();
  }

  getClientState(playerId) {
    return {
      id: this.id,
      gameType: this.gameType,
      gameState: this.gameState,
      turnIndex: this.turnIndex,
      winner: this.winner ? { id: this.winner.id, name: this.winner.name } : null,
      messages: this.messages,
      currentColor: this.currentColor,
      currentType: this.currentType,
      currentCard: this.currentCard,
      direction: this.direction,
      drawPenalty: this.drawPenalty,
      lastEvent: this.lastEvent,
      recentlyDrawnCard: this.players[this.turnIndex]?.id === playerId ? this.recentlyDrawnCard : null,
      players: this.players.map(p => {
        return {
          id: p.id,
          name: p.name,
          spectating: p.spectating,
          isOnline: p.isOnline,
          isHost: p.isHost,
          cardCount: p.cards.length,
          // Hide actual cards from other players
          cards: p.id === playerId ? p.cards : Array(p.cards.length).fill({ color: 'hidden', type: 'hidden' })
        };
      })
    };
  }
}
