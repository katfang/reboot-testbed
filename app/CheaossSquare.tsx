"use client";

import { Team } from "../api/cheaoss/v1/cheaoss_pb"
import { Piece, PieceType } from "../api/cheaoss/v1/piece_rbt_react"

const UNICODE_PIECES = new Map<PieceType, string>();
UNICODE_PIECES.set(PieceType.PIECES_TYPE_UNKNOWN, "X");
UNICODE_PIECES.set(PieceType.PAWN, "♟");
UNICODE_PIECES.set(PieceType.BISHOP, "♝");
UNICODE_PIECES.set(PieceType.KNIGHT, "♞");
UNICODE_PIECES.set(PieceType.ROOK, "♜");
UNICODE_PIECES.set(PieceType.QUEEN, "♛");
UNICODE_PIECES.set(PieceType.KING, "♚");

export default function CheaossSquare({ row, col, piece, onSelect, isStart, isEnd } : { row: number, col: number, piece?: Piece.State, onSelect?: () => void, isStart: boolean, isEnd: boolean }) {
  const squareColor = ((row + col) % 2 === 0 ? "bg-black-square" : "bg-white-square") + " w-full h-full";
  const pieceRep = piece ? UNICODE_PIECES.get(piece.type) : '';
  const pieceColor = piece ?  " text-" + Team[piece.team].toLowerCase() + "-piece" : "";
  const cursorPointer = onSelect ? " cursor-pointer": "";
  const startHighlight = isStart ? " border-2 border-dashed border-green-500" : "";
  const endHighlight = isEnd ? " border-2 border-solid border-green-500" : "";

  return (
    <div
      className={squareColor + ' text-7xl text-center' + pieceColor + cursorPointer + startHighlight + endHighlight}
      onClick={onSelect}
    >
      {pieceRep}
    </div>
  );
}
