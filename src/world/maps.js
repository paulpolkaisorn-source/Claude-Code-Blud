// maps.js — handcrafted arena layouts (ASCII, MAP_CHARS legend in contracts.js) and the shared parser.
// Each map is 33 rows of 21 chars. Row 0 is the RED far edge, row 32 the BLUE near edge.
// Both maps are 180-degree point-symmetric: tile(c,r) == swapTeam(tile(20-c, 32-r)); B spawns sit in rows 29-31,
// R spawns in rows 1-3 (one per row), and a single M sits at (10,16). Walkable = not '#' and not '~'.
import { GRID, T, MAP_CHARS } from '../contracts.js';

export const MAP_IDS = ['canyon', 'lagoons', 'random'];

export const MAPS = {
  canyon: {
    id: 'canyon', name: 'Canyon',
    rows: [
      '#####################',
      '..""....."""....R""..',
      '.."".R.#.....#...""..',
      '.......#..R..#.......',
      '#####.".#####.".#####',
      '.....................',
      '.....................',
      '."".#...........#."".',
      '."".#...#...#...#."".',
      '."".#...#...#...#."".',
      '."".#...........#."".',
      '."".#...........#."".',
      '.....................',
      '.........""".........',
      '........#............',
      '.........""".........',
      '........."M".........',
      '.........""".........',
      '............#........',
      '.........""".........',
      '.....................',
      '."".#...........#."".',
      '."".#...........#."".',
      '."".#...#...#...#."".',
      '."".#...#...#...#."".',
      '."".#...........#."".',
      '.....................',
      '.....................',
      '#####.".#####.".#####',
      '.......#..B..#.......',
      '..""...#.....#.B.""..',
      '..""B....""".....""..',
      '#####################',
    ],
  },
  lagoons: {
    id: 'lagoons', name: 'Lagoons',
    rows: [
      '#####################',
      '.."""......""R.#.....',
      '........R..""..#"....',
      '....""..........".R..',
      '.....................',
      '..~~~~........#......',
      '..~~~~...""".........',
      '.........""".........',
      '..~~~~...............',
      '..~~~~......~~~~.....',
      '""..........~~~~.....',
      '......#..............',
      '............~~~~.""".',
      '......#.....~~~~.""".',
      '......#.~~.~~........',
      '........~...~........',
      '........~.M.~........',
      '........~...~........',
      '........~~.~~.#......',
      '.""".~~~~.....#......',
      '.""".~~~~............',
      '..............#......',
      '.....~~~~..........""',
      '.....~~~~......~~~~..',
      '...............~~~~..',
      '.........""".........',
      '........."""...~~~~..',
      '......#........~~~~..',
      '.....................',
      '..B."..........""....',
      '...."#..""..B........',
      '.....#.B""......"""..',
      '#####################',
    ],
  },
};

// Parses 33 strings of 21 chars into typed tiles plus tile-centre spawn/mine positions. Throws on malformed input.
// Returns { cols, rows, tiles: Uint8Array (index r*cols+c, values T.*), spawns: [[{x,z}x3],[{x,z}x3]], mine: {x,z} }.
export function parseMap(rows) {
  const cols = GRID.cols, nrows = GRID.rows;
  if (!Array.isArray(rows) || rows.length !== nrows) throw new Error(`parseMap: expected ${nrows} rows`);
  const tiles = new Uint8Array(cols * nrows);
  const spawns = [[], []];
  let mine = null;
  for (let r = 0; r < nrows; r++) {
    const row = rows[r];
    if (typeof row !== 'string' || row.length !== cols) throw new Error(`parseMap: row ${r} must be ${cols} chars`);
    for (let c = 0; c < cols; c++) {
      const t = MAP_CHARS[row[c]];
      if (t === undefined) throw new Error(`parseMap: unknown char '${row[c]}' at ${c},${r}`);
      tiles[r * cols + c] = t;
      const x = c + 0.5, z = r + 0.5;
      if (t === T.SPAWN0) spawns[0].push({ x, z });
      else if (t === T.SPAWN1) spawns[1].push({ x, z });
      else if (t === T.MINE) {
        if (mine) throw new Error('parseMap: more than one M');
        mine = { x, z };
      }
    }
  }
  if (spawns[0].length !== 3 || spawns[1].length !== 3) throw new Error('parseMap: need 3 spawns per team');
  if (!mine) throw new Error('parseMap: missing M');
  return { cols, rows: nrows, tiles, spawns, mine };
}
