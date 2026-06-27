const WORD_PAIRS = [
  { civilian: 'แอปเปิ้ล (Apple)', undercover: 'ลูกแพร์ (Pear)' },
  { civilian: 'แมว (Cat)', undercover: 'สุนัข (Dog)' },
  { civilian: 'ส้อม (Fork)', undercover: 'ตะเกียบ (Chopsticks)' },
  { civilian: 'กาแฟ (Coffee)', undercover: 'ชา (Tea)' },
  { civilian: 'เป๊ปซี่ (Pepsi)', undercover: 'โค้ก (Coca-Cola)' },
  { civilian: 'ฟุตบอล (Football)', undercover: 'บาสเกตบอล (Basketball)' },
  { civilian: 'เครื่องบิน (Airplane)', undercover: 'เฮลิคอปเตอร์ (Helicopter)' },
  { civilian: 'โน้ตบุ๊ก (Laptop)', undercover: 'ไอแพด (iPad)' },
  { civilian: 'เบียร์ (Beer)', undercover: 'ไวน์ (Wine)' },
  { civilian: 'ทะเล (Sea)', undercover: 'น้ำตก (Waterfall)' },
  { civilian: 'หนังสือพิมพ์ (Newspaper)', undercover: 'นิตยสาร (Magazine)' },
  { civilian: 'เก้าอี้ (Chair)', undercover: 'โซฟา (Sofa)' },
  { civilian: 'กระจก (Mirror)', undercover: 'หน้าต่าง (Window)' },
  { civilian: 'นาฬิกาข้อมือ (Watch)', undercover: 'นาฬิกาปลุก (Alarm Clock)' },
  { civilian: 'รถยนต์ (Car)', undercover: 'รถมอเตอร์ไซค์ (Motorcycle)' },
  { civilian: 'ปากกา (Pen)', undercover: 'ดินสอ (Pencil)' },
  { civilian: 'แชมพู (Shampoo)', undercover: 'สบู่ (Soap)' },
  { civilian: 'หมอน (Pillow)', undercover: 'ผ้าห่ม (Blanket)' },
  { civilian: 'พิซซ่า (Pizza)', undercover: 'ขนมปัง (Bread)' },
  { civilian: 'โรงภาพยนตร์ (Cinema)', undercover: 'โรงละคร (Theater)' },
  { civilian: 'ส้ม (Orange)', undercover: 'มะนาว (Lemon)' },
  { civilian: 'ทองคำ (Gold)', undercover: 'เงิน (Silver)' },
  { civilian: 'น้ำแข็ง (Ice)', undercover: 'หิมะ (Snow)' },
  { civilian: 'กระดาษ (Paper)', undercover: 'สมุด (Notebook)' },
  { civilian: 'พัดลม (Fan)', undercover: 'เครื่องปรับอากาศ (Air Conditioner)' },
  { civilian: 'จักรยาน (Bicycle)', undercover: 'สกู๊ตเตอร์ (Scooter)' },
  { civilian: 'กุหลาบ (Rose)', undercover: 'ทานตะวัน (Sunflower)' },
  { civilian: 'กล้วย (Banana)', undercover: 'มะม่วง (Mango)' },
  { civilian: 'กระเป๋าเป้ (Backpack)', undercover: 'กระเป๋าเดินทาง (Suitcase)' },
  { civilian: 'รองเท้าผ้าใบ (Sneakers)', undercover: 'รองเท้าแตะ (Sandals)' },
  { civilian: 'สระน้ำ (Pool)', undercover: 'อ่างอาบน้ำ (Bathtub)' },
  { civilian: 'แฮมเบอร์เกอร์ (Hamburger)', undercover: 'แซนด์วิช (Sandwich)' },
  { civilian: 'แปรงสีฟัน (Toothbrush)', undercover: 'ยาสีฟัน (Toothpaste)' },
  { civilian: 'โรงเรียน (School)', undercover: 'มหาวิทยาลัย (University)' },
  { civilian: 'ช้อน (Spoon)', undercover: 'ทัพพี (Ladle)' }
];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class UndercoverRoom {
  constructor(id) {
    this.id = id;
    this.gameType = 'undercover';
    this.players = []; // { id, name, role, word, description: '', isDead, votedFor, spectating, isOnline, isHost }
    this.gameState = 'WAITING'; // WAITING, PLAYING, VOTING, MR_WHITE_GUESSING, GAME_OVER
    this.turnIndex = 0;
    this.usedPairsHistory = []; // Keeps track of already played words to avoid repeat
    this.winner = null; // 'civilians' | 'undercover_white'
    this.messages = [];
    this.lastEvent = null;

    // Secret words details
    this.civilianWord = '';
    this.undercoverWord = '';

    // Mr White guessing properties
    this.mrWhiteGuesserId = null;
    this.mrWhiteGuesses = []; // list of words guessed
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
      word: '',
      description: '',
      isDead: false,
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
      } else {
        if (!p.isDead) {
          this.eliminatePlayer(p.id, true);
        }
      }
    }
  }

  startGame() {
    const active = this.players.filter(p => p.isOnline);
    if (active.length < 3) {
      throw new Error('Need at least 3 players to start Undercover.');
    }

    this.gameState = 'PLAYING';
    this.winner = null;
    this.mrWhiteGuesserId = null;
    this.mrWhiteGuesses = [];

    // 1. Get a fresh word pair that hasn't been used yet
    let availablePairs = WORD_PAIRS.filter(p => !this.usedPairsHistory.includes(p.civilian));
    if (availablePairs.length === 0) {
      // Clear history when all words have been played once
      this.usedPairsHistory = [];
      availablePairs = WORD_PAIRS;
    }

    const selectedPair = availablePairs[Math.floor(Math.random() * availablePairs.length)];
    this.usedPairsHistory.push(selectedPair.civilian);

    this.civilianWord = selectedPair.civilian;
    this.undercoverWord = selectedPair.undercover;

    // 2. Distribute Roles
    // 3 Players: 2 Civilian, 1 Undercover
    // 4 Players: 2 Civilian, 1 Undercover, 1 Mr. White
    // 5 Players: 3 Civilian, 1 Undercover, 1 Mr. White
    // 6 Players: 4 Civilian, 1 Undercover, 1 Mr. White
    const count = active.length;
    const roles = [];
    roles.push('undercover');
    if (count >= 4) roles.push('white');
    
    const civilianCount = count - roles.length;
    for (let i = 0; i < civilianCount; i++) {
      roles.push('civilian');
    }

    const shuffledRoles = shuffle(roles);

    this.players.forEach(p => {
      p.spectating = !p.isOnline;
      p.votedFor = null;
      p.description = '';
      p.isDead = false;

      if (p.spectating) return;

      p.role = shuffledRoles.pop();
      if (p.role === 'civilian') p.word = this.civilianWord;
      else if (p.role === 'undercover') p.word = this.undercoverWord;
      else p.word = '???'; // Mr White has no word
    });

    // 3. Find first player index
    const living = this.players.filter(p => !p.spectating && !p.isDead);
    this.turnIndex = this.players.findIndex(p => p.id === living[0].id);

    this.lastEvent = `เริ่มเกม! คำใบ้วนแรก ตาของ ${this.players[this.turnIndex].name}`;
    this.addMessage('System', this.lastEvent);
  }

  // Active player submits their description word/phrase
  submitDescription(playerId, text) {
    const activePlayer = this.players[this.turnIndex];
    if (activePlayer.id !== playerId || this.gameState !== 'PLAYING') {
      throw new Error("It is not your turn to describe.");
    }

    if (!text || text.trim() === '') {
      throw new Error("Description cannot be empty.");
    }

    activePlayer.description = text.trim();
    this.lastEvent = `${activePlayer.name} อธิบายว่า: "${activePlayer.description}"`;
    this.addMessage('System', this.lastEvent);

    // Advance to next describer
    const living = this.players.filter(p => !p.spectating && !p.isDead);
    const livingIndex = living.findIndex(p => p.id === activePlayer.id);

    if (livingIndex < living.length - 1) {
      const nextPlayer = living[livingIndex + 1];
      this.turnIndex = this.players.findIndex(p => p.id === nextPlayer.id);
    } else {
      // Everyone has described. Enter voting phase
      this.gameState = 'VOTING';
      this.players.forEach(p => p.votedFor = null);
      this.lastEvent = 'ทุกคนใบ้คำครบแล้ว! เริ่มการโภวตจับผิดตัวตนสปาย';
      this.addMessage('System', this.lastEvent);
    }
  }

  // Vote to eliminate a player
  votePlayer(voterId, targetId) {
    if (this.gameState !== 'VOTING') {
      throw new Error("Not in voting phase.");
    }

    const voter = this.players.find(p => p.id === voterId);
    if (!voter || voter.spectating || voter.isDead) throw new Error("You cannot vote.");

    voter.votedFor = targetId;

    const living = this.players.filter(p => !p.spectating && !p.isDead);
    const votedCount = living.filter(p => p.votedFor !== null).length;

    if (votedCount === living.length) {
      this.tallyVotes();
    }
  }

  tallyVotes() {
    const living = this.players.filter(p => !p.spectating && !p.isDead);
    const voteMap = {}; // targetId -> count

    living.forEach(p => {
      if (p.votedFor) {
        voteMap[p.votedFor] = (voteMap[p.votedFor] || 0) + 1;
      }
    });

    let highestId = null;
    let maxVotes = -1;
    let tie = false;

    Object.entries(voteMap).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        highestId = id;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
      }
    });

    if (tie) {
      this.addMessage('System', '⚠️ โหวตเสมอกัน! ไม่มีใครโดนกำจัดในรอบนี้ เริ่มรอบใบ้คำถัดไป.');
      this.startNextRound();
    } else {
      this.eliminatePlayer(highestId);
    }
  }

  eliminatePlayer(playerId, disconnected = false) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    player.isDead = true;
    this.addMessage('System', `☠️ ${player.name} โดนโหวตคัดออก! บทบาทคือ: ${player.role.toUpperCase()}`);

    // Check special case: if Mr. White is eliminated, they get 1 final chance to guess the civilian word
    if (player.role === 'white' && !disconnected) {
      this.gameState = 'MR_WHITE_GUESSING';
      this.mrWhiteGuesserId = player.id;
      this.lastEvent = `👽 ${player.name} คือ Mr. White! โอกาสสุดท้ายในการทายรหัสคำของคนธรรมดา`;
      this.addMessage('System', this.lastEvent);
      return;
    }

    this.checkWinCondition();
  }

  // Mr White tries to guess the civilian word
  guessCivilianWord(playerId, guessText) {
    if (this.gameState !== 'MR_WHITE_GUESSING' || this.mrWhiteGuesserId !== playerId) {
      throw new Error("You cannot submit a guess.");
    }

    const guess = guessText.trim();
    this.mrWhiteGuesses.push(guess);

    // Automated matching logic:
    // Extract words (e.g. from "แอปเปิ้ล (Apple)")
    // Check if the guess word is inside the civilian word case-insensitive
    const cleanWord = this.civilianWord.toLowerCase();
    const cleanGuess = guess.toLowerCase();
    
    // Split by brackets or space to get individual English / Thai subwords
    const subwords = cleanWord.split(/[\s()]+/).filter(Boolean);
    const isCorrect = subwords.some(sw => sw === cleanGuess || cleanGuess.includes(sw));

    if (isCorrect) {
      // Mr White wins!
      this.winner = 'undercover_white';
      this.gameState = 'GAME_OVER';
      const player = this.players.find(p => p.id === playerId);
      this.lastEvent = `🏆 ${player.name} (Mr. White) ทายคำถูก! คำปริศนาคือ "${this.civilianWord}". ฝั่งสายลับ/คนใบ้ชนะ!`;
      this.addMessage('System', this.lastEvent);
    } else {
      // Wrong guess! Mr White is officially eliminated and we check other win conditions
      this.addMessage('System', `❌ Mr. White ทายว่า "${guess}" ซึ่งยังไม่ถูกต้อง.`);
      this.checkWinCondition();
    }
  }

  checkWinCondition() {
    const living = this.players.filter(p => !p.spectating && !p.isDead);
    
    const civilians = living.filter(p => p.role === 'civilian');
    const undercovers = living.filter(p => p.role === 'undercover');
    const whites = living.filter(p => p.role === 'white');

    // 1. Civilians win if all Undercovers and Mr. Whites are dead
    if (undercovers.length === 0 && whites.length === 0) {
      this.winner = 'civilians';
      this.gameState = 'GAME_OVER';
      this.lastEvent = `🏆 ฝั่งคนธรรมดา (Civilians) ชนะ! กำจัดสปายและคนใบ้หมดสิ้น คำปริศนาคือ "${this.civilianWord}"`;
      this.addMessage('System', this.lastEvent);
      return;
    }

    // 2. Undercover / White wins if only 2 players remain and at least one is not Civilian
    if (living.length <= 2) {
      this.winner = 'undercover_white';
      this.gameState = 'GAME_OVER';
      this.lastEvent = `🏆 ฝั่งสายลับ (Undercovers/Mr. White) ชนะ! หลอกล่อจนเหลือรอดเป็นคนสุดท้ายสำเร็จ`;
      this.addMessage('System', this.lastEvent);
      return;
    }

    // Otherwise, start the next round of description
    this.startNextRound();
  }

  startNextRound() {
    this.gameState = 'PLAYING';
    
    // Clear descriptions
    this.players.forEach(p => {
      p.description = '';
      p.votedFor = null;
    });

    // Reset turn index to first living player
    const living = this.players.filter(p => !p.spectating && !p.isDead);
    this.turnIndex = this.players.findIndex(p => p.id === living[0].id);

    this.lastEvent = `เริ่มคำใบ้รอบใหม่! ตาของ ${this.players[this.turnIndex].name}`;
    this.addMessage('System', this.lastEvent);
  }

  getClientState(playerId) {
    const me = this.players.find(p => p.id === playerId);
    
    // Word visibility:
    // Show word to owner of word
    // Show civilian word to other civilians/undercovers? No! Undercover gets their own word.
    // Mr White gets "???"
    // On Game Over, reveal civilian/undercover words to everyone.
    return {
      id: this.id,
      gameType: this.gameType,
      gameState: this.gameState,
      turnIndex: this.turnIndex,
      winner: this.winner,
      messages: this.messages,
      lastEvent: this.lastEvent,
      civilianWord: this.gameState === 'GAME_OVER' ? this.civilianWord : 'hidden',
      undercoverWord: this.gameState === 'GAME_OVER' ? this.undercoverWord : 'hidden',
      mrWhiteGuesserId: this.mrWhiteGuesserId,
      mrWhiteGuesses: this.mrWhiteGuesses,
      players: this.players.map(p => {
        const isSelf = p.id === playerId;
        
        let displayWord = '???';
        if (isSelf && !p.spectating) {
          displayWord = p.word;
        } else if (this.gameState === 'GAME_OVER') {
          displayWord = p.word;
        }

        const showRole = isSelf || this.gameState === 'GAME_OVER';

        return {
          id: p.id,
          name: p.name,
          role: showRole ? p.role : 'hidden',
          word: displayWord,
          description: p.description,
          isDead: p.isDead,
          votedFor: p.votedFor,
          spectating: p.spectating,
          isOnline: p.isOnline,
          isHost: p.isHost
        };
      })
    };
  }
}
