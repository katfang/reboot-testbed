"use client";

import { useGame } from "../api/cheaoss/v1/game_rbt_react"
import { MoveCannotBeCanceledError } from "../api/cheaoss/v1/move_rbt_react";

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

  async function cancelMove(moveId: string) {
    const { aborted } = await cheaossRef.cancelMove({ moveId: moveId });
    if (aborted?.error instanceof MoveCannotBeCanceledError) {
      alert(aborted.error.message);
    }
  }

  console.log("pending cancel moves", cheaossRef.cancelMove.pending);

  let whiteMoves = [];
  for (let move of queues.response.whiteMovesQueue) {
    whiteMoves.push(
      <li key={move.playerId + "-" + move.pieceId}>
        {move.playerId} -
        ({move.start?.row}, {move.start?.col}) -
        ({move.end?.row} , {move.end?.col})
        [<a href="#" onClick={() => cancelMove(move.playerId + "-" + move.pieceId)}>Cancel</a>]
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
        [<a href="#" onClick={() => cancelMove(move.playerId + "-" + move.pieceId)}>Cancel</a>]
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
