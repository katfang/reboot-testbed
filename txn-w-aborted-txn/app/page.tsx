"use client";

import { useReproGame, useReproPiece } from "../api/repro/v1/repro_rbt_react"

export default function Home() {
  const gameRef = useReproGame({ id: "singleton" });
  const pieceRef = useReproGame({ id: "white-pawn" });

  async function click() {
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
        onClick={click}
      >
        Repro
      </button>
      <br />
    </div>
  );
}