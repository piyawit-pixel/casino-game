const WORD_LIST = [
  // --- สิ่งมีชีวิต / สัตว์ ---
  { word: 'ไดโนเสาร์ (Dinosaur)', category: 'สิ่งมีชีวิต' },
  { word: 'แมว (Cat)', category: 'สัตว์เลี้ยง' },
  { word: 'สุนัข (Dog)', category: 'สัตว์เลี้ยง' },
  { word: 'ปลาวาฬ (Whale)', category: 'สัตว์น้ำ' },
  { word: 'ยีราฟ (Giraffe)', category: 'สัตว์บก' },
  { word: 'แพนด้า (Panda)', category: 'สัตว์บก' },
  { word: 'ผึ้ง (Bee)', category: 'แมลง' },
  { word: 'ฉลาม (Shark)', category: 'สัตว์น้ำ' },
  { word: 'นกอินทรี (Eagle)', category: 'สัตว์ปีก' },
  { word: 'ค้างคาว (Bat)', category: 'สัตว์บก' },
  { word: 'ช้าง (Elephant)', category: 'สัตว์บก' },
  { word: 'สิงโต (Lion)', category: 'สัตว์ป่า' },
  { word: 'เสือ (Tiger)', category: 'สัตว์ป่า' },
  { word: 'จระเข้ (Crocodile)', category: 'สัตว์เลื้อยคลาน' },
  { word: 'งู (Snake)', category: 'สัตว์เลื้อยคลาน' },
  { word: 'กบ (Frog)', category: 'สัตว์สะเทินน้ำสะเทินบก' },
  { word: 'เพนกวิน (Penguin)', category: 'สัตว์ปีก' },

  // --- อาหาร / เครื่องดื่ม ---
  { word: 'พิซซ่า (Pizza)', category: 'อาหาร' },
  { word: 'แฮมเบอร์เกอร์ (Hamburger)', category: 'อาหาร' },
  { word: 'ชานมไข่มุก (Bubble Tea)', category: 'เครื่องดื่ม' },
  { word: 'กาแฟ (Coffee)', category: 'เครื่องดื่ม' },
  { word: 'ไอศกรีม (Ice Cream)', category: 'ของหวาน' },
  { word: 'ส้มตำ (Som Tum)', category: 'อาหาร' },
  { word: 'ต้มยำกุ้ง (Tom Yum Goong)', category: 'อาหาร' },
  { word: 'เบียร์ (Beer)', category: 'เครื่องดื่ม' },
  { word: 'ช็อกโกแลต (Chocolate)', category: 'ของหวาน' },
  { word: 'ทุเรียน (Durian)', category: 'ผลไม้' },
  { word: 'แตงโม (Watermelon)', category: 'ผลไม้' },
  { word: 'กล้วย (Banana)', category: 'ผลไม้' },
  { word: 'ซูชิ (Sushi)', category: 'อาหาร' },
  { word: 'บะหมี่กึ่งสำเร็จรูป (Instant Noodles)', category: 'อาหาร' },
  { word: 'ชีส (Cheese)', category: 'วัตถุดิบอาหาร' },

  // --- สิ่งของ / เครื่องใช้ ---
  { word: 'สมาร์ทโฟน (Smartphone)', category: 'เทคโนโลยี' },
  { word: 'แว่นตา (Glasses)', category: 'สิ่งของเครื่องใช้' },
  { word: 'ตู้เย็น (Refrigerator)', category: 'เครื่องใช้ไฟฟ้า' },
  { word: 'ยาสีฟัน (Toothpaste)', category: 'ของใช้ส่วนตัว' },
  { word: 'ร่ม (Umbrella)', category: 'สิ่งของเครื่องใช้' },
  { word: 'พัดลม (Fan)', category: 'เครื่องใช้ไฟฟ้า' },
  { word: 'นาฬิกาข้อมือ (Watch)', category: 'เครื่องประดับ' },
  { word: 'กระจกเงา (Mirror)', category: 'ของแต่งบ้าน' },
  { word: 'กระเป๋าตังค์ (Wallet)', category: 'ของใช้ส่วนตัว' },
  { word: 'แปรงสีฟัน (Toothbrush)', category: 'ของใช้ส่วนตัว' },
  { word: 'กุญแจ (Key)', category: 'สิ่งของเครื่องใช้' },
  { word: 'โคมไฟ (Lamp)', category: 'เครื่องใช้ไฟฟ้า' },
  { word: 'หมอน (Pillow)', category: 'เครื่องนอน' },
  { word: 'หนังสือ (Book)', category: 'สื่อสิ่งพิมพ์' },
  { word: 'เตาไมโครเวฟ (Microwave)', category: 'เครื่องใช้ไฟฟ้า' },
  { word: 'เครื่องซักผ้า (Washing Machine)', category: 'เครื่องใช้ไฟฟ้า' },

  // --- พาหนะ / คมนาคม ---
  { word: 'เครื่องบิน (Airplane)', category: 'พาหนะ' },
  { word: 'จักรยาน (Bicycle)', category: 'พาหนะ' },
  { word: 'รถไฟ (Train)', category: 'พาหนะ' },
  { word: 'เรือใบ (Sailboat)', category: 'พาหนะ' },
  { word: 'รถมอเตอร์ไซค์ (Motorcycle)', category: 'พาหนะ' },
  { word: 'รถดับเพลิง (Fire Truck)', category: 'พาหนะพิเศษ' },
  { word: 'เฮลิคอปเตอร์ (Helicopter)', category: 'พาหนะ' },
  { word: 'รถตู้ (Van)', category: 'พาหนะ' },
  { word: 'จรวด (Rocket)', category: 'ยานอวกาศ' },
  { word: 'รถไฟใต้ดิน (Subway)', category: 'พาหนะ' },

  // --- สถานที่ / ท่องเที่ยว ---
  { word: 'หอไอเฟล (Eiffel Tower)', category: 'สถานที่สำคัญ' },
  { word: 'โตเกียว (Tokyo)', category: 'เมืองหลวง' },
  { word: 'ภูเขาไฟ (Volcano)', category: 'ธรรมชาติ' },
  { word: 'ชายหาด (Beach)', category: 'แหล่งท่องเที่ยว' },
  { word: 'โรงเรียน (School)', category: 'สถานที่บริการสาธารณะ' },
  { word: 'โรงพยาบาล (Hospital)', category: 'สถานที่บริการสาธารณะ' },
  { word: 'สวนสนุก (Amusement Park)', category: 'สถานที่บันเทิง' },
  { word: 'พิพิธภัณฑ์ (Museum)', category: 'สถานที่ท่องเที่ยว' },
  { word: 'สนามบิน (Airport)', category: 'คมนาคม' },
  { word: 'วัด (Temple)', category: 'ศาสนสถาน' },
  { word: 'น้ำตก (Waterfall)', category: 'ธรรมชาติ' },
  { word: 'ทะเลทราย (Desert)', category: 'ธรรมชาติ' },
  { word: 'ห้องสมุด (Library)', category: 'สถานที่บริการสาธารณะ' },
  { word: 'กรุงเทพฯ (Bangkok)', category: 'เมืองหลวง' },

  // --- กีฬา / กิจกรรม ---
  { word: 'ฟุตบอล (Football)', category: 'กีฬา' },
  { word: 'บาสเกตบอล (Basketball)', category: 'กีฬา' },
  { word: 'ว่ายน้ำ (Swimming)', category: 'กีฬา / กิจกรรม' },
  { word: 'วิ่งมาราธอน (Marathon)', category: 'กีฬา' },
  { word: 'ตกปลา (Fishing)', category: 'กิจกรรมยามว่าง' },
  { word: 'ปีนเขา (Climbing)', category: 'กิจกรรมแอดเวนเจอร์' },
  { word: 'แบดมินตัน (Badminton)', category: 'กีฬา' },
  { word: 'กอล์ฟ (Golf)', category: 'กีฬา' },
  { word: 'โยคะ (Yoga)', category: 'การออกกำลังกาย' },
  { word: 'หมากรุก (Chess)', category: 'เกมกระดาน' },

  // --- อาชีพ ---
  { word: 'หมอ (Doctor)', category: 'อาชีพ' },
  { word: 'ครู (Teacher)', category: 'อาชีพ' },
  { word: 'ตำรวจ (Police)', category: 'อาชีพ' },
  { word: 'นักบิน (Pilot)', category: 'อาชีพ' },
  { word: 'พ่อครัว (Chef)', category: 'อาชีพ' },
  { word: 'ชาวนา (Farmer)', category: 'อาชีพ' },
  { word: 'นักร้อง (Singer)', category: 'อาชีพ' },
  { word: 'นักแสดง (Actor)', category: 'อาชีพ' },
  { word: 'วิศวกร (Engineer)', category: 'อาชีพ' },
  { word: 'นักดับเพลิง (Firefighter)', category: 'อาชีพ' },

  // --- วิทยาศาสตร์ / เทคโนโลยี / เบ็ดเตล็ด ---
  { word: 'อินเทอร์เน็ต (Internet)', category: 'เทคโนโลยี' },
  { word: 'ดวงอาทิตย์ (Sun)', category: 'ดาราศาสตร์' },
  { word: 'คอมพิวเตอร์ (Computer)', category: 'เทคโนโลยี' },
  { word: 'ปฏิทิน (Calendar)', category: 'เวลา' },
  { word: 'เหรียญ (Coin)', category: 'เงินตรา' },
  { word: 'กล้องถ่ายรูป (Camera)', category: 'สิ่งของ' },
  { word: 'เปียโน (Piano)', category: 'เครื่องดนตรี' },
  { word: 'กีตาร์ (Guitar)', category: 'เครื่องดนตรี' },
  { word: 'ดวงจันทร์ (Moon)', category: 'ดาราศาสตร์' },
  { word: 'สายรุ้ง (Rainbow)', category: 'ปรากฏการณ์ธรรมชาติ' }
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

    this.usedWordsHistory = []; // Tracks played secret words to prevent duplication
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
    let availableWords = WORD_LIST.filter(w => !this.usedWordsHistory.includes(w.word));
    if (availableWords.length === 0) {
      this.usedWordsHistory = [];
      availableWords = WORD_LIST;
    }
    const selected = availableWords[Math.floor(Math.random() * availableWords.length)];
    this.usedWordsHistory.push(selected.word);

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

  votePlayer(voterId, targetId) {
    if (this.gameState !== 'VOTING') {
      throw new Error('Not in voting phase.');
    }
    const voter = this.players.find(p => p.id === voterId);
    if (!voter || voter.spectating) throw new Error('You cannot vote.');

    voter.votedFor = targetId;

    // Check if everyone online voted
    const activeOnline = this.players.filter(p => !p.spectating && p.isOnline);
    const votedCount = activeOnline.filter(p => p.votedFor !== null).length;

    if (votedCount >= activeOnline.length) {
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
