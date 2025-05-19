"use client";
import { usePiece } from "../api/cheaoss/v1/cheaoss_rbt_react"

export default function Pieces({ pieceIds } : { pieceIds: string[] }) {
  // LOAD PIECES ATTEMPT 2
  let pieces = pieceIds.map(pieceId => {
    return usePiece({ id: pieceId }).usePiece();
  });
  console.log(pieces);
  return (
    <div></div>
  )
}
