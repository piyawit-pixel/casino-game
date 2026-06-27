const CHARACTERS = [
  { name: 'Willy the Kid', maxBullets: 4, desc: 'ยิงปืน BANG! ได้ไม่จำกัดครั้งในเทิร์นตัวเอง' },
  { name: 'Suzy Lafayette', maxBullets: 4, desc: 'เมื่อการ์ดในมือหมด จะได้จั่วการ์ด 1 ใบ' },
  { name: 'Calamity Janet', maxBullets: 4, desc: 'สามารถใช้ BANG! แทน MISSED! และใช้ MISSED! แทน BANG! ได้' },
  { name: 'Bart Cassidy', maxBullets: 4, desc: 'ทุกครั้งที่เสียเลือด จะได้จั่วการ์ด 1 ใบ' }
];

function generateBangDeck() {
  const deck = [];
  let id = 1;

  const add = (type, color, count) => {
    for (let i = 0; i < count; i++) {
      deck.push({ id: id++, type, color });
    }
  };

  add('bang', 'brown', 25);
  add('missed', 'brown', 15);
  add('beer', 'brown', 8);
  add('stagecoach', 'brown', 4);
  add('wells_fargo', 'brown', 2);
  add('gatling', 'brown', 2);
  add('indians', 'brown', 3);
  add('cat_balou', 'brown', 4);
  add('panic', 'brown', 4);
  
  add('barrel', 'blue', 3);
  add('mustang', 'blue', 3);
  add('schofield', 'blue', 3);
  add('winchester', 'blue', 2);
  add('volcanic', 'blue', 2);

  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export class BangRoom {
  constructor(id) {
    this.id = id;
    this.gameType = 'bang';
    this.players = []; // { id, name, role, character, bullets, maxBullets, hand: [], blueCards: [], spectating: false, isOnline: true, isHost: false }
    this.gameState = 'WAITING'; // WAITING, PLAYING, WAITING_RESPONSE, GAME_OVER
    this.deck = [];
    this.discardPile = [];
    this.turnIndex = 0;
    this.bangPlayedCount = 0;
    this.winnerRole = null;
    this.messages = [];
    this.lastEvent = null;

    // Response states (e.g. being shot)
    this.pendingResponse = null; 
    /*
      {
        playerId: string,
        type: 'missed' | 'indians' | 'beer',
        sourceId: string,
        attackCardType: string,
        damage: number,
        // Multi-targets (e.g. Gatling, Indians)
        targetsQueue: string[]
      }
    */
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
      role: null,
      character: null,
      bullets: 0,
      maxBullets: 0,
      hand: [],
      blueCards: [],
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
        // If in-game, eliminate them immediately
        if (player.bullets > 0) {
          this.eliminatePlayer(player, 'disconnection');
          
          // Fix: If they were targeted to respond, advance targets
          if (this.pendingResponse && this.pendingResponse.playerId === id) {
            this.advanceTargetQueue();
          }

          // Fix: If it was their turn, advance turn
          if (this.gameState === 'PLAYING' && this.players[this.turnIndex].id === id) {
            do {
              this.turnIndex = (this.turnIndex + 1) % this.players.length;
            } while (this.players[this.turnIndex].spectating || this.players[this.turnIndex].bullets <= 0);
            this.startTurn();
          }
        }
      }
    }
  }

  startGame() {
    const active = this.players.filter(p => p.isOnline);
    if (active.length < 3) {
      throw new Error('Need at least 3 players to start BANG!.');
    }

    this.gameState = 'PLAYING';
    this.winnerRole = null;
    this.lastEvent = null;
    this.pendingResponse = null;
    this.bangPlayedCount = 0;

    // 1. Shuffle roles based on player count
    // 3 Players: Sheriff, Outlaw, Renegade
    // 4 Players: Sheriff, Outlaw, Renegade, Deputy
    // 5 Players: Sheriff, Outlaw, Outlaw, Renegade, Deputy
    // 6 Players: Sheriff, Outlaw, Outlaw, Renegade, Deputy, Deputy
    const count = active.length;
    const roles = ['sheriff', 'outlaw', 'renegade'];
    if (count >= 4) roles.push('deputy');
    if (count >= 5) roles.push('outlaw');
    if (count >= 6) roles.push('deputy');

    shuffle(roles);
    
    // 2. Assign roles, characters, bullets
    const charactersPool = shuffle([...CHARACTERS]);

    this.players.forEach((p, idx) => {
      p.spectating = !p.isOnline;
      if (p.spectating) return;

      p.role = roles.pop();
      p.character = charactersPool.pop() || CHARACTERS[0];
      
      let maxBullets = p.character.maxBullets;
      if (p.role === 'sheriff') maxBullets += 1; // Sheriff gets +1 bullet

      p.maxBullets = maxBullets;
      p.bullets = maxBullets;
      p.hand = [];
      p.blueCards = [];
    });

    // 3. Shuffle and deal cards (Start hand size = current bullets)
    this.deck = shuffle(generateBangDeck());
    this.discardPile = [];

    this.players.forEach(p => {
      if (p.spectating) return;
      for (let i = 0; i < p.bullets; i++) {
        p.hand.push(this.drawCardFromDeck());
      }
    });

    // 4. Set turn index to Sheriff
    const sheriffIdx = this.players.findIndex(p => p.role === 'sheriff');
    this.turnIndex = sheriffIdx !== -1 ? sheriffIdx : 0;

    this.addMessage('System', 'BANG! started. Sheriff has been revealed!');
    
    // Sheriff draws 2 to start their turn
    this.startTurn();
  }

  startTurn() {
    const activePlayer = this.players[this.turnIndex];
    this.bangPlayedCount = 0;

    // Draw 2 cards
    activePlayer.hand.push(this.drawCardFromDeck());
    activePlayer.hand.push(this.drawCardFromDeck());

    this.lastEvent = `ตาของ ${activePlayer.name} (${activePlayer.character.name})`;
    this.addMessage('System', this.lastEvent);
    
    this.checkSuzyAbility(activePlayer);
  }

  // Play a brown/instant card
  playBrownCard(playerId, cardId, targetId = null) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.players[this.turnIndex].id !== playerId || this.gameState !== 'PLAYING') {
      throw new Error("It's not your turn.");
    }

    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) throw new Error("Card not found in hand.");
    const card = player.hand[cardIdx];

    // Card logic
    if (card.type === 'bang') {
      if (!targetId) throw new Error("Please select a target player.");
      const target = this.players.find(p => p.id === targetId);
      
      // Calculate distance
      const distance = this.getDistanceBetween(player.id, target.id);
      const range = this.getPlayerRange(player.id);
      
      if (distance > range) {
        throw new Error(`Target is out of range! (Distance: ${distance}, Range: ${range})`);
      }

      // Check BANG! play count limit (Willy the Kid can play infinite)
      const hasVolcanic = player.blueCards.some(c => c.type === 'volcanic');
      const isWilly = player.character.name === 'Willy the Kid';
      if (this.bangPlayedCount >= 1 && !isWilly && !hasVolcanic) {
        throw new Error("You can only play 1 BANG! card per turn.");
      }

      // Discard card
      player.hand.splice(cardIdx, 1);
      this.discardPile.push(card);
      this.bangPlayedCount++;

      this.lastEvent = `${player.name} ยิงปืนใส่ ${target.name}`;
      this.addMessage('System', this.lastEvent);

      // Check Barrel first if target has it
      const hasBarrel = target.blueCards.some(c => c.type === 'barrel');
      if (hasBarrel) {
        // Draw card (Barrel check)
        const checkCard = this.drawCardFromDeck();
        this.discardPile.push(checkCard);
        
        // Let's assume Hearts (random check: 25% chance of being Heart)
        const isHeart = Math.random() < 0.25;
        this.addMessage('System', `ถังไม้หลบกระสุนของ ${target.name} ทำงาน: ${isHeart ? 'สำเร็จ! (หลบได้)' : 'ล้มเหลว'}`);
        
        if (isHeart) {
          this.checkSuzyAbility(player);
          return;
        }
      }

      // Enter waiting response state (target must play MISSED!)
      // Calamity Janet can play BANG! as MISSED! too, we handle it in response selection
      this.gameState = 'WAITING_RESPONSE';
      this.pendingResponse = {
        playerId: target.id,
        type: 'missed',
        sourceId: player.id,
        attackCardType: 'bang',
        damage: 1,
        targetsQueue: []
      };

    } else if (card.type === 'beer') {
      if (player.bullets >= player.maxBullets) {
        throw new Error("Your bullets are already full.");
      }
      player.hand.splice(cardIdx, 1);
      this.discardPile.push(card);
      player.bullets++;
      
      this.lastEvent = `${player.name} ดื่มเบียร์ฟื้นพลังชีวิต (+1)`;
      this.addMessage('System', this.lastEvent);

    } else if (card.type === 'stagecoach' || card.type === 'wells_fargo') {
      player.hand.splice(cardIdx, 1);
      this.discardPile.push(card);
      const count = card.type === 'stagecoach' ? 2 : 3;
      
      for (let i = 0; i < count; i++) {
        player.hand.push(this.drawCardFromDeck());
      }
      this.lastEvent = `${player.name} เล่นการ์ดจั่ว ${count} ใบ`;
      this.addMessage('System', this.lastEvent);

    } else if (card.type === 'gatling') {
      player.hand.splice(cardIdx, 1);
      this.discardPile.push(card);

      const targets = this.players.filter(p => p.id !== player.id && !p.spectating && p.bullets > 0).map(p => p.id);
      if (targets.length > 0) {
        this.gameState = 'WAITING_RESPONSE';
        const nextTargetId = targets.shift();
        this.pendingResponse = {
          playerId: nextTargetId,
          type: 'missed',
          sourceId: player.id,
          attackCardType: 'gatling',
          damage: 1,
          targetsQueue: targets
        };
        this.lastEvent = `${player.name} โยนการ์ดปืนกลหมุน Gatling! ยิงทุกคน!`;
        this.addMessage('System', this.lastEvent);
      }

    } else if (card.type === 'indians') {
      player.hand.splice(cardIdx, 1);
      this.discardPile.push(card);

      const targets = this.players.filter(p => p.id !== player.id && !p.spectating && p.bullets > 0).map(p => p.id);
      if (targets.length > 0) {
        this.gameState = 'WAITING_RESPONSE';
        const nextTargetId = targets.shift();
        this.pendingResponse = {
          playerId: nextTargetId,
          type: 'indians', // Target must discard BANG!
          sourceId: player.id,
          attackCardType: 'indians',
          damage: 1,
          targetsQueue: targets
        };
        this.lastEvent = `${player.name} ปล่อยฝูงชนป่าบุก!`;
        this.addMessage('System', this.lastEvent);
      }

    } else if (card.type === 'cat_balou') {
      if (!targetId) throw new Error("Select a target player.");
      const target = this.players.find(p => p.id === targetId);
      
      const allTargetCards = [...target.hand, ...target.blueCards];
      if (allTargetCards.length === 0) throw new Error("Target player has no cards.");

      player.hand.splice(cardIdx, 1);
      this.discardPile.push(card);

      // Force discard random card (or weapon)
      // To keep it simple: we choose a random card from hand or in-play
      const targetCard = shuffle(allTargetCards)[0];
      const inHand = target.hand.includes(targetCard);
      
      if (inHand) {
        const idx = target.hand.findIndex(c => c.id === targetCard.id);
        target.hand.splice(idx, 1);
        this.discardPile.push(targetCard);
        this.addMessage('System', `${player.name} บังคับทิ้งไพ่การ์ดในมือของ ${target.name}`);
      } else {
        const idx = target.blueCards.findIndex(c => c.id === targetCard.id);
        target.blueCards.splice(idx, 1);
        this.discardPile.push(targetCard);
        this.addMessage('System', `${player.name} บังคับทิ้งการ์ดอุปกรณ์ ${targetCard.type} ของ ${target.name}`);
      }

      this.checkSuzyAbility(target);

    } else if (card.type === 'panic') {
      if (!targetId) throw new Error("Select a target player.");
      const target = this.players.find(p => p.id === targetId);
      const distance = this.getDistanceBetween(player.id, target.id);
      
      if (distance > 1) {
        throw new Error("Panic has a maximum stealing range of 1.");
      }

      const allTargetCards = [...target.hand, ...target.blueCards];
      if (allTargetCards.length === 0) throw new Error("Target player has no cards.");

      player.hand.splice(cardIdx, 1);
      this.discardPile.push(card);

      const targetCard = shuffle(allTargetCards)[0];
      const inHand = target.hand.includes(targetCard);

      if (inHand) {
        const idx = target.hand.findIndex(c => c.id === targetCard.id);
        target.hand.splice(idx, 1);
        player.hand.push(targetCard);
        this.addMessage('System', `${player.name} ขโมยการ์ดในมือของ ${target.name}`);
      } else {
        const idx = target.blueCards.findIndex(c => c.id === targetCard.id);
        target.blueCards.splice(idx, 1);
        player.hand.push(targetCard);
        this.addMessage('System', `${player.name} ขโมยการ์ดอุปกรณ์ ${targetCard.type} ของ ${target.name}`);
      }

      this.checkSuzyAbility(target);
    }

    this.checkSuzyAbility(player);
  }

  // Play a blue card (equipment played in front of you)
  playBlueCard(playerId, cardId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.players[this.turnIndex].id !== playerId || this.gameState !== 'PLAYING') {
      throw new Error("It's not your turn.");
    }

    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) throw new Error("Card not found in hand.");
    const card = player.hand[cardIdx];

    // Validate blue card
    const isWeapon = ['schofield', 'winchester', 'volcanic'].includes(card.type);
    
    if (isWeapon) {
      // Remove any existing weapons first
      const existingWeaponIdx = player.blueCards.findIndex(c => ['schofield', 'winchester', 'volcanic'].includes(c.type));
      if (existingWeaponIdx !== -1) {
        const oldWeapon = player.blueCards.splice(existingWeaponIdx, 1)[0];
        this.discardPile.push(oldWeapon);
      }
    } else {
      // Only 1 of each card type in play (e.g. 1 Barrel, 1 Mustang max)
      const duplicate = player.blueCards.some(c => c.type === card.type);
      if (duplicate) {
        throw new Error(`You already have a ${card.type} in play.`);
      }
    }

    // Play to table
    player.hand.splice(cardIdx, 1);
    player.blueCards.push(card);

    this.lastEvent = `${player.name} ติดตั้งอุปกรณ์: ${card.type.toUpperCase()}`;
    this.addMessage('System', this.lastEvent);

    this.checkSuzyAbility(player);
  }

  // React to an incoming attack (MISSED! or BEER or accepting damage)
  respondToAttack(playerId, cardId = null) {
    if (this.gameState !== 'WAITING_RESPONSE' || !this.pendingResponse || this.pendingResponse.playerId !== playerId) {
      throw new Error("No pending attack for you.");
    }

    const target = this.players.find(p => p.id === playerId);
    const pending = this.pendingResponse;

    if (cardId) {
      // Player wants to play a card to react
      const cardIdx = target.hand.findIndex(c => c.id === cardId);
      if (cardIdx === -1) throw new Error("Card not found in hand.");
      const card = target.hand[cardIdx];

      const isCalamity = target.character.name === 'Calamity Janet';

      // Match reactive card criteria
      let valid = false;
      if (pending.type === 'missed') {
        valid = card.type === 'missed' || (isCalamity && card.type === 'bang');
      } else if (pending.type === 'indians') {
        valid = card.type === 'bang' || (isCalamity && card.type === 'missed');
      }

      if (!valid) throw new Error("Invalid card choice to block this attack.");

      // Discard the blocking card
      target.hand.splice(cardIdx, 1);
      this.discardPile.push(card);

      this.addMessage('System', `${target.name} ใช้การ์ด ${card.type} ป้องกันการโจมตีสำเร็จ.`);
      this.checkSuzyAbility(target);

      // Advance to next target in queue or resume turn
      this.advanceTargetQueue();

    } else {
      // Player accepted the bullet damage
      target.bullets -= pending.damage;
      this.addMessage('System', `💥 ${target.name} เสียพลังชีวิต ${pending.damage} เม็ด!`);

      // Bart Cassidy Ability: Draw card upon taking damage
      if (target.character.name === 'Bart Cassidy' && target.bullets > 0) {
        for (let i = 0; i < pending.damage; i++) {
          target.hand.push(this.drawCardFromDeck());
        }
        this.addMessage('System', `${target.name} (Bart Cassidy) จั่วไพ่จากการโดนโจมตี`);
      }

      // Check elimination
      if (target.bullets <= 0) {
        const attacker = this.players.find(p => p.id === pending.sourceId);
        this.eliminatePlayer(target, attacker);
      }

      this.advanceTargetQueue();
    }
  }

  advanceTargetQueue() {
    const pending = this.pendingResponse;
    
    // Check if more targets are left in the Gatling/Indians queue
    if (pending && pending.targetsQueue && pending.targetsQueue.length > 0) {
      const nextTargetId = pending.targetsQueue.shift();
      pending.playerId = nextTargetId;
      // Keep everything else the same, loop back to prompt
    } else {
      // Resume turn
      this.gameState = 'PLAYING';
      this.pendingResponse = null;
      this.checkWinCondition();
    }
  }

  // End active player turn (must discard down to current bullets count)
  endTurn(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.players[this.turnIndex].id !== playerId || this.gameState !== 'PLAYING') {
      throw new Error("It's not your turn.");
    }

    // Hand size check
    if (player.hand.length > player.bullets) {
      throw new Error(`You have too many cards in hand! (Hand size: ${player.hand.length}, Bullets left: ${player.bullets}). You must discard cards.`);
    }

    // Move to next living player
    do {
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
    } while (this.players[this.turnIndex].spectating || this.players[this.turnIndex].bullets <= 0);

    this.startTurn();
  }

  // Discard a card to end turn
  discardCardToLimit(playerId, cardId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.players[this.turnIndex].id !== playerId || this.gameState !== 'PLAYING') {
      throw new Error("It's not your turn.");
    }

    const idx = player.hand.findIndex(c => c.id === cardId);
    if (idx === -1) throw new Error("Card not found.");
    const discardedCard = player.hand.splice(idx, 1)[0];
    this.discardPile.push(discardedCard);

    this.checkSuzyAbility(player);
  }

  eliminatePlayer(player, attacker = null) {
    player.bullets = 0;
    player.spectating = true;
    this.addMessage('System', `☠️ ${player.name} ตกรอบ! บทบาทลับคือ: ${player.role.toUpperCase()}`);

    // Discard all their cards
    this.discardPile.push(...player.hand);
    this.discardPile.push(...player.blueCards);
    player.hand = [];
    player.blueCards = [];

    // Attacker rewards
    if (attacker && attacker !== 'disconnection') {
      if (player.role === 'outlaw') {
        // Sheriff or any player who kills Outlaw draws 3 cards reward
        attacker.hand.push(this.drawCardFromDeck());
        attacker.hand.push(this.drawCardFromDeck());
        attacker.hand.push(this.drawCardFromDeck());
        this.addMessage('System', `🎉 ${attacker.name} จั่วการ์ด 3 ใบจากรางวัลล่าค่าหัวโจร!`);
        this.checkSuzyAbility(attacker);
      }
      
      if (player.role === 'deputy' && attacker.role === 'sheriff') {
        // Sheriff who kills Deputy discards all cards in hand and in-play
        attacker.hand = [];
        this.discardPile.push(...attacker.blueCards);
        attacker.blueCards = [];
        this.addMessage('System', `⚠️ นายอำเภอทำปืนลั่นใส่ผู้ช่วย! โดนยึดปืนและการ์ดในมือทั้งหมด!`);
      }
    }

    this.checkWinCondition();
  }

  checkWinCondition() {
    const sheriff = this.players.find(p => p.role === 'sheriff');
    const outlaws = this.players.filter(p => p.role === 'outlaw' && p.bullets > 0);
    const renegades = this.players.filter(p => p.role === 'renegade' && p.bullets > 0);
    const deputies = this.players.filter(p => p.role === 'deputy' && p.bullets > 0);

    // If Sheriff is dead
    if (sheriff.bullets <= 0) {
      if (outlaws.length === 0 && renegades.length === 1 && deputies.length === 0) {
        // Renegade wins if they are the only survivor
        this.winnerRole = 'renegade';
        this.gameState = 'GAME_OVER';
        this.addMessage('System', '🏆 คนทรยศ (Renegade) เป็นผู้รอดชีวิตคนสุดท้ายและชนะเกม!');
        return;
      } else {
        // Otherwise Outlaws win
        this.winnerRole = 'outlaws';
        this.gameState = 'GAME_OVER';
        this.addMessage('System', '🏆 โจร (Outlaws) ทำภารกิจยิงนายอำเภอสำเร็จและชนะเกม!');
        return;
      }
    }

    // If all Outlaws and Renegades are dead
    if (outlaws.length === 0 && renegades.length === 0) {
      this.winnerRole = 'law';
      this.gameState = 'GAME_OVER';
      this.addMessage('System', '🏆 นายอำเภอและผู้ช่วย (Sheriff & Deputies) กวาดล้างหัวขโมยสำเร็จและชนะเกม!');
      return;
    }
  }

  // Draw helper
  drawCardFromDeck() {
    if (this.deck.length === 0) {
      if (this.discardPile.length > 0) {
        this.deck = shuffle([...this.discardPile]);
        this.discardPile = [];
        this.addMessage('System', '🔄 การ์ดกองจั่วหมด สับไพ่จากกองทิ้งกลับมาใช้ใหม่.');
      } else {
        this.deck = shuffle(generateBangDeck());
      }
    }
    return this.deck.pop();
  }

  // Distance calculation based on seating order of living players
  getDistanceBetween(idA, idB) {
    const living = this.players.filter(p => !p.spectating && p.bullets > 0);
    const idxA = living.findIndex(p => p.id === idA);
    const idxB = living.findIndex(p => p.id === idB);
    
    if (idxA === -1 || idxB === -1) return 99;

    let baseDist = Math.min(
      Math.abs(idxA - idxB),
      living.length - Math.abs(idxA - idxB)
    );

    // Apply Mustang defense of target player
    const target = this.players.find(p => p.id === idB);
    const hasMustang = target.blueCards.some(c => c.type === 'mustang');
    if (hasMustang) {
      baseDist += 1;
    }

    return baseDist;
  }

  // Shooting range calculation
  getPlayerRange(id) {
    const player = this.players.find(p => p.id === id);
    const weapon = player.blueCards.find(c => ['schofield', 'winchester', 'volcanic'].includes(c.type));
    
    if (!weapon) return 1; // default Colt .45 has range 1

    if (weapon.type === 'schofield') return 2;
    if (weapon.type === 'winchester') return 5;
    if (weapon.type === 'volcanic') return 1;

    return 1;
  }

  checkSuzyAbility(player) {
    if (player.character.name === 'Suzy Lafayette' && player.hand.length === 0 && player.bullets > 0) {
      player.hand.push(this.drawCardFromDeck());
      this.addMessage('System', `${player.name} (Suzy Lafayette) จั่วไพ่เนื่องจากมือว่างเปล่า`);
    }
  }

  getClientState(playerId) {
    const isMeDead = this.players.find(p => p.id === playerId)?.bullets <= 0;
    
    return {
      id: this.id,
      gameType: this.gameType,
      gameState: this.gameState,
      turnIndex: this.turnIndex,
      winnerRole: this.winnerRole,
      messages: this.messages,
      lastEvent: this.lastEvent,
      pendingResponse: this.pendingResponse,
      players: this.players.map(p => {
        const isMyNode = p.id === playerId;
        // Roles visibility:
        // Sheriff is visible to everyone
        // Show role of dead players to everyone
        // Show own role to yourself
        const showRole = p.role === 'sheriff' || p.bullets <= 0 || isMyNode;

        return {
          id: p.id,
          name: p.name,
          role: showRole ? p.role : 'hidden',
          character: p.character ? { name: p.character.name, desc: p.character.desc } : null,
          bullets: p.bullets,
          maxBullets: p.maxBullets,
          cardCount: p.hand.length,
          blueCards: p.blueCards,
          spectating: p.spectating,
          isOnline: p.isOnline,
          isHost: p.isHost,
          // Hide actual card content of others' hands
          hand: isMyNode ? p.hand : Array(p.hand.length).fill({ type: 'hidden', color: 'brown' })
        };
      })
    };
  }
}
