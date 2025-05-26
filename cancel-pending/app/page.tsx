"use client";

import Board from "./Board";
import Queue from "./Queue";

export default function Home() {
  return (
    <div>
      <Board gameId="singleton" />
      <Queue gameId="singleton" />
    </div>
  );
}