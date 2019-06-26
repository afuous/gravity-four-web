(function() {

  var getElem = function(id) {
    return document.getElementById(id);
  };

  var canvas = getElem("canvas");
  var ctx = canvas.getContext("2d");

  canvas.width = 600;
  canvas.height = 600;

  ctx.fillCircle = function(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.drawLine = function(startX, startY, endX, endY) {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  };

  var EMPTY = 0;
  var RED = 1;
  var BLACK = 2;

  var gameState;
  var numRows;
  var numCols;
  function clearBoard() {
    gameState = [];
    numRows = 6;
    numCols = 7;
    for (var r = 0; r < numRows; r++) {
      var row = [];
      for (var c = 0; c < numCols; c++) {
        row.push(EMPTY);
      }
      gameState.push(row);
    }
  }
  clearBoard();

  var lastUpdate;

  var fps = 60;

  document.oncontextmenu = function() {
    return false;
  };

  function rotatePoint(x, y, angle) {
    var relX = x - boardMidX;
    var relY = boardMidY - y;
    var r = Math.sqrt(relX * relX + relY * relY);
    var theta = Math.atan2(relY, relX);
    theta += angle;
    relX = r * Math.cos(theta);
    relY = r * Math.sin(theta);
    return {
      x: relX + boardMidX,
      y: boardMidY - relY,
    };
  }

  var boardMidX = canvas.width / 2;
  var boardMidY = canvas.height / 2;
  var squareLength = 60;

  function draw(options) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    options = options || {};
    angle = options.angle || 0;
    var old = {};
    if (angle != 0) {
      old.arc = ctx.arc.bind(ctx);
      old.moveTo = ctx.moveTo.bind(ctx);
      old.lineTo = ctx.lineTo.bind(ctx);
      ctx.arc = function(x, y, r, startAngle, endAngle) {
        var pt = rotatePoint(x, y, angle);
        old.arc(pt.x, pt.y, r, startAngle, endAngle);
      };
      ctx.moveTo = function(x, y) {
        var pt = rotatePoint(x, y, angle);
        old.moveTo(pt.x, pt.y);
      };
      ctx.lineTo = function(x, y) {
        var pt = rotatePoint(x, y, angle);
        old.lineTo(pt.x, pt.y);
      };
    }

    var halfLenX = squareLength * numCols / 2;
    var halfLenY = squareLength * numRows / 2;

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;

    for (var i = 0; i < numRows + 1; i++) {
      var y = boardMidY - halfLenY + squareLength * i;
      ctx.drawLine(boardMidX - halfLenX, y, boardMidX + halfLenX, y);
    }
    for (var j = 0; j < numCols + 1; j++) {
      var x = boardMidX - halfLenX + squareLength * j;
      ctx.drawLine(x, boardMidY - halfLenY, x, boardMidY + halfLenY);
    }

    if (options.pieces !== false) {
      ctx.fillStyle = "black";

      for (var r = 0; r < numRows; r++) {
        for (var c = 0; c < numCols; c++) {
          if (gameState[r][c] != EMPTY) {
            ctx.fillStyle = gameState[r][c] == RED ? "red" : "black";
            var x = boardMidX - halfLenX + (c + 0.5) * squareLength;
            var y = boardMidY - halfLenY + (r + 0.5) * squareLength;
            ctx.fillCircle(x, y, squareLength / 2);
          }
        }
      }
    }

    if (angle != 0) {
      ctx.arc = old.arc;
      ctx.moveTo = old.moveTo;
      ctx.lineTo = old.lineTo;
    }
  }

  var fallAccel = 0.3;
  var fallBounce = 0.3;
  var fallStopThreshold = 1;

  function placePiece(player, column, cb) {
    var row = numRows - 1;
    while (row >= 0 && gameState[row][column] != EMPTY) {
      row--;
    }
    if (row == -1) {
      // TODO: not valid move
      return;
    }

    var halfLenX = squareLength * numCols / 2;
    var halfLenY = squareLength * numRows / 2;

    var x = boardMidX - halfLenX + (column + 0.5) * squareLength;
    var y = boardMidY - halfLenY - 0.5 * squareLength;
    var dy = 0;
    var finalY = boardMidY - halfLenY + (row + 0.5) * squareLength;

    var interval = setInterval(function() {
      draw();
      dy += fallAccel;
      y += dy;
      var done = false;
      if (y > finalY) {
        if (dy < fallStopThreshold) {
          done = true;
        }
        y = finalY;
        dy *= -fallBounce;
      }
      ctx.fillStyle = player == RED ? "red" : "black";
      ctx.fillCircle(x, y, squareLength / 2);
      if (done) {
        clearInterval(interval);
        gameState[row][column] = player;
        draw(); // this should do nothing
        cb();
      }
    }, 1000 / fps);
  }

  var rotateStep = 0.02;

  var LEFT = 0;
  var RIGHT = 1;

  function rotateBoard(direction, cb) {
    var angle = 0;
    var interval = setInterval(function() {
      var sign = (direction == LEFT ? 1 : -1);
      angle += sign * rotateStep;
      var done = false;
      if (Math.abs(angle) > Math.PI / 2) {
        angle = sign * Math.PI / 2;
        done = true;
      }
      draw({ angle: angle, });
      if (done) {
        clearInterval(interval);
        var temp = numRows;
        numRows = numCols;
        numCols = temp;
        var oldState = gameState;
        gameState = []
        for (var r = 0; r < numRows; r++) {
          var newRow = [];
          for (var c = 0; c < numCols; c++) {
            if (direction == LEFT) {
              newRow.push(oldState[c][numRows - 1 - r]);
            } else {
              newRow.push(oldState[numCols - 1 - c][r]);
            }
          }
          gameState.push(newRow);
        }
        draw(); // this should do nothing
        fallAfterRotate(cb);
      }
    }, 1000 / fps);
  }

  function fallAfterRotate(cb) {
    var halfLenX = squareLength * numCols / 2;
    var halfLenY = squareLength * numRows / 2;

    var numLeft = 0;

    var positions = []; // here the first index is columns instead of rows
    for (var c = 0; c < numCols; c++) {
      var arr = [];
      for (var r = 0; r < numRows; r++) {
        if (gameState[r][c] != EMPTY) {
          arr.push({
            y: boardMidY - halfLenY + (r + 0.5) * squareLength,
            dy: 0,
            player: gameState[r][c],
            done: false,
          });
          numLeft++;
        }
      }
      positions.push(arr);
    }

    var interval = setInterval(function() {
      draw({ pieces: false, });
      for (var c = 0; c < numCols; c++) {
        for (var i = 0; i < positions[c].length; i++) {
          if (!positions[c][i].done) {
            var realFinalY = boardMidY + halfLenY - (positions[c].length - 0.5 - i) * squareLength;
            var finalY;
            if (i == positions[c].length - 1) {
              finalY = realFinalY;
            } else {
              finalY = positions[c][i + 1].y - squareLength;
            }
            positions[c][i].dy += fallAccel;
            positions[c][i].y += positions[c][i].dy;
            if (positions[c][i].y > finalY) {
              if (positions[c][i].dy < fallStopThreshold && Math.abs(positions[c][i].y - realFinalY) < 2) {
                positions[c][i].done = true;
                numLeft--;
              }
              positions[c][i].y = finalY;
              positions[c][i].dy *= -fallBounce;
            }
          }
          var x = boardMidX - halfLenX + (c + 0.5) * squareLength;
          ctx.fillStyle = positions[c][i].player == RED ? "red" : "black";
          ctx.fillCircle(x, positions[c][i].y, squareLength / 2);
        }
      }
      if (numLeft == 0) {
        clearInterval(interval);
        for (var c = 0; c < numCols; c++) {
          for (var r = 0; r < numRows; r++) {
            var i = r - numRows + positions[c].length;
            if (i >= 0) {
              gameState[r][c] = positions[c][i].player;
            } else {
              gameState[r][c] = EMPTY;
            }
          }
        }
        draw(); // this should do nothing
        cb();
      }
    }, 1000 / fps);
  }

  var canvasClickCallback = function() {};
  canvas.addEventListener("mouseup", function(event) {
    if (event.which != 1) {
      return;
    }

    var halfLenX = squareLength * numCols / 2;
    var halfLenY = squareLength * numRows / 2;

    var rect = canvas.getBoundingClientRect();
    var x = event.x - rect.left;
    var y = event.y - rect.top;

    if (boardMidX - halfLenX < x && x < boardMidX + halfLenX && y < boardMidY + halfLenY) {
      var c = Math.floor((x - (boardMidX - halfLenX)) / squareLength);
      if (gameState[0][c] == EMPTY) {
        canvasClickCallback(c);
      }
    }
  });




  // ^ graphics
  // v not graphics




  function show() {
    for (var i = 0; i < arguments.length; i++) {
      getElem(arguments[i]).style.display = "block";
    }
  }

  function hide() {
    for (var i = 0; i < arguments.length; i++) {
      getElem(arguments[i]).style.display = "none";
    }
  }

  function sanitize(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function postRequest(path, data, cb) {
    var xhr = new XMLHttpRequest();
    // https://us-central1-treehacks-1518852998483.cloudfunctions.net
    var url = "http://gravityfour.voidpigeon.com";
    xhr.open("POST", url + path);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          cb(JSON.parse(xhr.responseText));
        } else {
          // TODO: error
        }
      }
    };
    xhr.send(JSON.stringify(data));
  }

  var rotateCallback = function() {};
  getElem("rotateLeft").addEventListener("click", function() {
    rotateCallback(LEFT);
  });
  getElem("rotateRight").addEventListener("click", function() {
    rotateCallback(RIGHT);
  });

  getElem("reloadButton").addEventListener("click", function() {
    location.reload();
  });

  getElem("twoPlayerLocalStart").addEventListener("click", function() {
    show("twoPlayerLocalOptions");
    getElem("inputName1").focus();
  });

  getElem("onePlayerAiStart").addEventListener("click", function() {
    show("onePlayerAiOptions");
    if (Math.random() < 0.5) {
      getElem("humanGoesFirst").checked = true;
    } else {
      getElem("aiGoesFirst").checked = true;
    }
  });

  getElem("twoPlayerLocalPlay").addEventListener("click", function() {
    getElem("displayName1").innerHTML = sanitize(getElem("inputName1").value) || "Player 1";
    getElem("displayName2").innerHTML = sanitize(getElem("inputName2").value) || "Player 2";
    show("gameScreen");
    hide("introScreen");

    var canMove;
    var currentPlayer;
    var gameEnded;

    function setPlayer(player) {
      currentPlayer = player;
      getElem("displayName1").style.fontWeight = currentPlayer == RED ? "bold" : "normal";
      getElem("displayName2").style.fontWeight = currentPlayer == BLACK ? "bold" : "normal";
    }

    function switchPlayer() {
      setPlayer(currentPlayer == RED ? BLACK : RED);
    }

    function restartGame() {
      clearBoard();
      draw();
      canMove = true;
      setPlayer(RED);
      gameEnded = false;
    }

    restartGame();

    getElem("playAgainButton").addEventListener("click", function() {
      if (canMove || gameEnded) {
        restartGame();
      }
    });

    canvasClickCallback = function(c) {
      if (!canMove) {
        return;
      }
      canMove = false;
      placePiece(currentPlayer, c, afterMove);
    };

    rotateCallback = function(direction) {
      if (!canMove) {
        return;
      }
      canMove = false;
      rotateBoard(direction, afterMove);
    };

    function afterMove() {
      canMove = true;
      var gameEnd = checkGameEnd();
      if (gameEnd) {
        canMove = false;
        gameEnded = true;
        if (gameEnd == RED) {
          getElem("gameEndText").innerHTML = getElem("displayName1").innerHTML + " wins";
        } else if (gameEnd == BLACK) {
          getElem("gameEndText").innerHTML = getElem("displayName2").innerHTML + " wins";
        } else {
          getElem("gameEndText").innerHTML = "Tie game";
        }
        getElem("gameEndText").style.color = "black";
      } else {
        switchPlayer();
      }
    }
  });

  getElem("onePlayerAiPlay").addEventListener("click", function() {
    var humanGoesFirst = getElem("humanGoesFirst").checked;
    var aiDifficulty = parseInt(getElem("aiDifficulty").value);
    getElem("displayName1").innerHTML = humanGoesFirst ? "You" : "AI";
    getElem("displayName2").innerHTML = humanGoesFirst ? "AI" : "You";
    show("gameScreen");
    hide("introScreen");

    var humanPlayer = humanGoesFirst ? RED : BLACK;
    var aiPlayer = humanGoesFirst ? BLACK : RED;

    var canMove;
    var currentPlayer;
    var gameEnded;
    var moveSequence;

    function setPlayer(player) {
      currentPlayer = player;
      getElem("displayName1").style.fontWeight = currentPlayer == RED ? "bold" : "normal";
      getElem("displayName2").style.fontWeight = currentPlayer == BLACK ? "bold" : "normal";
    }

    function switchPlayer() {
      setPlayer(currentPlayer == RED ? BLACK : RED);
    }

    function restartGame() {
      clearBoard();
      draw();
      canMove = true;
      setPlayer(RED);
      gameEnded = false;
      moveSequence = "";
    }

    restartGame();

    getElem("playAgainButton").addEventListener("click", function() {
      if (canMove || gameEnded) {
        restartGame();
      }
    });

    canvasClickCallback = function(c) {
      if (!canMove) {
        return;
      }
      canMove = false;
      moveSequence += c;
      placePiece(currentPlayer, c, afterHumanMove);
    };

    rotateCallback = function(direction) {
      if (!canMove) {
        return;
      }
      canMove = false;
      moveSequence += direction == LEFT ? 8 : 7;
      rotateBoard(direction, afterHumanMove);
    };

    if (!humanGoesFirst) {
      makeAiMove();
    }

    function afterHumanMove() {
      afterMove();
      if (!gameEnded) {
        makeAiMove();
      }
    }

    function makeAiMove() {
      canMove = false;
      console.log(aiDifficulty, moveSequence);
      postRequest("/ai", {
        mode: aiDifficulty,
        game: moveSequence.split("").join(" "),
      }, function(result) {
          console.log(result)
          var aiMove = result.ai;
          moveSequence += aiMove;
          if (aiMove < 7) {
            placePiece(aiPlayer, aiMove, afterMove);
          } else if (aiMove == 8) {
            rotateBoard(LEFT, afterMove);
          } else { // aiMove == 7
            rotateBoard(RIGHT, afterMove);
          }
      });
    }

    function afterMove() {
      canMove = true;
      var gameEnd = checkGameEnd();
      if (gameEnd) {
        canMove = false;
        gameEnded = true;
        if (gameEnd == RED) {
          getElem("gameEndText").innerHTML = "Winner: " + getElem("displayName1").innerHTML;
        } else if (gameEnd == BLACK) {
          getElem("gameEndText").innerHTML = "Winner: " + getElem("displayName2").innerHTML;
        } else {
          getElem("gameEndText").innerHTML = "Tie game";
        }
        getElem("gameEndText").style.color = "black";
      } else {
        switchPlayer();
      }
    }
  });

  window.startTwoPlayerNetworked = function(displayName, uid) {
    var challenge;

    function lookForMatch() {
      postRequest("/app/api/match", { uid: uid }, function(obj) {
        if (Object.keys(obj.challenge).length > 0) {
          // found a match
          console.log("found");
          challenge = obj.challenge;
          show("gameScreen");
          hide("introScreen");
          restartGame();
          getElem("displayName1").innerHTML = uid == challenge.playerOne ? "You" : "Them";
          getElem("displayName2").innerHTML = uid == challenge.playerTwo ? "You" : "Them";
          if (uid == challenge.playerTwo) {
            waitForMove();
          }
        } else {
          setTimeout(lookForMatch, 1000);
        }
      });
    }

    postRequest("/app/api/match/exit", { uid: uid }, lookForMatch);

    var humanPlayer = humanGoesFirst ? RED : BLACK;
    var aiPlayer = humanGoesFirst ? BLACK : RED;

    var canMove;
    var currentPlayer;
    var gameEnded;
    var moveSequence;

    function setPlayer(player) {
      currentPlayer = player;
      getElem("displayName1").style.fontWeight = currentPlayer == RED ? "bold" : "normal";
      getElem("displayName2").style.fontWeight = currentPlayer == BLACK ? "bold" : "normal";
    }

    function switchPlayer() {
      setPlayer(currentPlayer == RED ? BLACK : RED);
    }

    function restartGame() {
      clearBoard();
      draw();
      canMove = true;
      setPlayer(RED);
      gameEnded = false;
      moveSequence = "";
    }

    restartGame();

    hide("playAgainButton");

    canvasClickCallback = function(c) {
      if (!canMove) {
        return;
      }
      canMove = false;
      moveSequence += c;
      placePiece(currentPlayer, c, afterYourMove);
      postRequest("/app/api/play", {
        uid: uid,
        move: c,
        challenge: challenge,
      }, function(obj) {
        moveSequence = obj.moves.join("");
        // TODO check times
      });
    };

    rotateCallback = function(direction) {
      if (!canMove) {
        return;
      }
      canMove = false;
      moveSequence += direction == LEFT ? 8 : 7;
      rotateBoard(direction, afterYourMove);
      postRequest("/app/api/play", {
        uid: uid,
        move: direction == LEFT ? 8 : 7,
        challenge: challenge,
      }, function(obj) {
        moveSequence = obj.moves.join("");
        // TODO check times
      });
    };

    function afterYourMove() {
      afterMove();
      if (!gameEnded) {
        waitForMove();
      }
    }

    function waitForMove() {
      canMove = false;
      function poll() {
        postRequest("/app/api/play/moves", { challenge: challenge }, function(obj) {
          var newMoveSequence = obj.moves.join("");
          if (moveSequence != newMoveSequence) {
            moveSequence = newMoveSequence;
            var move = moveSequence[moveSequence.length - 1];
            if (move < 7) {
              placePiece(currentPlayer, parseInt(move), afterMove);
            } else if (move == 8) {
              rotateBoard(LEFT, afterMove);
            } else { // move == 7
              rotateBoard(RIGHT, afterMove);
            }
          } else {
            setTimeout(poll, 1000);
          }
        });
      }
      poll();
    }

    function afterMove() {
      canMove = true;
      var gameEnd = checkGameEnd();
      if (gameEnd) {
        canMove = false;
        gameEnded = true;
        if (gameEnd == RED) {
          getElem("gameEndText").innerHTML = "Winner: " + getElem("displayName1").innerHTML;
        } else if (gameEnd == BLACK) {
          getElem("gameEndText").innerHTML = "Winner: " + getElem("displayName2").innerHTML;
        } else {
          getElem("gameEndText").innerHTML = "Tie game";
        }
        getElem("gameEndText").style.color = "black";

        var won;
        if (gameEnd == RED) {
          won = challenge.playerOne == uid ? 1 : 0;
        } else if (gameEnd == BLACK) {
          won = challenge.playerOne == uid ? 0 : 1;
        } else {
          won = 0.5;
        }
        postRequest("/app/api/endGame", {
          uid: uid,
          won: won,
          challenge: challenge,
        }, function() {});
      } else {
        switchPlayer();
      }
    }
  };

  var TIE = 3;

  function checkGameEnd() {

    function drawWin(r1, c1, r2, c2) {
      console.log(r1, c1, r2, c2)
      var halfLenX = squareLength * numCols / 2;
      var halfLenY = squareLength * numRows / 2;

      var x1 = boardMidX - halfLenX + (c1 + 0.5) * squareLength;
      var x2 = boardMidX - halfLenX + (c2 + 0.5) * squareLength;
      var y1 = boardMidY - halfLenY + (r1 + 0.5) * squareLength;
      var y2 = boardMidY - halfLenY + (r2 + 0.5) * squareLength;

      ctx.strokeStyle = "blue";
      ctx.lineCap = "round";
      ctx.lineWidth = 6;

      ctx.drawLine(x1, y1, x2, y2);
    }

    function checkWinner(player) {
      for (var r = 0; r < numRows; r++) {
        for (var c = 0; c < numCols; c++) {
          if (gameState[r][c] != player) {
            continue;
          }
          if (c + 3 < numCols) {
            if (gameState[r][c + 1] == player && gameState[r][c + 2] == player && gameState[r][c + 3] == player) {
              drawWin(r, c, r, c + 3);
              return true;
            }
          }
          if (r + 3 < numRows) {
            if (gameState[r + 1][c] == player && gameState[r + 2][c] == player && gameState[r + 3][c] == player) {
              drawWin(r, c, r + 3, c);
              return true;
            }
          }
          if (r + 3 < numRows && c + 3 < numCols) {
            if (gameState[r + 1][c + 1] == player && gameState[r + 2][c + 2] == player && gameState[r + 3][c + 3] == player) {
              drawWin(r, c, r + 3, c + 3);
              return true;
            }
          }
          if (r - 3 >= 0 && c + 3 < numCols) {
            if (gameState[r - 1][c + 1] == player && gameState[r - 2][c + 2] == player && gameState[r - 3][c + 3] == player) {
              drawWin(r, c, r - 3, c + 3);
              return true;
            }
          }
        }
      }
      return false;
    }

    if (checkWinner(RED)) {
      if (checkWinner(BLACK)) {
        return TIE;
      } else {
        return RED;
      }
    } else if (checkWinner(BLACK)) {
      return BLACK;
    } else {
      for (var r = 0; r < numRows; r++) {
        for (var c = 0; c < numCols; c++) {
          if (gameState[r][c] == EMPTY) {
            return false;
          }
        }
      }
      return TIE;
    }
  }

})();
