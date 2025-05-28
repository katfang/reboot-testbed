"use client";

import { useState, useEffect } from "react";
import { useGame } from "../api/cheaoss/v1/game_rbt_react"
import { Location, InvalidMoveError, MoveStatus } from "../api/cheaoss/v1/move_pb"
import { Piece } from "../api/cheaoss/v1/piece_rbt_react"

import CheaossSquare from "./CheaossSquare";
import { rcToLocKey, locToLocKey } from "./utils"

export default function CheaossBoard({
  gameId,
  playerId
} : {
  gameId: string,
  playerId: string
}) {
  // TODO: probably pass from above?
  const cheaossRef = useGame({ id: gameId });
  const boardPieces = cheaossRef.useBoardPieces();
  const outstandingMoves = cheaossRef.useGetOutstandingMoves({ playerId });
  const [startLoc, setStartLoc] = useState<Location | null>(null);
  const [endLoc, setEndLoc] = useState<Location | null>(null);

  // This has to happen first due to hooks having to be run first
  const jsonOutstandingMoves = JSON.stringify(outstandingMoves.response?.moves);
  console.log(new Date().toLocaleString(), "outstanding moves", outstandingMoves.response ? outstandingMoves.response.moves : null);
  useEffect(() => {
    async function ackMoves() {
      console.log(new Date().toLocaleString(), "acking moves!", outstandingMoves.response);
      if (outstandingMoves.response === undefined ) {
        return;
      }
      if (Object.keys(outstandingMoves.response.moves).length > 0) {
        for (const [moveId, move] of Object.entries(outstandingMoves.response.moves)) {
          if (move.status === MoveStatus.MOVE_EXECUTED || move.status === MoveStatus.MOVE_CANCELED) {
            await cheaossRef.ackMove({ moveId, playerId })
            setStartLoc(null);
            setEndLoc(null);
          } else if (move.status === MoveStatus.MOVE_ERRORED) {
            alert(move.error);
            await cheaossRef.ackMove({ moveId, playerId })
            setStartLoc(null);
            setEndLoc(null);
          }
        }
      }
    }
    ackMoves();
  }, [jsonOutstandingMoves]);

  if (boardPieces.response === undefined || outstandingMoves.response === undefined) {
    return "still loading";
  }

  async function selectSquare(loc: Location) {
    if (startLoc === null) {
      setStartLoc(loc);
    } else if (endLoc === null) {
      setEndLoc(loc);
      let pieceId = locToPieceId.get(locToLocKey(startLoc));
      if (pieceId !== undefined) {
        const { aborted } = await cheaossRef.queueMove({
          playerId: playerId,
          pieceId: pieceId,
          start: startLoc,
          end: loc
        });
        if (aborted?.error instanceof InvalidMoveError) {
          alert(aborted.error.message);
          setStartLoc(null);
          setEndLoc(null);
        // } else {
        //   setSavedHasMove(true); // at this point, the server value is true, so if we get a new value from the server, it hsould be true
        }
        // if it's a valid move, then we want to keep showing the current move
      }
    }
  }

  // TODO ??? is there a way of having this update by piece using usePiece, or nope, nah?
  let pieces = boardPieces.response?.pieces;
  let locToPieceId = new Map<string, string>();
  let pieceIdToState = new Map<string, Piece.State>();
  for (let pieceId in pieces) {
    locToPieceId.set(`${pieces[pieceId].loc?.row}-${pieces[pieceId].loc?.col}`, pieceId);
    pieceIdToState.set(pieceId, pieces[pieceId]);
  }

  const squares = [];
  for (let r = 7; r >= 0; r--) { // in chess, we want 0,0 to be the bottom left corner
    for (let c = 0; c < 8; c++) {
      let piece = pieceIdToState.get(
        locToPieceId.get(rcToLocKey(r, c)) || ""
      );
      squares.push(<CheaossSquare
        key={rcToLocKey(r, c)}
        row={r}
        col={c}
        piece={piece}
        onSelect={ (piece !== undefined || startLoc !== null) ? () => selectSquare(new Location({row: r, col: c})) : undefined }
        isStart={startLoc !== null ? (startLoc.row == r && startLoc.col == c) : false}
        isEnd={endLoc !== null ? (endLoc.row == r && endLoc.col == c) : false}
      />);
    }
  }

  return (
    <div className="grid grid-cols-[80px_80px_80px_80px_80px_80px_80px_80px] grid-rows-[80px_80px_80px_80px_80px_80px_80px_80px] items-center justify-items-center g-4">
      {squares}
    </div>
  );
}
