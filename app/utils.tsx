import { Location } from "../api/cheaoss/v1/cheaoss_rbt_react"

export function locToLocKey(loc: Location) : string {
  return `${loc.row}-${loc.col}`;
}
export function rcToLocKey(row: number, col: number) : string {
  return `${row}-${col}`;
}