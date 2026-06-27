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
  { civilian: 'ช้อน (Spoon)', undercover: 'ทัพพี (Ladle)' },
  { civilian: 'สิงโต (Lion)', undercover: 'เสือ (Tiger)' },
  { civilian: 'อินทรี (Eagle)', undercover: 'เหยี่ยว (Falcon)' },
  { civilian: 'โลมา (Dolphin)', undercover: 'วาฬ (Whale)' },
  { civilian: 'ผีเสื้อ (Butterfly)', undercover: 'ผีเสื้อกลางคืน (Moth)' },
  { civilian: 'ราเมน (Ramen)', undercover: 'อุด้ง (Udon)' },
  { civilian: 'ซูชิ (Sushi)', undercover: 'ซาชิมิ (Sashimi)' },
  { civilian: 'แว่นกันแดด (Sunglasses)', undercover: 'แว่นว่ายน้ำ (Goggles)' },
  { civilian: 'กระเป๋าถือ (Handbag)', undercover: 'กระเป๋าเป้ (Backpack)' },
  { civilian: 'ดินสอสี (Crayon)', undercover: 'สีชอล์ก (Chalk)' },
  { civilian: 'ภูเขา (Mountain)', undercover: 'เนินเขา (Hill)' },
  { civilian: 'ทะเลทราย (Desert)', undercover: 'โอเอซิส (Oasis)' },
  { civilian: 'ป่าไม้ (Forest)', undercover: 'ป่าดิบชื้น (Jungle)' },
  { civilian: 'ชายหาด (Beach)', undercover: 'เกาะ (Island)' },
  { civilian: 'วิ่ง (Running)', undercover: 'เดินเร็ว (Power Walking)' },
  { civilian: 'ว่ายน้ำ (Swimming)', undercover: 'ดำน้ำ (Diving)' },
  { civilian: 'อ่านหนังสือ (Reading)', undercover: 'เขียนหนังสือ (Writing)' },
  { civilian: 'เทนนิส (Tennis)', undercover: 'แบดมินตัน (Badminton)' },
  { civilian: 'ฟุตซอล (Futsal)', undercover: 'ฟุตบอล (Football)' },
  { civilian: 'กอล์ฟ (Golf)', undercover: 'มินิกอล์ฟ (Mini-golf)' },
  { civilian: 'สมาร์ทวอทช์ (Smartwatch)', undercover: 'สายรัดข้อมือสุขภาพ (Fitness Tracker)' },
  { civilian: 'เพลย์สเตชัน (PlayStation)', undercover: 'เอ็กซ์บ็อกซ์ (Xbox)' },
  { civilian: 'แอนดรอยด์ (Android)', undercover: 'ไอโอเอส (iOS)' },
  { civilian: 'เนย (Butter)', undercover: 'ชีส (Cheese)' },
  { civilian: 'นม (Milk)', undercover: 'โยเกิร์ต (Yogurt)' },
  { civilian: 'น้ำส้ม (Orange Juice)', undercover: 'น้ำมะนาว (Lemonade)' },
  { civilian: 'ช็อกโกแลต (Chocolate)', undercover: 'ลูกอม (Candy)' },
  { civilian: 'คุกกี้ (Cookie)', undercover: 'เค้ก (Cake)' },
  { civilian: 'ไอศกรีม (Ice Cream)', undercover: 'หวานเย็น (Sorbet)' },
  { civilian: 'มันฝรั่งทอด (French Fries)', undercover: 'มันฝรั่งแผ่น (Potato Chips)' },
  { civilian: 'มะเขือเทศ (Tomato)', undercover: 'ซอสมะเขือเทศ (Ketchup)' },
  { civilian: 'กระเทียม (Garlic)', undercover: 'หอมแดง (Shallot)' },
  { civilian: 'พริก (Chili)', undercover: 'พริกไทย (Pepper)' },
  { civilian: 'เกลือ (Salt)', undercover: 'น้ำตาล (Sugar)' },
  { civilian: 'น้ำปลา (Fish Sauce)', undercover: 'ซีอิ๊ว (Soy Sauce)' },
  { civilian: 'น้ำผึ้ง (Honey)', undercover: 'น้ำเชื่อม (Syrup)' },
  { civilian: 'ขนมปังปิ้ง (Toast)', undercover: 'วาฟเฟิล (Waffle)' },
  { civilian: 'โดนัท (Donut)', undercover: 'พาย (Pie)' },
  { civilian: 'ซุป (Soup)', undercover: 'แกง (Curry)' },
  { civilian: 'กุ้ง (Shrimp)', undercover: 'ปู (Crab)' },
  { civilian: 'หอยนางรม (Oyster)', undercover: 'หอยแมลงภู่ (Mussel)' },
  { civilian: 'หมึก (Squid)', undercover: 'ปลา (Fish)' },
  { civilian: 'ไก่ทอด (Fried Chicken)', undercover: 'ย่างเกาหลี (Korean BBQ)' },
  { civilian: 'สเต็ก (Steak)', undercover: 'ลูกชิ้น (Meatball)' },
  { civilian: 'ก๋วยเตี๋ยว (Noodles)', undercover: 'พาสต้า (Pasta)' },
  { civilian: 'ข้าวผัด (Fried Rice)', undercover: 'ข้าวต้ม (Rice Porridge)' },
  { civilian: 'น้ำแร่ (Mineral Water)', undercover: 'น้ำโซดา (Soda Water)' },
  { civilian: 'แชมเปญ (Champagne)', undercover: 'สปาร์กลิ้งไวน์ (Sparkling Wine)' },
  { civilian: 'วิสกี้ (Whiskey)', undercover: 'วอดก้า (Vodka)' },
  { civilian: 'นมถั่วเหลือง (Soy Milk)', undercover: 'นมอัลมอนด์ (Almond Milk)' },
  { civilian: 'ชาเขียว (Green Tea)', undercover: 'ชาไทย (Thai Milk Tea)' },
  { civilian: 'มะพร้าว (Coconut)', undercover: 'สับปะรด (Pineapple)' },
  { civilian: 'แตงโม (Watermelon)', undercover: 'แคนตาลูป (Cantaloupe)' },
  { civilian: 'สตรอเบอร์รี่ (Strawberry)', undercover: 'บลูเบอร์รี่ (Blueberry)' },
  { civilian: 'องุ่น (Grape)', undercover: 'ลูกเกด (Raisin)' },
  { civilian: 'แอปริคอท (Apricot)', undercover: 'ลูกพีช (Peach)' },
  { civilian: 'ทุเรียน (Durian)', undercover: 'ขนุน (Jackfruit)' },
  { civilian: 'มะละกอ (Papaya)', undercover: 'มะม่วง (Mango)' },
  { civilian: 'แครอท (Carrot)', undercover: 'หัวไชเท้า (Radish)' },
  { civilian: 'บล็อกโคลี (Broccoli)', undercover: 'กะหล่ำดอก (Cauliflower)' },
  { civilian: 'เห็ด (Mushroom)', undercover: 'สาหร่าย (Seaweed)' },
  { civilian: 'แตงกวา (Cucumber)', undercover: 'บวบ (Zucchini)' },
  { civilian: 'ฟักทอง (Pumpkin)', undercover: 'มันเทศ (Sweet Potato)' },
  { civilian: 'สบู่เหลว (Body Wash)', undercover: 'สบู่ก้อน (Bar Soap)' },
  { civilian: 'ยาสีฟัน (Toothpaste)', undercover: 'น้ำยาบ้วนปาก (Mouthwash)' },
  { civilian: 'น้ำหอม (Perfume)', undercover: 'สเปรย์ระงับกลิ่นกาย (Deodorant)' },
  { civilian: 'ครีมกันแดด (Sunscreen)', undercover: 'โลชั่นบำรุงผิว (Body Lotion)' },
  { civilian: 'ผ้าเช็ดตัว (Towels)', undercover: 'ผ้าห่ม (Blanket)' },
  { civilian: 'หวี (Comb)', undercover: 'แปรงผม (Hairbrush)' },
  { civilian: 'กระจกเงา (Mirror)', undercover: 'รูปถ่าย (Photo)' },
  { civilian: 'ลิปสติก (Lipstick)', undercover: 'บลัชออน (Blush)' },
  { civilian: 'มาสคาร่า (Mascara)', undercover: 'อายไลเนอร์ (Eyeliner)' },
  { civilian: 'ไดร์เป่าผม (Hairdryer)', undercover: 'เครื่องหนีบผม (Hair Straightener)' },
  { civilian: 'เตียงนอน (Bed)', undercover: 'เปลญวน (Hammock)' },
  { civilian: 'โคมไฟ (Lamp)', undercover: 'ไฟฉาย (Flashlight)' },
  { civilian: 'ตู้เสื้อผ้า (Wardrobe)', undercover: 'ราวแขวนผ้า (Clothes Rack)' },
  { civilian: 'โต๊ะทำงาน (Desk)', undercover: 'โต๊ะอาหาร (Dining Table)' },
  { civilian: 'ไม้กวาด (Broom)', undercover: 'เครื่องดูดฝุ่น (Vacuum Cleaner)' },
  { civilian: 'ถังขยะ (Trash Can)', undercover: 'ถุงขยะ (Trash Bag)' },
  { civilian: 'กุญแจ (Key)', undercover: 'แม่กุญแจ (Padlock)' },
  { civilian: 'ร่ม (Umbrella)', undercover: 'เสื้อกันฝน (Raincoat)' },
  { civilian: 'พรมเช็ดเท้า (Doormat)', undercover: 'พรมปูพื้น (Rug)' },
  { civilian: 'เครื่องซักผ้า (Washing Machine)', undercover: 'เครื่องอบผ้า (Dryer)' },
  { civilian: 'เตารีด (Iron)', undercover: 'เครื่องพ่นไอน้ำ (Steamer)' },
  { civilian: 'จาน (Plate)', undercover: 'ชาม (Bowl)' },
  { civilian: 'แก้วน้ำ (Glass)', undercover: 'ถ้วยกาแฟ (Mug)' },
  { civilian: 'กระทะ (Pan)', undercover: 'หม้อ (Pot)' },
  { civilian: 'เตาอบ (Oven)', undercover: 'ไมโครเวฟ (Microwave)' },
  { civilian: 'เครื่องปั่น (Blender)', undercover: 'เครื่องคั้นน้ำผลไม้ (Juicer)' },
  { civilian: 'มีดทำครัว (Chef Knife)', undercover: 'กรรไกรตัดอาหาร (Kitchen Shears)' },
  { civilian: 'ตู้เย็น (Refrigerator)', undercover: 'ตู้แช่แข็ง (Freezer)' },
  { civilian: 'โทรทัศน์ (Television)', undercover: 'โปรเจคเตอร์ (Projector)' },
  { civilian: 'ลำโพง (Speaker)', undercover: 'หูฟัง (Headphones)' },
  { civilian: 'แป้นพิมพ์ (Keyboard)', undercover: 'เมาส์ (Mouse)' },
  { civilian: 'แท็บเล็ต (Tablet)', undercover: 'สมาร์ทโฟน (Smartphone)' },
  { civilian: 'เครื่องพิมพ์ (Printer)', undercover: 'เครื่องสแกน (Scanner)' },
  { civilian: 'กล้องถ่ายรูป (Camera)', undercover: 'กล้องวิดีโอ (Camcorder)' },
  { civilian: 'ฮาร์ดดิสก์ (Hard Drive)', undercover: 'แฟลชไดรฟ์ (USB Flash Drive)' },
  { civilian: 'เราเตอร์ (Router)', undercover: 'โมเด็ม (Modem)' },
  { civilian: 'สายชาร์จ (Charging Cable)', undercover: 'พาวเวอร์แบงค์ (Power Bank)' },
  { civilian: 'เครื่องดูดควัน (Range Hood)', undercover: 'พัดลมระบายอากาศ (Exhaust Fan)' },
  { civilian: 'เครื่องล้างจาน (Dishwasher)', undercover: 'อ่างล้างจาน (Kitchen Sink)' },
  { civilian: 'เครื่องทำน้ำอุ่น (Water Heater)', undercover: 'หม้อต้มน้ำ (Boiler)' },
  { civilian: 'เครื่องใช้ไฟฟ้า (Appliance)', undercover: 'แกดเจ็ต (Gadget)' },
  { civilian: 'หุ่นยนต์ดูดฝุ่น (Robot Vacuum)', undercover: 'โดรน (Drone)' },
  { civilian: 'รถไฟฟ้า (EV Car)', undercover: 'รถยนต์ไฮบริด (Hybrid Car)' },
  { civilian: 'รถไฟใต้ดิน (Subway)', undercover: 'รถไฟลอยฟ้า (Skytrain)' },
  { civilian: 'เรือใบ (Sailboat)', undercover: 'เรือยอชท์ (Yacht)' },
  { civilian: 'รถตุ๊กตุ๊ก (Tuk Tuk)', undercover: 'รถสองแถว (Songthaew)' },
  { civilian: 'รถแท็กซี่ (Taxi)', undercover: 'แกร็บ (Grab Car)' },
  { civilian: 'รถดับเพลิง (Fire Truck)', undercover: 'รถพยาบาล (Ambulance)' },
  { civilian: 'ทางด่วน (Expressway)', undercover: 'มอเตอร์เวย์ (Motorway)' },
  { civilian: 'สะพาน (Bridge)', undercover: 'อุโมงค์ (Tunnel)' },
  { civilian: 'สี่แยก (Intersection)', undercover: 'วงเวียน (Roundabout)' },
  { civilian: 'ตั๋วรถไฟ (Train Ticket)', undercover: 'บอร์ดดิ้งพาส (Boarding Pass)' },
  { civilian: 'กระเป๋าตังค์ (Wallet)', undercover: 'กระเป๋าใส่บัตร (Cardholder)' }
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

    console.log(`[Undercover] Starting game. Room ID: ${this.id}. Selected word pair:`, selectedPair, `History count: ${this.usedPairsHistory.length}`);

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
