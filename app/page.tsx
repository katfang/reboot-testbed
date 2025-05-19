"use client";

import { useReproGame, useReproPiece } from "../api/repro/v1/repro_rbt_react"

export default function Home() {
  const gameRef = useReproGame({ id: "singleton" });
  const pieceRef = useReproGame({ id: "white-pawn" });

  async function clickGame() {
    const { aborted } = await gameRef.runQueue();
    if (aborted) {
      console.log(aborted);
    } else {
      console.log("It succeeded");
    }
  }

  async function clickPiece() {
    const { aborted } = await gameRef.runQueue();
    if (aborted) {
      console.log(aborted);
    } else {
      console.log("It succeeded");
    }
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
    </div>
  );
}