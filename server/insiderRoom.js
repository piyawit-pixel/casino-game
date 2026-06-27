const WORD_LIST = [
  { word: 'ไดโนเสาร์ (Dinosaur)', category: 'สิ่งมีชีวิต' },
  { word: 'พิซซ่า (Pizza)', category: 'อาหาร' },
  { word: 'สมาร์ทโฟน (Smartphone)', category: 'สิ่งของ' },
  { word: 'เครื่องบิน (Airplane)', category: 'พาหนะ' },
  { word: 'หอไอเฟล (Eiffel Tower)', category: 'สถานที่' },
  { word: 'ฟุตบอล (Football)', category: 'กีฬา' },
  { word: 'แว่นตา (Glasses)', category: 'สิ่งของ' },
  { word: 'แมว (Cat)', category: 'สัตว์เลี้ยง' },
  { word: 'ตู้เย็น (Refrigerator)', category: 'เครื่องใช้ไฟฟ้า' },
  { word: 'โตเกียว (Tokyo)', category: 'เมือง' },
  { word: 'แฮมเบอร์เกอร์ (Hamburger)', category: 'อาหาร' },
  { word: 'ปลาวาฬ (Whale)', category: 'สัตว์น้ำ' },
  { word: 'ภูเขาไฟ (Volcano)', category: 'ธรรมชาติ' },
  { word: 'อินเทอร์เน็ต (Internet)', category: 'เทคโนโลยี' },
  { word: 'ยาสีฟัน (Toothpaste)', category: 'ของใช้ในบ้าน' }
];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class InsiderRoom {
  constructor(id) {
    this.id = id;
    this.gameType = 'insider';
    this.players = []; // { id, name, role: 'master'|'insider'|'commoner', votedFor, spectating, isOnline, isHost }
    this.gameState = 'WAITING'; // WAITING, PLAYING, VOTING, GAME_OVER
    this.targetWord = '';
    this.category = '';
    this.winner = null; // 'commoners' | 'insider'
    this.messages = [];
    this.lastEvent = null;
    
    // Q&A guesses
    this.guesses = []; // { id, name, text, approved: null/true/false }
    this.guesserId = null; // Who guessed the word correctly

    // Timer management
    this.timerSeconds = 300; // 5 minutes
    this.timerInterval = null;
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
      role: null,
      votedFor: null,
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
      throw new Error('Need at least 3 players to start Insider.');
    }

    this.gameState = 'PLAYING';
    this.winner = null;
    this.guesses = [];
    this.guesserId = null;
    this.timerSeconds = 300; // 5 minutes
    this.lastEvent = 'เริ่มเกม! ค้นหาคำปริศนา';

    // 1. Assign roles
    // 1 Master, 1 Insider, rest are Commoners
    const shuffled = shuffle(active.map(p => p.id));
    const masterId = shuffled.pop();
    const insiderId = shuffled.pop();

    this.players.forEach(p => {
      p.spectating = !p.isOnline;
      p.votedFor = null;
      if (p.spectating) return;

      if (p.id === masterId) p.role = 'master';
      else if (p.id === insiderId) p.role = 'insider';
      else p.role = 'commoner';
    });

    // 2. Select Secret Word
    const selected = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    this.targetWord = selected.word;
    this.category = selected.category;

    this.addMessage('System', `เกมเริ่มต้นขึ้นแล้ว! หมวดหมู่คือ: ${this.category}`);
    this.addMessage('System', 'คำถามสามารถถาม Master ได้ในแชทเลย!');
  }

  // Submit a guess (Commoner / Insider types it)
  submitGuess(playerId, text) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.spectating || player.role === 'master' || this.gameState !== 'PLAYING') {
      throw new Error('You cannot submit guesses.');
    }

    const newGuess = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      playerId,
      name: player.name,
      text: text.trim(),
      approved: null
    };

    this.guesses.push(newGuess);
    this.lastEvent = `${player.name} ทายว่า: "${newGuess.text}"`;
    this.addMessage('System', this.lastEvent);
  }

  // Master approves or rejects a guess
  respondToGuess(guessId, approved) {
    const guess = this.guesses.find(g => g.id === guessId);
    if (!guess) throw new Error('Guess not found.');

    guess.approved = approved;
    
    if (approved) {
      // Guess is correct! Advance to voting phase
      this.guesserId = guess.playerId;
      this.gameState = 'VOTING';
      this.lastEvent = `🎉 คำตอบถูกต้อง! คำปริศนาคือ "${this.targetWord}" โดยฝีมือทายของ ${guess.name}`;
      this.addMessage('System', this.lastEvent);
      this.addMessage('System', '⚠️ เข้าสู่เฟสจับผิด: ใครคือคนวงใน (Insider) ที่คอยช่วยอย่างน่าสงสัย? เริ่มการโหวตได้เลย!');
    } else {
      this.addMessage('System', `❌ คำทาย "${guess.text}" ของ ${guess.name} ยังไม่ใช่คำปริศนา.`);
    }
  }

  // Voting action
  votePlayer(voterId, targetId) {
    if (this.gameState !== 'VOTING') {
      throw new Error('Not in voting phase.');
    }
    const voter = this.players.find(p => p.id === voterId);
    if (!voter || voter.spectating) throw new Error('You cannot vote.');

    voter.votedFor = targetId;

    // Check if everyone voted
    const active = this.players.filter(p => !p.spectating);
    const votedCount = active.filter(p => p.votedFor !== null).length;

    if (votedCount === active.length) {
      this.tallyVotes();
    }
  }

  tallyVotes() {
    const active = this.players.filter(p => !p.spectating);
    const voteMap = {}; // targetId -> count

    active.forEach(p => {
      if (p.votedFor) {
        voteMap[p.votedFor] = (voteMap[p.votedFor] || 0) + 1;
      }
    });

    // Find highest voted
    let highestVotedId = null;
    let maxVotes = -1;
    let tie = false;

    Object.entries(voteMap).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        highestVotedId = id;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
      }
    });

    const insider = this.players.find(p => p.role === 'insider');
    
    // Tally rules:
    // If Insider is correctly voted out (highest voted is Insider), Commoners win.
    // If there is a tie or they voted out a Commoner, Insider wins.
    if (!tie && highestVotedId === insider.id) {
      this.winner = 'commoners';
      this.lastEvent = `จับกุมสำเร็จ! โหวตจับกุม ${insider.name} (Insider) สำเร็จ!`;
    } else {
      this.winner = 'insider';
      const votedTarget = this.players.find(p => p.id === highestVotedId);
      this.lastEvent = tie ? 
        `โหวตเสมอกัน! Insider (${insider.name}) รอดตัวไปและชนะ!` :
        `โหวตผิดตัว! จับกุม ${votedTarget?.name} (คนธรรมดา). Insider (${insider.name}) ชนะ!`;
    }

    this.gameState = 'GAME_OVER';
    this.addMessage('System', `จบเกม: ${this.lastEvent}`);
  }

  // Handle timer tick (called from server index.js)
  tickTimer() {
    if (this.gameState !== 'PLAYING') return;

    this.timerSeconds--;
    if (this.timerSeconds <= 0) {
      this.timerSeconds = 0;
      // Time out! Everyone loses (Insider wins by default because they didn't get caught)
      this.gameState = 'GAME_OVER';
      this.winner = 'insider';
      this.lastEvent = `หมดเวลาทาย! ทุกคนเดาคำศัพท์ไม่สำเร็จคำปริศนาคือ "${this.targetWord}". Insider ชนะ!`;
      this.addMessage('System', this.lastEvent);
    }
  }

  getClientState(playerId) {
    const me = this.players.find(p => p.id === playerId);
    const isMasterOrInsider = me?.role === 'master' || me?.role === 'insider' || this.gameState === 'GAME_OVER';

    return {
      id: this.id,
      gameType: this.gameType,
      gameState: this.gameState,
      winner: this.winner,
      messages: this.messages,
      lastEvent: this.lastEvent,
      category: this.category,
      timerSeconds: this.timerSeconds,
      guesses: this.guesses,
      guesserId: this.guesserId,
      // Target word is hidden from Commoners during Q&A
      targetWord: isMasterOrInsider ? this.targetWord : '???',
      players: this.players.map(p => {
        const isSelf = p.id === playerId;
        // Roles are hidden unless self, or game is over, or Sheriff (n/a for Insider)
        // Master role is public to everyone from start
        const showRole = isSelf || this.gameState === 'GAME_OVER' || p.role === 'master';

        return {
          id: p.id,
          name: p.name,
          role: showRole ? p.role : 'hidden',
          votedFor: p.votedFor,
          spectating: p.spectating,
          isOnline: p.isOnline,
          isHost: p.isHost
        };
      })
    };
  }
}
