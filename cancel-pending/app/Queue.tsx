"use client";

import { useEffect, useState } from "react";
import { MoveStatus, useGame } from "../api/repro/v1/repro_rbt_react"

export default function Queue({
  gameId
} : { gameId: string }) {
  const gameRef = useGame({ id: gameId });
  const moves = gameRef.useMoves();

  async function cancelMove(moveId: string) {
    await gameRef.cancelMove({ id: moveId });
  }

  let movesDisplay = [];
  if (moves.response !== undefined) {
    for (let move of moves.response?.moves) {
      movesDisplay.push(
        <li key={move.id}>
          {move.id} [<a href="#" onClick={() => cancelMove(move.id)}>Cancel</a>]
        </li>
      )
    }
  }

  return (
    <div>
      <div className="border-1 border-green-400 m-2 w-100">
        <h1>Moves by data</h1>
        {movesDisplay}
      </div>
    </div>
  );
}