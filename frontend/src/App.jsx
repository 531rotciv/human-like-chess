import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { useState } from "react";

function App() {
  const [game, setGame] = useState(new Chess());
  const [pendingMove, setPendingMove] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [userColor, setUserColor] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [aiSkill, setAiSkill] = useState(1000);

  function isPromotion(sourceSquare, targetSquare) {
    const piece = game.get(sourceSquare);
    if (!piece || piece.type !== "p") return false;
    const targetRank = targetSquare[1];
    return (
      (piece.color === "w" && targetRank === "8") ||
      (piece.color === "b" && targetRank === "1")
    );
  }

  async function sendSkill(skillString) {
    const response = await fetch("http://localhost:8000/api/select-skill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ai_skill: skillString
      })
    });
    if (!response.ok) {
      throw new Error("Request failed: ${response.status}");
    }
    const data = await response.json();
    return data;
  }

  async function sendMove(fen) {
    const response = await fetch("http://localhost:8000/api/moves", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fen: fen
      })
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Move request failed: ${response.status} ${body}`);
    }
    const data = await response.json();
    return data;
  }  

  async function onDrop({ sourceSquare, targetSquare }) {
    if (userColor === null) {
      return false;
    }
    if (gameResult !== null) {
      return false;
    }
    if (isPromotion(sourceSquare, targetSquare)) {
      setPendingMove({ sourceSquare, targetSquare });
      return true;
    }



    const gameCopy = new Chess(game.fen());
    const move = gameCopy.move({ from: sourceSquare, to: targetSquare});

    if (move === null) return false;

    setGame(new Chess(gameCopy.fen()));
    if (gameCopy.isCheckmate()) {
      setGameResult("Won");
      return true;
    }

    if (
      gameCopy.isStalemate() ||
      gameCopy.isInsufficientMaterial() ||
      gameCopy.isThreefoldRepetition() ||
      gameCopy.isDraw()
    ) {
      setGameResult("Draw");
      return true;
    }
    const data = await sendMove(gameCopy.fen());
    
    let gameEnded = false;
    if (userColor === "w") {
      if (data.result == "1-0") {
        setGameResult("Won")
        gameEnded = true
      }
      else if (data.result == "0-1") {
        setGameResult("Lost")
        gameEnded = true
      }
      else if (data.result == "1/2-1/2") {
        setGameResult("Draw")
        gameEnded = true
      }
    } else if (userColor === "b") {
      if (data.result == "1-0") {
        setGameResult("Lost")
        gameEnded = true
      }
      else if (data.result == "0-1") {
        setGameResult("Won")
        gameEnded = true
      }
      else if (data.result == "1/2-1/2") {
        setGameResult("Draw")
        gameEnded = true
      }
    }

    if (!gameEnded) {
      const translated_model_move = gameCopy.move({ from: data.move.slice(0,2), to: data.move.slice(2,4),promotion: data.move[4] });
      console.log("Current FEN:", gameCopy.fen());
      setGame(new Chess(gameCopy.fen()))
      if (gameCopy.isCheckmate()) {
        setGameResult("Lost");
      }
      else if (gameCopy.isStalemate()) {
        setGameResult("Draw");
      }
      else if (gameCopy.isInsufficientMaterial()) {
        setGameResult("Draw");
      }
      else if (gameCopy.isThreefoldRepetition()) {
        setGameResult("Draw");
      }
      else if (gameCopy.isDraw()) {
        setGameResult("Draw");
      }
    }
    

    return true;
  }

  async function completePromotion(piece) {
    if (!pendingMove) return;

    const gameCopy = new Chess(game.fen());
    const userMove = gameCopy.move({
      from: pendingMove.sourceSquare,
      to: pendingMove.targetSquare,
      promotion: piece
    });

    if (userMove === null) {
      return;
    }

    setGame(new Chess(gameCopy.fen()));
    setPendingMove(null);

    // If the user's promotion ended the game, set result and don't call backend
    if (gameCopy.isCheckmate()) {
      setGameResult("Won");
      return;
    }

    if (
      gameCopy.isStalemate() ||
      gameCopy.isInsufficientMaterial() ||
      gameCopy.isThreefoldRepetition() ||
      gameCopy.isDraw()
    ) {
      setGameResult("Draw");
      return;
    }

    const data = await sendMove(gameCopy.fen());
    if (data?.move && typeof data.move === "string") {
      gameCopy.move({
        from: data.move.slice(0, 2),
        to: data.move.slice(2, 4),
        promotion: data.move[4]
      });
      setGame(new Chess(gameCopy.fen()));
    }
  }

  function handleResize() {
    setGame(new Chess());
    setGameResult(null);
    setPendingMove(null);
    setUserColor(null);
  }

  function handleResignClick() {
    setShowResignConfirm(true);
  }

  function confirmResign() {
    setGameResult("Lost");
    setShowResignConfirm(false);
  }

  function handleColorSelect(color) {
    setSelectedColor(color);
  }

  async function handleStartGame() {
    if (!selectedColor) return;
    await sendSkill(String(aiSkill));
    setUserColor(selectedColor);

    // if user chose black, delay until the model is loaded and then request the first AI move
    if (selectedColor === "b") {
      const data = await sendMove(new Chess().fen());
      if (data?.move && typeof data.move === "string") {
        const gameCopy = new Chess();
        gameCopy.move({
          from: data.move.slice(0, 2),
          to: data.move.slice(2, 4),
          promotion: data.move[4]
        });
        setGame(gameCopy);
      }
    }
  }

  const chessboardOptions = {
    position: game.fen(),
    onPieceDrop: onDrop,
    id: "BasicBoard",
    boardOrientation: userColor === "b" ? "black" : "white"
  };

  return (
    <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
      {userColor === null && (
        <div
          style={{
            position: "fixed",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: "1000"
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "30px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              textAlign: "center"
            }}
          >
            <p style={{ marginBottom: "20px", fontSize: "18px", fontWeight: "bold" }}>
              Choose your color
            </p>
            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
              <button
                onClick={() => handleColorSelect("w")}
                style={{
                  padding: "12px 24px",
                  fontSize: "16px",
                  cursor: "pointer",
                  backgroundColor: "#f5f5f5",
                  color: "#000",
                    border: selectedColor === "w" ? "3px solid #000" : "2px solid #000",
                  borderRadius: "4px"
                }}
              >
                White
              </button>
              <button
                onClick={() => handleColorSelect("b")}
                style={{
                  padding: "12px 24px",
                  fontSize: "16px",
                  cursor: "pointer",
                  backgroundColor: "#333",
                  color: "#fff",
                    border: selectedColor === "b" ? "3px solid #333" : "2px solid #333",
                  borderRadius: "4px"
                }}
              >
                Black
              </button>
            </div>
              <div style={{ marginTop: "20px" }}>
                <p style={{ marginBottom: "8px", fontWeight: "600" }}>AI Skill Level</p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <button
                    onClick={() => setAiSkill(1000)}
                    style={{
                      padding: "8px 14px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      border: aiSkill === 1000 ? "3px solid #000" : "2px solid #ccc",
                      background: aiSkill === 1000 ? "#f0f0f0" : "#fff"
                    }}
                  >
                    1000 Elo
                  </button>
                  <button
                    onClick={() => setAiSkill(2000)}
                    style={{
                      padding: "8px 14px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      border: aiSkill === 2000 ? "3px solid #000" : "2px solid #ccc",
                      background: aiSkill === 2000 ? "#f0f0f0" : "#fff"
                    }}
                  >
                    2000 Elo
                  </button>
                </div>
              </div>
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
                <button
                  onClick={handleStartGame}
                  disabled={!selectedColor}
                  style={{
                    padding: "10px 20px",
                    cursor: selectedColor ? "pointer" : "not-allowed",
                    backgroundColor: selectedColor ? "#007bff" : "#ccc",
                    color: "white",
                    border: "none",
                    borderRadius: "6px"
                  }}
                >
                  OK
                </button>
              </div>
          </div>
        </div>
      )}
      <div style={{ width: "600px", position: "relative" }}>
        <Chessboard options={chessboardOptions} />

        {pendingMove && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "12px",
              display: "flex",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}
          >
            {["q", "r", "b", "n"].map((piece) => (
              <button
                key={piece}
                onClick={() => completePromotion(piece)}
                style={{ padding: "8px 12px", cursor: "pointer" }}
              >
                {piece.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {gameResult && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}
          >
            <p>{gameResult}</p>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "10px" }}>
        <button
          onClick={handleResignClick}
          disabled={gameResult !== null}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            cursor: gameResult !== null ? "not-allowed" : "pointer",
            opacity: gameResult !== null ? 0.5 : 1,
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px"
          }}
        >
          Resign
        </button>

        <button
          onClick={handleResize}
          disabled={gameResult === null}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            cursor: gameResult === null ? "not-allowed" : "pointer",
            opacity: gameResult === null ? 0.5 : 1,
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px"
          }}
        >
          New Game
        </button>
      </div>

      {showResignConfirm && (
        <div
          style={{
            position: "fixed",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "20px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              textAlign: "center"
            }}
          >
            <p style={{ marginBottom: "20px", fontSize: "16px" }}>
              Are you sure you wish to resign?
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={confirmResign}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px"
                }}
              >
                Yes
              </button>
              <button
                onClick={() => setShowResignConfirm(false)}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px"
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;