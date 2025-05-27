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

  let moves = [];
  for (let move of queues.response.movesQueue) {
    moves.push(
      <li key={move.playerId + "-" + move.pieceId}>
        ({move.start?.row}, {move.start?.col}) -
        ({move.end?.row} , {move.end?.col})
        [<a href="#" onClick={() => cancelMove(move.playerId + "-" + move.pieceId)}>Cancel</a>]
      </li>
    )
  }

  return (
    <div className="w-full h-full bg-mid-square text-white-piece p-2">
      <h1>Pending Moves</h1>
      <ul>
        {moves}
      </ul>
    </div>
  );
}
