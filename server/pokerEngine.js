const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const VALUE_RANKS = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

function getCombinations(array, k) {
  const result = [];
  function helper(start, combo) {
    if (combo.length === k) {
      result.push(combo);
      return;
    }
    for (let i = start; i < array.length; i++) {
      helper(i + 1, [...combo, array[i]]);
    }
  }
  helper(0, []);
  return result;
}

export function compareScores(scoreA, scoreB) {
  for (let i = 0; i < scoreA.length; i++) {
    if (scoreA[i] > scoreB[i]) return 1;
    if (scoreA[i] < scoreB[i]) return -1;
  }
  return 0;
}

export function evaluate5CardHand(hand) {
  const cards = hand.map(c => ({
    rank: RANK_VALUES[c.rank],
    suit: c.suit,
    original: c
  })).sort((a, b) => b.rank - a.rank);

  const ranks = cards.map(c => c.rank);
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  let isStraight = false;
  let straightHigh = 0;

  // Check straight
  const uniqueRanks = [...new Set(ranks)];
  if (uniqueRanks.length === 5) {
    if (ranks[0] - ranks[4] === 4) {
      isStraight = true;
      straightHigh = ranks[0];
    } else if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
      // Ace-low straight (5-4-3-2-A)
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Count frequencies
  const counts = {};
  for (const r of ranks) {
    counts[r] = (counts[r] || 0) + 1;
  }

  const freq = Object.entries(counts).map(([rank, count]) => ({
    rank: parseInt(rank),
    count
  })).sort((a, b) => b.count - a.count || b.rank - a.rank);

  if (isStraight && isFlush) {
    return { score: [8, straightHigh], type: 'Straight Flush', cards };
  }
  
  if (freq[0].count === 4) {
    return { score: [7, freq[0].rank, freq[1].rank], type: 'Four of a Kind', cards };
  }
  
  if (freq[0].count === 3 && freq[1].count === 2) {
    return { score: [6, freq[0].rank, freq[1].rank], type: 'Full House', cards };
  }
  
  if (isFlush) {
    return { score: [5, ...ranks], type: 'Flush', cards };
  }
  
  if (isStraight) {
    return { score: [4, straightHigh], type: 'Straight', cards };
  }
  
  if (freq[0].count === 3) {
    return { score: [3, freq[0].rank, freq[1].rank, freq[2].rank], type: 'Three of a Kind', cards };
  }
  
  if (freq[0].count === 2 && freq[1].count === 2) {
    return { score: [2, freq[0].rank, freq[1].rank, freq[2].rank], type: 'Two Pair', cards };
  }
  
  if (freq[0].count === 2) {
    return { score: [1, freq[0].rank, freq[1].rank, freq[2].rank, freq[3].rank], type: 'One Pair', cards };
  }
  
  return { score: [0, ...ranks], type: 'High Card', cards };
}

export function evaluate7CardHand(playerCards, communityCards) {
  const allCards = [...playerCards, ...communityCards];
  const combos = getCombinations(allCards, 5);
  
  let bestHand = null;
  
  for (const combo of combos) {
    const evaluated = evaluate5CardHand(combo);
    if (!bestHand) {
      bestHand = evaluated;
    } else {
      const cmp = compareScores(evaluated.score, bestHand.score);
      if (cmp > 0) {
        bestHand = evaluated;
      }
    }
  }
  
  return bestHand;
}
