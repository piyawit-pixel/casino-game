export class CheckersRoom {
  constructor(id) {
    this.id = id;
    this.gameType = 'checkers';
    this.players = []; // { id, name, color: 'red'|'black', isOnline, isHost }
    this.gameState = 'WAITING'; // WAITING, PLAYING, GAME_OVER
    this.board = this.createInitialBoard();
    this.turn = 'red'; // 'red' goes first
    this.winner = null;
    this.messages = [];
    this.lastMove = null; // { from: {row, col}, to: {row, col} }
    this.activeJumpingPiece = null; // Used to track a piece in the middle of a multi-jump
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

  createInitialBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Thai checkers: 8 pieces per player, occupying first 2 rows
    // Red (Player 1) at bottom rows 0 and 1
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          board[r][c] = { color: 'red', type: 'pawn' };
        }
      }
    }

    // Black (Player 2) at top rows 6 and 7
    for (let r = 6; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          board[r][c] = { color: 'black', type: 'pawn' };
        }
      }
    }

    return board;
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
    let color = null;
    let spectating = true;

    // Assign colors to the first 2 players
    const activePlayers = this.players.filter(p => !p.spectating);
    if (activePlayers.length === 0) {
      color = 'red';
      spectating = false;
    } else if (activePlayers.length === 1) {
      color = 'black';
      spectating = false;
    }

    const newPlayer = {
      id,
      name,
      color,
      isOnline: true,
      spectating,
      isHost
    };

    this.players.push(newPlayer);
    this.addMessage('System', `${name} joined as ${spectating ? 'Spectator' : color === 'red' ? 'Red Player' : 'Black Player'}.`);
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
        this.reassignColors();
      }
    }
  }

  reassignColors() {
    this.players.forEach(p => { p.color = null; p.spectating = true; });
    let activeAssigned = 0;
    this.players.forEach(p => {
      if (p.isOnline && activeAssigned < 2) {
        p.color = activeAssigned === 0 ? 'red' : 'black';
        p.spectating = false;
        activeAssigned++;
      }
    });
  }

  startGame() {
    const activePlayers = this.players.filter(p => !p.spectating && p.isOnline);
    if (activePlayers.length < 2) {
      throw new Error('Need 2 players to start checkers.');
    }
    this.board = this.createInitialBoard();
    this.turn = 'red';
    this.winner = null;
    this.gameState = 'PLAYING';
    this.lastMove = null;
    this.activeJumpingPiece = null;
    this.addMessage('System', 'Checkers game started! Red turn.');
  }

  // Get all valid moves for a player
  getValidMoves(color) {
    const jumps = [];
    const standardMoves = [];

    // If we are in the middle of a multi-jump, only the active jumping piece can move
    if (this.activeJumpingPiece) {
      const { row, col } = this.activeJumpingPiece;
      const pieceJumps = this.getPieceJumps(row, col);
      return pieceJumps;
    }

    // Scan the board for all pieces of the active color
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.color === color) {
          const pieceJumps = this.getPieceJumps(r, c);
          jumps.push(...pieceJumps);

          // Only calculate standard moves if no jumps are active (forced capture rule)
          if (jumps.length === 0) {
            const pieceMoves = this.getPieceStandardMoves(r, c);
            standardMoves.push(...pieceMoves);
          }
        }
      }
    }

    // Force captures: if jumps are available, only returns jumps
    return jumps.length > 0 ? jumps : standardMoves;
  }

  // Standard moves for a piece (no captures)
  getPieceStandardMoves(row, col) {
    const piece = this.board[row][col];
    const moves = [];
    if (!piece) return moves;

    const dirs = piece.type === 'king' 
      ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] // King moves all 4 diagonals
      : piece.color === 'red' 
        ? [[1, 1], [1, -1]]  // Red pawn moves up
        : [[-1, 1], [-1, -1]]; // Black pawn moves down

    if (piece.type === 'pawn') {
      for (const [dr, dc] of dirs) {
        const nr = row + dr;
        const nc = col + dc;
        if (this.isWithinBoard(nr, nc) && !this.board[nr][nc]) {
          moves.push({ from: { row, col }, to: { row: nr, col: nc }, isJump: false });
        }
      }
    } else if (piece.type === 'king') {
      // King can slide multiple open squares
      for (const [dr, dc] of dirs) {
        let nr = row + dr;
        let nc = col + dc;
        while (this.isWithinBoard(nr, nc) && !this.board[nr][nc]) {
          moves.push({ from: { row, col }, to: { row: nr, col: nc }, isJump: false });
          nr += dr;
          nc += dc;
        }
      }
    }

    return moves;
  }

  // Jump captures for a single piece
  getPieceJumps(row, col) {
    const piece = this.board[row][col];
    const jumps = [];
    if (!piece) return jumps;

    const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]]; // All pieces can jump diagonally

    if (piece.type === 'pawn') {
      for (const [dr, dc] of dirs) {
        // Thai checkers: Pawns only capture forward!
        // Red pawns jump forward (dr === 1), Black pawns jump backward/down (dr === -1)
        if (piece.color === 'red' && dr !== 1) continue;
        if (piece.color === 'black' && dr !== -1) continue;

        const nr = row + dr; // adjacent cell (opponent)
        const nc = col + dc;
        const fr = row + 2 * dr; // landing cell
        const fc = col + 2 * dc;

        if (this.isWithinBoard(fr, fc)) {
          const midPiece = this.board[nr][nc];
          const endPiece = this.board[fr][fc];
          if (midPiece && midPiece.color !== piece.color && !endPiece) {
            jumps.push({
              from: { row, col },
              to: { row: fr, col: fc },
              jumped: { row: nr, col: nc },
              isJump: true
            });
          }
        }
      }
    } else if (piece.type === 'king') {
      // King can slide and jump over an opponent piece at a distance
      for (const [dr, dc] of dirs) {
        let nr = row + dr;
        let nc = col + dc;
        
        // Find if there is an opponent piece along this diagonal
        let obstacle = null;
        let obstacleRow = null;
        let obstacleCol = null;
        let pathClear = true;

        while (this.isWithinBoard(nr, nc)) {
          const current = this.board[nr][nc];
          if (current) {
            if (current.color === piece.color) {
              // Blocked by friendly piece
              pathClear = false;
              break;
            } else {
              // Found opponent piece
              obstacle = current;
              obstacleRow = nr;
              obstacleCol = nc;
              break;
            }
          }
          nr += dr;
          nc += dc;
        }

        // If we found an opponent and path before it was clear, look for landing squares behind it
        if (pathClear && obstacle) {
          let lr = obstacleRow + dr;
          let lc = obstacleCol + dc;
          
          while (this.isWithinBoard(lr, lc) && !this.board[lr][lc]) {
            jumps.push({
              from: { row, col },
              to: { row: lr, col: lc },
              jumped: { row: obstacleRow, col: obstacleCol },
              isJump: true
            });
            lr += dr;
            lc += dc;
          }
        }
      }
    }

    return jumps;
  }

  isWithinBoard(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  // Handle a move request
  makeMove(playerId, from, to) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.spectating) {
      throw new Error('Spectators cannot play.');
    }
    if (player.color !== this.turn) {
      throw new Error("It's not your turn.");
    }

    const validMoves = this.getValidMoves(player.color);
    const chosenMove = validMoves.find(m => 
      m.from.row === from.row && m.from.col === from.col &&
      m.to.row === to.row && m.to.col === to.col
    );

    if (!chosenMove) {
      throw new Error('Invalid move.');
    }

    // Execute Move
    const piece = this.board[from.row][from.col];
    this.board[from.row][from.col] = null;
    this.board[to.row][to.col] = piece;

    // Handle Capture
    if (chosenMove.isJump) {
      const { row, col } = chosenMove.jumped;
      this.board[row][col] = null; // Remove captured piece
    }

    // Promote Pawn to King (ฮอส)
    // Red promotes at row 7, Black promotes at row 0
    if (piece.type === 'pawn') {
      if ((piece.color === 'red' && to.row === 7) || (piece.color === 'black' && to.row === 0)) {
        piece.type = 'king';
        this.addMessage('System', `${player.name} promoted a King!`);
      }
    }

    this.lastMove = { from, to };

    // Handle Multi-jumps (if piece captured, check if it can capture again)
    if (chosenMove.isJump) {
      const consecutiveJumps = this.getPieceJumps(to.row, to.col);
      if (consecutiveJumps.length > 0) {
        // Multi-jump is available, turn remains with active player
        this.activeJumpingPiece = { row: to.row, col: to.col };
        this.addMessage('System', `${player.name} must make another jump.`);
        return;
      }
    }

    // No more jumps available, switch turn
    this.activeJumpingPiece = null;
    this.turn = this.turn === 'red' ? 'black' : 'red';
    
    // Check win condition
    this.checkWinCondition();
  }

  checkWinCondition() {
    // A player wins if the opponent has no pieces left or no valid moves left
    const redMoves = this.getValidMoves('red');
    const blackMoves = this.getValidMoves('black');

    let redPieces = 0;
    let blackPieces = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p) {
          if (p.color === 'red') redPieces++;
          else blackPieces++;
        }
      }
    }

    if (redPieces === 0 || (this.turn === 'red' && redMoves.length === 0)) {
      this.winner = 'black';
      this.gameState = 'GAME_OVER';
      const winnerPlayer = this.players.find(p => p.color === 'black');
      this.addMessage('System', `${winnerPlayer ? winnerPlayer.name : 'Black'} wins checkers!`);
    } else if (blackPieces === 0 || (this.turn === 'black' && blackMoves.length === 0)) {
      this.winner = 'red';
      this.gameState = 'GAME_OVER';
      const winnerPlayer = this.players.find(p => p.color === 'red');
      this.addMessage('System', `${winnerPlayer ? winnerPlayer.name : 'Red'} wins checkers!`);
    }
  }

  getClientState(playerId) {
    const player = this.players.find(p => p.id === playerId);
    const playerColor = player ? player.color : null;
    const validMoves = playerColor === this.turn ? this.getValidMoves(playerColor) : [];

    return {
      id: this.id,
      gameType: this.gameType,
      gameState: this.gameState,
      board: this.board,
      turn: this.turn,
      winner: this.winner,
      messages: this.messages,
      lastMove: this.lastMove,
      validMoves, // Expose valid moves only to the player whose turn it is
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        isOnline: p.isOnline,
        spectating: p.spectating,
        isHost: p.isHost
      }))
    };
  }
}
