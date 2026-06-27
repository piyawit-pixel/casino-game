const ROLES = ['duke', 'assassin', 'captain', 'ambassador', 'contessa'];

function createDeck() {
  const deck = [];
  // 3 cards of each role
  for (const role of ROLES) {
    deck.push(role);
    deck.push(role);
    deck.push(role);
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

export class CoupRoom {
  constructor(id) {
    this.id = id;
    this.gameType = 'coup';
    this.players = []; // { id, name, coins: 2, cards: [{role, dead}], spectating: false, isOnline: true, isHost: false }
    this.gameState = 'WAITING'; // WAITING, PLAYING, ACTION_PENDING, CHALLENGE_RESOLVING, BLOCK_CHALLENGE_RESOLVING, EXCHANGING, DISCARDING, GAME_OVER
    this.deck = [];
    this.turnIndex = 0;
    this.messages = [];
    
    // Action tracking
    this.activeAction = null; 
    /* 
      {
        type: 'income'|'foreign_aid'|'coup'|'tax'|'steal'|'assassinate'|'exchange',
        sourceId: string,
        targetId: string,
        claimedRole: string,
        blockedBy: string,
        blockedRole: string,
        challengerId: string,
        status: 'none'|'challenged'|'blocked'|'block_challenged'
      }
    */
    this.passes = new Set(); // Player IDs who have clicked "Pass" on the current action/block
    this.winner = null;
    this.exchangeCards = []; // Temp storage for cards drawn during Ambassador exchange
    this.pendingDiscardReason = ''; // 'coup', 'assassinate', 'lost_challenge', etc.
    this.pendingDiscardPlayerId = null; 
    this.lastEvent = null; // Description of last action for UI banner
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
      coins: 2,
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
        // If in-game, mark them as dead (discard their remaining cards)
        if (this.gameState !== 'GAME_OVER') {
          const liveCards = player.cards.filter(c => !c.dead);
          liveCards.forEach(c => { c.dead = true; });
          this.addMessage('System', `${player.name} died due to disconnection.`);
          
          const won = this.checkWinCondition();
          if (won) return;

          // If we were waiting for them to discard, bypass it
          if (this.pendingDiscardPlayerId === id) {
            this.pendingDiscardPlayerId = null;
            this.pendingDiscardReason = '';
            
            if (this.gameState === 'ACTION_PENDING') {
              this.resolveAction();
            } else {
              this.moveToNextTurn();
            }
          } else {
            // If it was their turn, move to next
            if (this.gameState === 'PLAYING' && this.players[this.turnIndex].id === id) {
              this.moveToNextTurn();
            }
          }
        }
      }
    }
  }

  startGame() {
    const active = this.players.filter(p => p.isOnline);
    if (active.length < 2) {
      throw new Error('Need at least 2 players to start Coup.');
    }

    this.players.forEach(p => {
      p.spectating = !p.isOnline;
      p.coins = 2;
      p.cards = [];
    });

    this.deck = shuffle(createDeck());

    // Deal 2 cards to each active player
    const playersToPlay = this.players.filter(p => !p.spectating);
    for (let i = 0; i < 2; i++) {
      playersToPlay.forEach(p => {
        p.cards.push({ role: this.deck.pop(), dead: false });
      });
    }

    this.gameState = 'PLAYING';
    const active = this.players.filter(p => !p.spectating);
    if (active.length > 0) {
      const starter = active[Math.floor(Math.random() * active.length)];
      this.turnIndex = this.players.findIndex(p => p.id === starter.id);
    } else {
      this.turnIndex = 0;
    }
    this.winner = null;
    this.activeAction = null;
    this.passes.clear();
    this.lastEvent = null;
    this.addMessage('System', 'Coup game started!');
  }

  // Active player declares an action
  selectAction(playerId, actionType, targetId = null) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.players[this.turnIndex].id !== playerId || this.gameState !== 'PLAYING') {
      throw new Error("It's not your turn.");
    }

    // Validation
    if (player.coins >= 10 && actionType !== 'coup') {
      throw new Error('You have 10 or more coins, you MUST perform a Coup!');
    }

    if (actionType === 'coup') {
      if (player.coins < 7) throw new Error('Coup costs 7 coins.');
      player.coins -= 7;
      this.activeAction = { type: 'coup', sourceId: playerId, targetId, status: 'none' };
      this.gameState = 'DISCARDING';
      this.pendingDiscardPlayerId = targetId;
      this.pendingDiscardReason = 'coup';
      
      const target = this.players.find(p => p.id === targetId);
      this.lastEvent = `${player.name} โค่นอำนาจ (Coup) ใส่ ${target.name}`;
      this.addMessage('System', this.lastEvent);
      return;
    }

    if (actionType === 'assassinate') {
      if (player.coins < 3) throw new Error('Assassination costs 3 coins.');
      player.coins -= 3;
    }

    // Set claimed role
    let claimedRole = null;
    if (actionType === 'tax') claimedRole = 'duke';
    else if (actionType === 'steal') claimedRole = 'captain';
    else if (actionType === 'assassinate') claimedRole = 'assassin';
    else if (actionType === 'exchange') claimedRole = 'ambassador';

    this.activeAction = {
      type: actionType,
      sourceId: playerId,
      targetId,
      claimedRole,
      status: 'none'
    };

    this.passes.clear();

    const targetName = targetId ? ` ใส่ ${this.players.find(p => p.id === targetId).name}` : '';
    this.lastEvent = `${player.name} ประกาศใช้ ${actionType}${targetName}`;
    this.addMessage('System', this.lastEvent);

    if (actionType === 'income') {
      // Income resolves instantly
      player.coins += 1;
      this.moveToNextTurn();
    } else {
      // Other actions need to wait for blocks/challenges
      this.gameState = 'ACTION_PENDING';
    }
  }

  // Other player challenges the active player's claimed role
  challengeAction(playerId) {
    if (this.gameState !== 'ACTION_PENDING' || !this.activeAction) {
      throw new Error('No action to challenge.');
    }

    const challenger = this.players.find(p => p.id === playerId);
    const activePlayer = this.players.find(p => p.id === this.activeAction.sourceId);

    this.activeAction.challengerId = playerId;
    this.activeAction.status = 'challenged';
    this.gameState = 'CHALLENGE_RESOLVING';
    
    this.lastEvent = `${challenger.name} ท้าทายตัวตนของ ${activePlayer.name}`;
    this.addMessage('System', this.lastEvent);
  }

  // Target player blocks the active action (claims a blocking role)
  blockAction(playerId, blockRole) {
    if (this.gameState !== 'ACTION_PENDING' || !this.activeAction) {
      throw new Error('No action to block.');
    }

    const blocker = this.players.find(p => p.id === playerId);
    this.activeAction.blockedBy = playerId;
    this.activeAction.blockedRole = blockRole;
    this.activeAction.status = 'blocked';
    
    // Reset passes to allow challenges on the block
    this.passes.clear();
    
    this.lastEvent = `${blocker.name} ขัดขวางการกระทำ (อ้างตัวเป็น ${blockRole})`;
    this.addMessage('System', this.lastEvent);
  }

  // Active player challenges the blocker's claimed blocking role
  challengeBlock(playerId) {
    if (this.gameState !== 'ACTION_PENDING' || !this.activeAction || this.activeAction.status !== 'blocked') {
      throw new Error('No block to challenge.');
    }

    const challenger = this.players.find(p => p.id === playerId);
    const blocker = this.players.find(p => p.id === this.activeAction.blockedBy);

    this.activeAction.challengerId = playerId;
    this.activeAction.status = 'block_challenged';
    this.gameState = 'BLOCK_CHALLENGE_RESOLVING';

    this.lastEvent = `${challenger.name} ท้าทายความจริงในการขัดขวางของ ${blocker.name}`;
    this.addMessage('System', this.lastEvent);
  }

  passAction(playerId) {
    if (this.gameState !== 'ACTION_PENDING') return;

    this.passes.add(playerId);

    const activeOnlinePlayers = this.players.filter(p => !p.spectating && p.isOnline && p.cards.some(c => !c.dead));
    // If everyone except the actor (or everyone except the blocker, if blocked) has passed
    const requiredPasses = this.activeAction.status === 'blocked'
      ? activeOnlinePlayers.length - 1 // Everyone online except blocker
      : activeOnlinePlayers.length - 1; // Everyone online except actor

    if (this.passes.size >= requiredPasses) {
      // Resolve action
      this.resolveAction();
    }
  }

  resolveAction() {
    const actor = this.players.find(p => p.id === this.activeAction.sourceId);
    
    if (this.activeAction.status === 'blocked') {
      // If block was accepted/passed, the action is blocked, turn passes
      const blocker = this.players.find(p => p.id === this.activeAction.blockedBy);
      this.addMessage('System', `การขัดขวางของ ${blocker.name} สำเร็จ การกระทำถูกยกเลิก.`);
      
      // If assassination was blocked, target doesn't die, but assassin still lost 3 coins (subtracted earlier)
      this.moveToNextTurn();
      return;
    }

    // Action succeeds
    const target = this.activeAction.targetId ? this.players.find(p => p.id === this.activeAction.targetId) : null;
    
    switch (this.activeAction.type) {
      case 'foreign_aid':
        actor.coins += 2;
        this.addMessage('System', `${actor.name} ได้รับเงินช่วยเหลือ 2 เหรียญ.`);
        this.moveToNextTurn();
        break;
      case 'tax':
        actor.coins += 3;
        this.addMessage('System', `${actor.name} ได้รับภาษี 3 เหรียญ.`);
        this.moveToNextTurn();
        break;
      case 'steal':
        const stolen = Math.min(target.coins, 2);
        target.coins -= stolen;
        actor.coins += stolen;
        this.addMessage('System', `${actor.name} ขโมยเงินจาก ${target.name} จำนวน ${stolen} เหรียญ.`);
        this.moveToNextTurn();
        break;
      case 'assassinate':
        // Target must discard a card
        this.gameState = 'DISCARDING';
        this.pendingDiscardPlayerId = target.id;
        this.pendingDiscardReason = 'assassinate';
        this.addMessage('System', `${actor.name} ทำการลอบสังหารสำเร็จ ${target.name} ต้องเลือกทิ้งไพ่.`);
        break;
      case 'exchange':
        // Ambassador exchange: Draw 2 cards, select which to keep
        this.gameState = 'EXCHANGING';
        // Draw 2 cards from deck
        this.exchangeCards = [this.deck.pop(), this.deck.pop()];
        break;
      default:
        this.moveToNextTurn();
        break;
    }
  }

  // Resolve a challenge (actor/blocker reveals card)
  revealCard(playerId, cardIdx) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.cards[cardIdx].dead) {
      throw new Error('Invalid card selection.');
    }

    const card = player.cards[cardIdx];
    
    if (this.gameState === 'CHALLENGE_RESOLVING') {
      const challenger = this.players.find(p => p.id === this.activeAction.challengerId);
      const claimedRole = this.activeAction.claimedRole;

      if (card.role === claimedRole) {
        // Player proved it! Challenger loses a card.
        this.addMessage('System', `${player.name} โชว์ไพ่ ${claimedRole} เพื่อพิสูจน์ความจริง!`);
        
        // Return revealed card to deck, shuffle, and draw new card
        this.deck.push(card.role);
        this.deck = shuffle(this.deck);
        player.cards[cardIdx] = { role: this.deck.pop(), dead: false };

        // Challenger must discard a card
        this.gameState = 'DISCARDING';
        this.pendingDiscardPlayerId = challenger.id;
        this.pendingDiscardReason = 'lost_challenge';

        // Proceed to resolve the action after challenger discards
        // Save the action resolution state
        this.pendingActionSuccess = true;
      } else {
        // Player lied! Player loses this card.
        card.dead = true;
        this.addMessage('System', `${player.name} ถูกจับได้ว่าบลัฟ! สูญเสียไพ่ ${card.role}.`);

        // If assassin lied, they lost 3 coins and action fails
        this.moveToNextTurn();
      }
    } else if (this.gameState === 'BLOCK_CHALLENGE_RESOLVING') {
      const challenger = this.players.find(p => p.id === this.activeAction.challengerId);
      const claimedRole = this.activeAction.blockedRole;

      if (card.role === claimedRole) {
        // Blocker proved it! Challenger loses a card, block succeeds.
        this.addMessage('System', `${player.name} โชว์ไพ่ ${claimedRole} พิสูจน์การขัดขวางสำเร็จ!`);
        
        this.deck.push(card.role);
        this.deck = shuffle(this.deck);
        player.cards[cardIdx] = { role: this.deck.pop(), dead: false };

        // Challenger must discard
        this.gameState = 'DISCARDING';
        this.pendingDiscardPlayerId = challenger.id;
        this.pendingDiscardReason = 'lost_block_challenge';

        // Block succeeds, turn passes after discard
        this.pendingActionSuccess = false;
      } else {
        // Blocker lied! Blocker loses the revealed card, block fails, action resolves.
        card.dead = true;
        this.addMessage('System', `${player.name} อ้างตัวบล็อคเท็จ! สูญเสียไพ่ ${card.role}.`);
        
        // Resolve original action
        this.resolveAction();
      }
    }
  }

  // Discard a card (lose influence)
  discardCard(playerId, cardIdx) {
    if (this.gameState !== 'DISCARDING' || this.pendingDiscardPlayerId !== playerId) {
      throw new Error('Not your turn to discard.');
    }

    const player = this.players.find(p => p.id === playerId);
    const card = player.cards[cardIdx];
    if (card.dead) throw new Error('Card already dead.');

    card.dead = true;
    this.addMessage('System', `${player.name} เปิดเผยไพ่ที่เสียอิทธิพล: ${card.role}.`);

    this.gameState = 'PLAYING';
    this.pendingDiscardPlayerId = null;

    // Check win condition
    if (this.checkWinCondition()) return;

    // If it was part of a challenge resolution
    if (this.pendingDiscardReason === 'lost_challenge' && this.pendingActionSuccess) {
      this.pendingDiscardReason = '';
      this.pendingActionSuccess = false;
      this.resolveAction();
      return;
    }
    
    if (this.pendingDiscardReason === 'lost_block_challenge') {
      this.pendingDiscardReason = '';
      // Block succeeded, so original action is cancelled, turn passes
      this.moveToNextTurn();
      return;
    }

    this.pendingDiscardReason = '';
    this.moveToNextTurn();
  }

  // Ambassador card exchange
  exchangeSelect(playerId, keptRoleIndices) {
    if (this.gameState !== 'EXCHANGING' || this.players[this.turnIndex].id !== playerId) {
      throw new Error('Not your turn to exchange.');
    }

    const player = this.players.find(p => p.id === playerId);
    
    // Merge live cards and drawn cards
    const liveCards = player.cards.filter(c => !c.dead);
    const allOptions = [...liveCards.map(c => c.role), ...this.exchangeCards];

    // Validate selections
    if (keptRoleIndices.length !== liveCards.length) {
      throw new Error(`You must keep exactly ${liveCards.length} cards.`);
    }

    const keptRoles = keptRoleIndices.map(idx => allOptions[idx]);
    
    // Put unused back to deck
    const unusedRoles = [];
    allOptions.forEach((role, idx) => {
      if (!keptRoleIndices.includes(idx)) {
        unusedRoles.push(role);
      }
    });

    this.deck.push(...unusedRoles);
    this.deck = shuffle(this.deck);

    // Update player cards
    let keptIdx = 0;
    player.cards.forEach(c => {
      if (!c.dead) {
        c.role = keptRoles[keptIdx++];
      }
    });

    this.addMessage('System', `${player.name} ทำการสลับแลกเปลี่ยนไพ่เรียบร้อย.`);
    this.exchangeCards = [];
    this.gameState = 'PLAYING';
    
    this.moveToNextTurn();
  }

  moveToNextTurn() {
    this.activeAction = null;
    this.passes.clear();
    this.gameState = 'PLAYING';

    const activePlayers = this.players.filter(p => !p.spectating && p.cards.some(c => !c.dead));
    if (activePlayers.length <= 1) {
      this.checkWinCondition();
      return;
    }

    do {
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
    } while (this.players[this.turnIndex].spectating || this.players[this.turnIndex].cards.every(c => c.dead));
  }

  checkWinCondition() {
    const livePlayers = this.players.filter(p => !p.spectating && p.cards.some(c => !c.dead));
    if (livePlayers.length === 1) {
      this.winner = livePlayers[0];
      this.gameState = 'GAME_OVER';
      this.addMessage('System', `🏆 ${this.winner.name} โค่นอำนาจสำเร็จและเป็นผู้ชนะ!`);
      return true;
    }
    return false;
  }

  getClientState(playerId) {
    const activePlayers = this.players.filter(p => !p.spectating && p.cards.some(c => !c.dead));
    
    // Check if player has passed
    const hasPassed = this.passes.has(playerId);

    return {
      id: this.id,
      gameType: this.gameType,
      gameState: this.gameState,
      turnIndex: this.turnIndex,
      winner: this.winner ? { id: this.winner.id, name: this.winner.name } : null,
      messages: this.messages,
      activeAction: this.activeAction,
      hasPassed,
      exchangeCards: this.players[this.turnIndex]?.id === playerId ? this.exchangeCards : [], // Only show drawn cards to active player
      pendingDiscardPlayerId: this.pendingDiscardPlayerId,
      pendingDiscardReason: this.pendingDiscardReason,
      lastEvent: this.lastEvent,
      players: this.players.map(p => {
        return {
          id: p.id,
          name: p.name,
          coins: p.coins,
          spectating: p.spectating,
          isOnline: p.isOnline,
          isHost: p.isHost,
          isDead: p.cards.length > 0 && p.cards.every(c => c.dead),
          // Clean cards: hide face-down cards from others
          cards: p.cards.map(c => {
            const show = c.dead || p.id === playerId;
            return {
              role: show ? c.role : 'hidden',
              dead: c.dead
            };
          })
        };
      })
    };
  }
}
