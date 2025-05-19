"use client";

import { useGame } from "../api/cheaoss/v1/game_rbt_react"

export default function CheaossQueues({
  gameId,
  playerId
} : {
  gameId: string,
  playerId: string
}) {
  // TODO: probably pass from above?
  const cheaossRef = useGame({ id: gameId });
  const queues = cheaossRef.useQueues();

  if (queues.response === undefined) {
    return "still loading";
  }

  let whiteMoves = [];
  for (let move of queues.response.whiteMovesQueue) {
    whiteMoves.push(
      <li key={move.playerId}>
        {move.playerId} -
        ({move.start?.row}, {move.start?.col}) -
        ({move.end?.row} , {move.end?.col})
      </li>
    )
  }

  let blackMoves = [];
  for (let move of queues.response.blackMovesQueue) {
    blackMoves.push(
      <li key={move.playerId}>
        {move.playerId} -
        ({move.start?.row}, {move.start?.col}) -
        ({move.end?.row} , {move.end?.col})
      </li>
    )
  }

  return (
    <div className="w-full h-full grid grid-cols-2 gap-4 text-center">
      <div className="w-full h-full bg-mid-square text-white-piece p-2">
        <h1>Pending White Moves</h1>
        <ul>
          {whiteMoves}
        </ul>
      </div>
      <div className="w-full h-full bg-mid-square text-black-piece p-2">
        <h1>Pending Black Moves</h1>
        <ul>
          {blackMoves}
        </ul>
      </div>
    </div>
  );
}
