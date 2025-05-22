"use client";

import { useReproGame, useReproPiece } from "../api/repro/v1/repro_rbt_react"

export default function Home() {
  const gameRef = useReproGame({ id: "singleton" });
  const pieceRef = useReproPiece({ id: "white-pawn" });

  async function clickGame() {
    const { aborted } = await gameRef.runQueue();
    if (aborted) {
      console.log(aborted);
    } else {
      console.log("It succeeded");
    }
  }

  async function clickPiece() {
    const { aborted } = await pieceRef.movePiece({ locId:  "empty-loc" });
    if (aborted) {
      console.log(aborted);
    } else {
      console.log("It succeeded");
    }
    console.log("done");
  }

  async function clickPiece2() {
    const { aborted } = await pieceRef.movePiece({ locId: "working-loc" });
    if (aborted) {
      console.log(aborted);
    } else {
      console.log("It succeeded");
    }
    console.log("done");
  }

  return (
    <div>
      <button 
        className="border-1 border-red-400 p-2 m-2 cursor-pointer"
        onClick={clickGame}
      >
        Repro From Game
      </button>
      <br />

      <button 
        className="border-1 border-red-400 p-2 m-2 cursor-pointer"
        onClick={clickPiece}
      >
        Repro From Piece
      </button>

      <button
        className="border-1 border-red-400 p-2 m-2 cursor-pointer"
        onClick={clickPiece2}
      >
        Works if Get Succeeds
      </button>
    </div>
  );
}