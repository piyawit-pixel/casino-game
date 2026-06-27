import { evaluate7CardHand, compareScores } from './pokerEngine.js';

function createDeck() {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const suits = ['h', 'd', 'c', 's'];
  const deck = [];
  for (const r of ranks) {
    for (const s of suits) {
      deck.push({ rank: r, suit: s });
    }
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

export class Room {
  constructor(id) {
    this.id = id;
    this.players = []; // { id, name, chips, cards: [], currentBet, totalBetInHand, folded: false, allIn: false, isOnline: true, spectating: false, isHost: false }
    this.gameState = 'WAITING'; // WAITING, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN
    this.communityCards = [];
    this.deck = [];
    this.pot = 0;
    this.dealerIndex = 0;
    this.currentTurnIndex = null;
    this.currentBetSize = 0;
    this.minRaise = 0;
    this.sbAmount = 10;
    this.bbAmount = 20;
    this.messages = [];
    this.showdownResults = [];
    this.handCount = 0;
    this.activePlayerIdsThisHand = [];
    this.lastAction = null; // { name, action, amount } for display
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

  addPlayer(id, name, initialChips = 1000) {
    const existingPlayer = this.players.find(p => p.id === id || (p.name.toLowerCase() === name.toLowerCase() && !p.isOnline));
    
    if (existingPlayer) {
      existingPlayer.id = id; // Update socket id
      existingPlayer.isOnline = true;
      this.addMessage('System', `${existingPlayer.name} has reconnected.`);
      return existingPlayer;
    }

    const isHost = this.players.length === 0;
    const isSpectating = this.gameState !== 'WAITING';
    const newPlayer = {
      id,
      name,
      chips: initialChips,
      cards: [],
      currentBet: 0,
      totalBetInHand: 0,
      folded: false,
      allIn: false,
      isOnline: true,
      spectating: isSpectating,
      isHost
    };

    this.players.push(newPlayer);
    this.addMessage('System', `${name} joined the room.`);
    return newPlayer;
  }

  removePlayer(id) {
    const playerIndex = this.players.findIndex(p => p.id === id);
    if (playerIndex !== -1) {
      const player = this.players[playerIndex];
      player.isOnline = false;
      this.addMessage('System', `${player.name} disconnected.`);

      // If the game is WAITING, we can just remove them
      if (this.gameState === 'WAITING') {
        this.players.splice(playerIndex, 1);
        // Transfer host if host left
        if (player.isHost && this.players.length > 0) {
          this.players[0].isHost = true;
        }
      } else {
        // If in game, check if it's their turn. If so, autofold/check
        if (this.currentTurnIndex !== null && this.players[this.currentTurnIndex].id === id) {
          this.autoFoldOrCheck(id);
        }
      }
    }
  }

  autoFoldOrCheck(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;
    
    // If checking is possible (i.e. player current bet matches current bet size), check. Otherwise fold.
    if (player.currentBet === this.currentBetSize) {
      this.processAction(playerId, 'CHECK', 0);
    } else {
      this.processAction(playerId, 'FOLD', 0);
    }
  }

  startGame() {
    if (this.players.filter(p => p.isOnline).length < 2) {
      throw new Error('Need at least 2 online players to start.');
    }
    
    // Reset players for a new active game
    this.players.forEach(p => {
      p.spectating = false;
      if (p.chips <= 0) p.chips = 1000; // Reset chips if they went broke
    });
    
    this.handCount = 0;
    this.startNewHand();
  }

  startNewHand() {
    this.gameState = 'PREFLOP';
    this.communityCards = [];
    this.deck = shuffle(createDeck());
    this.pot = 0;
    this.showdownResults = [];
    this.lastAction = null;

    // Reset player card states
    this.players.forEach(p => {
      p.cards = [];
      p.currentBet = 0;
      p.totalBetInHand = 0;
      p.folded = p.chips <= 0 || !p.isOnline; // Fold out inactive or broke players
      p.allIn = false;
    });

    const activePlayers = this.players.filter(p => !p.folded);
    if (activePlayers.length < 2) {
      this.gameState = 'WAITING';
      this.addMessage('System', 'Not enough active players to deal a new hand.');
      return;
    }

    this.activePlayerIdsThisHand = activePlayers.map(p => p.id);

    // Update dealer button index to the next active player
    let nextDealerIndex = this.dealerIndex;
    do {
      nextDealerIndex = (nextDealerIndex + 1) % this.players.length;
    } while (this.players[nextDealerIndex].folded);
    this.dealerIndex = nextDealerIndex;

    // Post Blinds
    const blinds = this.getBlindsIndices(activePlayers);
    const sbPlayer = this.players[blinds.sb];
    const bbPlayer = this.players[blinds.bb];

    // Deduct SB
    const sbPosted = Math.min(sbPlayer.chips, this.sbAmount);
    sbPlayer.chips -= sbPosted;
    sbPlayer.currentBet = sbPosted;
    sbPlayer.totalBetInHand = sbPosted;
    if (sbPlayer.chips === 0) sbPlayer.allIn = true;

    // Deduct BB
    const bbPosted = Math.min(bbPlayer.chips, this.bbAmount);
    bbPlayer.chips -= bbPosted;
    bbPlayer.currentBet = bbPosted;
    bbPlayer.totalBetInHand = bbPosted;
    if (bbPlayer.chips === 0) bbPlayer.allIn = true;

    this.pot = sbPosted + bbPosted;
    this.currentBetSize = this.bbAmount;
    this.minRaise = this.bbAmount * 2;

    // Deal cards (2 cards to each active player)
    for (let i = 0; i < 2; i++) {
      activePlayers.forEach(p => {
        p.cards.push(this.deck.pop());
      });
    }

    // Set first action
    // In Heads up (2 players): SB (dealer) acts first preflop, BB acts second.
    // In 3+ players: Player to the left of BB (UTG) acts first.
    if (activePlayers.length === 2) {
      this.currentTurnIndex = blinds.sb;
    } else {
      let index = (blinds.bb + 1) % this.players.length;
      while (this.players[index].folded || this.players[index].allIn) {
        index = (index + 1) % this.players.length;
      }
      this.currentTurnIndex = index;
    }

    this.addMessage('Dealer', `Hand #${++this.handCount} started. Blinds posted.`);
  }

  getBlindsIndices(activePlayers) {
    // If heads-up (2 players):
    // dealer index is SB, other player is BB.
    if (activePlayers.length === 2) {
      const sb = this.dealerIndex;
      let bb = (this.dealerIndex + 1) % this.players.length;
      while (this.players[bb].folded) {
        bb = (bb + 1) % this.players.length;
      }
      return { sb, bb };
    }

    // 3+ players:
    // SB is the first active player clockwise from dealer.
    // BB is the second active player clockwise from dealer.
    let sb = (this.dealerIndex + 1) % this.players.length;
    while (this.players[sb].folded) {
      sb = (sb + 1) % this.players.length;
    }
    let bb = (sb + 1) % this.players.length;
    while (this.players[bb].folded) {
      bb = (bb + 1) % this.players.length;
    }
    return { sb, bb };
  }

  processAction(playerId, actionType, raiseAmount = 0) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.players[this.currentTurnIndex].id !== playerId) {
      throw new Error("It's not your turn.");
    }

    actionType = actionType.toUpperCase();
    let actionDescription = '';

    if (actionType === 'FOLD') {
      player.folded = true;
      player.cards = [];
      actionDescription = 'folds';
      this.lastAction = { name: player.name, action: 'Fold', amount: 0 };
    } else if (actionType === 'CHECK') {
      if (player.currentBet < this.currentBetSize) {
        throw new Error('Cannot check, you must call or fold.');
      }
      actionDescription = 'checks';
      this.lastAction = { name: player.name, action: 'Check', amount: 0 };
    } else if (actionType === 'CALL') {
      const callAmount = this.currentBetSize - player.currentBet;
      const chipsBet = Math.min(player.chips, callAmount);
      
      player.chips -= chipsBet;
      player.currentBet += chipsBet;
      player.totalBetInHand += chipsBet;
      this.pot += chipsBet;
      
      if (player.chips === 0) {
        player.allIn = true;
        actionDescription = `calls all-in for ${chipsBet}`;
      } else {
        actionDescription = `calls ${chipsBet}`;
      }
      this.lastAction = { name: player.name, action: 'Call', amount: chipsBet };
    } else if (actionType === 'RAISE') {
      const raiseTo = parseInt(raiseAmount);
      if (isNaN(raiseTo) || raiseTo < this.minRaise) {
        throw new Error(`Minimum raise size is ${this.minRaise}`);
      }
      
      const additionalNeeded = raiseTo - player.currentBet;
      if (additionalNeeded > player.chips) {
        throw new Error('Not enough chips for that raise.');
      }

      player.chips -= additionalNeeded;
      player.currentBet += additionalNeeded;
      player.totalBetInHand += additionalNeeded;
      this.pot += additionalNeeded;

      const raiseDiff = raiseTo - this.currentBetSize;
      this.currentBetSize = raiseTo;
      this.minRaise = raiseTo + raiseDiff;

      if (player.chips === 0) {
        player.allIn = true;
        actionDescription = `raises all-in to ${raiseTo}`;
      } else {
        actionDescription = `raises to ${raiseTo}`;
      }
      this.lastAction = { name: player.name, action: 'Raise', amount: raiseTo };
    }

    this.addMessage(player.name, actionDescription);

    // Check if only one player remains (everyone else folded)
    const activePlayers = this.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      this.awardPotToSoleSurvivor(activePlayers[0]);
      return;
    }

    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.transitionToNextPhase();
    } else {
      this.moveToNextTurn();
    }
  }

  isBettingRoundComplete() {
    const activePlayers = this.players.filter(p => !p.folded && !p.allIn);
    
    // If there are 0 or 1 active players who can act, the round is complete
    if (activePlayers.length <= 1) {
      // But verify that everyone still eligible has matched the current bet
      const allMatched = this.players
        .filter(p => !p.folded && p.chips > 0)
        .every(p => p.currentBet === this.currentBetSize || p.allIn);
      return allMatched;
    }

    // Everyone who is active must have matched the current bet and acted at least once
    const allMatched = this.players
      .filter(p => !p.folded)
      .every(p => p.currentBet === this.currentBetSize || p.allIn);

    return allMatched && this.hasEveryoneActed();
  }

  hasEveryoneActed() {
    // Check if everyone not folded/all-in has made a decision
    // Let's look at the active turn rotation. If all active players have matched the bet
    // and we've gone around, we are done.
    // We can track this by checking if the next player to act has their currentBet matching currentBetSize
    // and is not the raiser/aggressor.
    // If the next turn is someone who already matched the current bet size, the round is complete!
    const nextIndex = this.getNextTurnIndex();
    if (nextIndex === null) return true;
    
    const nextPlayer = this.players[nextIndex];
    // In preflop, if currentBetSize is bbAmount, and the next player is BB (who hasn't acted yet),
    // they still have their option to check/raise, even though they match the bet.
    // So if BB has currentBet === BB, they must still act.
    if (this.gameState === 'PREFLOP' && this.currentBetSize === this.bbAmount) {
      const activePlayers = this.players.filter(p => !p.folded);
      const blinds = this.getBlindsIndices(activePlayers);
      if (nextIndex === blinds.bb && nextPlayer.totalBetInHand === this.bbAmount && nextPlayer.chips > 0) {
        // BB hasn't had their option yet
        return false;
      }
    }

    return nextPlayer.currentBet === this.currentBetSize;
  }

  moveToNextTurn() {
    this.currentTurnIndex = this.getNextTurnIndex();
    if (this.currentTurnIndex === null) {
      this.transitionToNextPhase();
    }
  }

  getNextTurnIndex() {
    let index = this.currentTurnIndex;
    const activePlayers = this.players.filter(p => !p.folded && !p.allIn);
    
    if (activePlayers.length === 0) return null;

    do {
      index = (index + 1) % this.players.length;
    } while (this.players[index].folded || this.players[index].allIn);

    return index;
  }

  transitionToNextPhase() {
    // Reset player bets for the new round
    this.players.forEach(p => {
      p.currentBet = 0;
    });
    this.currentBetSize = 0;
    this.minRaise = this.bbAmount;

    // Check if we need to skip straight to showdown (because all or all-but-one players are all-in)
    const activeNonAllIn = this.players.filter(p => !p.folded && !p.allIn);
    const activePlayers = this.players.filter(p => !p.folded);

    if (activeNonAllIn.length <= 1 && activePlayers.length > 1) {
      // Deal remaining community cards and go to showdown
      this.dealRemainingCommunityCards();
      this.showdown();
      return;
    }

    switch (this.gameState) {
      case 'PREFLOP':
        this.gameState = 'FLOP';
        this.dealCommunityCards(3);
        this.addMessage('Dealer', `Flop: ${this.communityCards.map(c => c.rank + c.suit).join(' ')}`);
        break;
      case 'FLOP':
        this.gameState = 'TURN';
        this.dealCommunityCards(1);
        this.addMessage('Dealer', `Turn: ${this.communityCards[3].rank}${this.communityCards[3].suit}`);
        break;
      case 'TURN':
        this.gameState = 'RIVER';
        this.dealCommunityCards(1);
        this.addMessage('Dealer', `River: ${this.communityCards[4].rank}${this.communityCards[4].suit}`);
        break;
      case 'RIVER':
        this.showdown();
        return;
      default:
        break;
    }

    // Set first action for post-flop round
    // Action starts with the first active player clockwise from the dealer
    let index = (this.dealerIndex + 1) % this.players.length;
    while (this.players[index].folded || this.players[index].allIn) {
      index = (index + 1) % this.players.length;
    }
    this.currentTurnIndex = index;
  }

  dealCommunityCards(count) {
    // Burn card
    this.deck.pop();
    for (let i = 0; i < count; i++) {
      this.communityCards.push(this.deck.pop());
    }
  }

  dealRemainingCommunityCards() {
    const remaining = 5 - this.communityCards.length;
    if (remaining > 0) {
      this.dealCommunityCards(remaining);
    }
  }

  awardPotToSoleSurvivor(winner) {
    winner.chips += this.pot;
    this.gameState = 'SHOWDOWN';
    this.currentTurnIndex = null;
    this.showdownResults = [{
      id: winner.id,
      name: winner.name,
      winAmount: this.pot,
      handType: 'Sole Survivor',
      handCards: []
    }];
    this.addMessage('Dealer', `${winner.name} wins the pot of ${this.pot} (everyone else folded).`);
    this.pot = 0;
  }

  showdown() {
    this.gameState = 'SHOWDOWN';
    this.currentTurnIndex = null;

    // Distribute pot using side pot algorithm
    this.showdownResults = this.distributePot();
    
    // Announce winners
    const winners = this.showdownResults.filter(r => r.winAmount > 0);
    winners.forEach(w => {
      this.addMessage('Dealer', `${w.name} wins ${w.winAmount} with ${w.handType}`);
    });

    this.pot = 0;
  }

  distributePot() {
    const contributions = this.players.map(p => ({
      id: p.id,
      name: p.name,
      totalBet: p.totalBetInHand,
      folded: p.folded,
      chips: p.chips
    }));

    const payouts = {};
    this.players.forEach(p => { payouts[p.id] = 0; });

    const activePlayers = this.players.filter(p => !p.folded);
    
    // Evaluate hands for all non-folded players
    const evaluatedHands = {};
    activePlayers.forEach(p => {
      evaluatedHands[p.id] = evaluate7CardHand(p.cards, this.communityCards);
    });

    while (contributions.some(c => c.totalBet > 0)) {
      const contributors = contributions.filter(c => c.totalBet > 0);
      const minContribution = Math.min(...contributors.map(c => c.totalBet));

      let subPotAmount = 0;
      const subPotEligiblePlayerIds = [];

      contributions.forEach(c => {
        if (c.totalBet > 0) {
          const take = Math.min(c.totalBet, minContribution);
          subPotAmount += take;
          c.totalBet -= take;
          
          if (!c.folded) {
            subPotEligiblePlayerIds.push(c.id);
          }
        }
      });

      if (subPotEligiblePlayerIds.length === 0) {
        // Refund chips to contributors if somehow no active player is eligible
        const share = Math.floor(subPotAmount / contributors.length);
        contributors.forEach(c => {
          payouts[c.id] += share;
        });
        continue;
      }

      let bestScore = null;
      let winners = [];

      subPotEligiblePlayerIds.forEach(id => {
        const hand = evaluatedHands[id];
        if (!bestScore) {
          bestScore = hand.score;
          winners = [id];
        } else {
          const cmp = compareScores(hand.score, bestScore);
          if (cmp > 0) {
            bestScore = hand.score;
            winners = [id];
          } else if (cmp === 0) {
            winners.push(id);
          }
        }
      });

      const winShare = Math.floor(subPotAmount / winners.length);
      const remainder = subPotAmount % winners.length;

      winners.forEach((winId, idx) => {
        const bonus = idx === 0 ? remainder : 0;
        payouts[winId] += winShare + bonus;
      });
    }

    const result = [];
    this.players.forEach(p => {
      if (payouts[p.id] > 0) {
        p.chips += payouts[p.id];
      }
      result.push({
        id: p.id,
        name: p.name,
        winAmount: payouts[p.id],
        handType: p.folded ? 'Folded' : (evaluatedHands[p.id] ? evaluatedHands[p.id].type : 'N/A'),
        handCards: p.folded ? [] : (evaluatedHands[p.id] ? evaluatedHands[p.id].cards.map(c => c.original) : [])
      });
    });

    return result;
  }

  // Get clean client state to avoid exposing other player's cards
  getClientState(playerId) {
    return {
      id: this.id,
      gameState: this.gameState,
      communityCards: this.communityCards,
      pot: this.pot,
      dealerIndex: this.dealerIndex,
      currentTurnIndex: this.currentTurnIndex,
      currentBetSize: this.currentBetSize,
      minRaise: this.minRaise,
      messages: this.messages,
      showdownResults: this.showdownResults,
      lastAction: this.lastAction,
      players: this.players.map(p => {
        const showCards = this.gameState === 'SHOWDOWN' || p.id === playerId;
        return {
          id: p.id,
          name: p.name,
          chips: p.chips,
          currentBet: p.currentBet,
          totalBetInHand: p.totalBetInHand,
          folded: p.folded,
          allIn: p.allIn,
          isOnline: p.isOnline,
          spectating: p.spectating,
          isHost: p.isHost,
          cards: showCards ? p.cards : (p.cards.length > 0 ? [{}, {}] : []) // return back of cards if not authorized to see
        };
      })
    };
  }
}
