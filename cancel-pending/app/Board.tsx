"use client";

import { useEffect, useState } from "react";
import { MoveStatus, useGame } from "../api/repro/v1/repro_rbt_react"

export default function Board({
  gameId
} : { gameId: string }) {
  const gameRef = useGame({ id: gameId });
  const movesById = gameRef.useMovesById();
  const [hasPendingMove, setHasPendingMove] = useState(false);

  const jsonMovesById = JSON.stringify(movesById.response?.movesById);
  console.log("moves by id", movesById);
  useEffect(() => {
    async function ackMoves() {
      console.log("acking moves!");
      if (movesById.response === undefined) {
        return;
      }
      if (Object.keys(movesById.response.movesById).length > 0) {
        for (const [moveId, move] of Object.entries(movesById.response.movesById)) {
          if (move.status === MoveStatus.MOVE_EXECUTED || move.status === MoveStatus.MOVE_CANCELED) {
            await gameRef.ackMove({ moveId });
            setHasPendingMove(false);
          }
        }
      }
    }
    ackMoves();
  }, [jsonMovesById]);

  async function queueMove(moveId: string) {
    setHasPendingMove(true);
    await gameRef.queueMove({ id: moveId });
  }

  // let movesByIdDisplay = [];
  // if (movesById.response !== undefined) {
  //   for (const [moveId, move] of Object.entries(movesById.response.movesById)) {
  //     movesByIdDisplay.push(
  //       <li key={moveId}>
  //         {moveId} - {MoveStatus[move.status]}
  //       </li>
  //     )
  //   }
  // }


  return (
    <div>
      <button
        className="border-1 border-red-400 p-2 m-2 cursor-pointer"
        onClick={() => queueMove("move 1")}
      >
        Queue "Move 1"
      </button>

      <button
        className="border-1 border-red-400 p-2 m-2 cursor-pointer"
        onClick={() => queueMove("move 2")}
      >
        Queue "Move 2"
      </button>
      <br />

      <div className="border-1 border-green-400 m-2 w-100">
        <h1>Moves by reference</h1>
        {/* {movesByIdDisplay} */}
      </div>

      <div className="border-1 border-green-400 m-2 w-100">
        Has Pending Data: {hasPendingMove ? "true" : "false"}
      </div>
    </div>
  );
}