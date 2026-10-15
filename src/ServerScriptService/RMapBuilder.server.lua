--!strict
--[[
	RMapBuilder
	Builds a plain, blocky R-shaped map: a floor in the shape of the letter R with a
	wall running along every edge of the shape, including the hole inside the R's bowl.

	HOW TO USE
	  Permanent map (recommended): open Studio's Command Bar (View > Command Bar),
	  paste this whole file in and press Enter. The parts are saved with your place.
	  Runtime map: put this file in ServerScriptService as a Script. The map is built
	  every time a server starts.

	Running it again replaces the previous map (the Workspace model named MODEL_NAME).
	Reshape the map by editing SHAPE below.
]]

-- // SERVICES
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

-- // TYPES
type Grid = {
	cells: { { boolean } },
	width: number,
	height: number,
}

-- A rectangle of floor cells (1-based grid coordinates).
type FloorRect = {
	row: number,
	col: number,
	rows: number,
	cols: number,
}

-- A straight wall lying on a grid line. `line` is the index of the grid line the wall
-- sits on; `from` and `to` are grid-line indices along the wall's length.
type WallRun = {
	axis: "X" | "Z",
	line: number,
	from: number,
	to: number,
}

-- A rectangular gap in a wall (door or window): `from`/`to` along the wall, `bottom`/`top` above the floor.
type Opening = {
	from: number,
	to: number,
	bottom: number,
	top: number,
}

-- // CONSTANTS
-- '#' = floor, '.' = empty. The first line is the north end of the map (-Z), so the R
-- reads correctly when viewed from above. Every line must be the same length, and two
-- floor cells may not touch only at a corner (that would leave a zero-width gap).
local SHAPE: { string } = {
	"########..",
	"#########.",
	"##########",
	"###....###",
	"###....###",
	"##########",
	"#########.",
	"########..",
	"##...###..",
	"##....###.",
	"##.....###",
	"##......##",
}

local CELL_SIZE = 20 -- studs per grid cell; the R's strokes are 2 cells wide
local FLOOR_THICKNESS = 4
local FLOOR_TOP_Y = 0
local WALL_HEIGHT = 24 -- measured from the floor's top; too tall to jump over
local WALL_THICKNESS = 2
local WALL_SINK = 0.2 -- walls reach this far below the floor so their bottoms don't z-fight

local FLOOR_COLOR = BrickColor.new("Bright green")
local WALL_COLOR = BrickColor.new("Dark stone grey")
local STRAP_COLOR = BrickColor.new("Bright red") -- band along the bottom of every wall
local STRAP_HEIGHT = 3 -- studs of strap showing above the floor; 0 for no strap
local CLASSIC_STUDS = true -- studs on top faces for the classic blocky look

-- Grid position of the spawn (1-based; fractions allowed, col 1.5 = between cols 1 and 2).
local SPAWN_CELL = { row = 11, col = 1.5 }
local SPAWN_SIZE = Vector3.new(12, 1, 12)

local MODEL_NAME = "RMap"

-- Removes the "Baseplate" and "SpawnLocation" that Studio's Baseplate template puts in
-- Workspace. The baseplate would fill the R's hole and z-fight with the R's floor, and
-- the template spawn would sit on top of a wall. Set to false to keep them.
local REMOVE_TEMPLATE_PARTS = true

-- Play areas built inside the R. They are placed in world studs for the SHAPE above (cell size 20,
-- map centred on the origin) with heights measured from the floor's top; if you reshape the R, move
-- them too. Nothing walkable is higher than 14 studs, so players can't jump over the 24-stud walls.
local BUILD_SECTIONS = true
local RAMP_THICKNESS = 1
local LAMP_HEIGHT = 10
local LADDER_COLOR = BrickColor.new("Bright yellow")
local LAMP_POST_COLOR = BrickColor.new("Black")
local LAMP_LIGHT_COLOR = BrickColor.new("Bright yellow")
local STONE_COLOR = BrickColor.new("Medium stone grey")
local HOUSE_WALL_COLOR = BrickColor.new("Institutional white")
local HOUSE_ROOF_COLOR = BrickColor.new("Bright red")
local CRATE_COLOR = BrickColor.new("Reddish brown")
local DECK_COLOR = BrickColor.new("Bright blue")
local PILLAR_COLOR = BrickColor.new("Medium stone grey")
local RAMP_COLOR = BrickColor.new("Bright orange")
local PODIUM_FIRST_COLOR = BrickColor.new("Bright yellow")
local PODIUM_SECOND_COLOR = BrickColor.new("Medium stone grey")
local PODIUM_THIRD_COLOR = BrickColor.new("Bright orange")

-- Sky Steps, from the bridge's east platform down to the courtyard: { minX, minZ, maxX, maxZ, top height }.
-- Each is at most ~6 studs from the last and 2 studs lower, so they work going up or down.
local SKY_STEPS: { { number } } = {
	{ 62, -97, 70, -89, 12 },
	{ 72, -84, 78, -78, 10 },
	{ 80, -72, 88, -64, 8 },
	{ 84, -58, 92, -50, 6 },
	{ 76, -44, 84, -36, 4 },
	{ 64, -36, 72, -28, 2 },
}
local SKY_STEP_COLORS: { BrickColor } = {
	BrickColor.new("Bright red"),
	BrickColor.new("Bright orange"),
	BrickColor.new("Bright yellow"),
	BrickColor.new("Lime green"),
	BrickColor.new("Bright blue"),
	BrickColor.new("Bright violet"),
}

local NEIGHBOUR_OFFSETS: { { number } } = { { -1, 0 }, { 1, 0 }, { 0, -1 }, { 0, 1 } }

-- // STATE
-- None: every run rebuilds the map from the constants above.

-- // PRIVATE FUNCTIONS

--- Parses the ASCII art into a grid of floor flags.
--- @param shape { string } -- Lines of '#' and '.'
--- @return Grid -- Parsed grid; errors with a readable message on bad input
local function parseShape(shape: { string }): Grid
	assert(#shape > 0, "[RMapBuilder] SHAPE is empty")
	local width = #shape[1]
	assert(width > 0, "[RMapBuilder] SHAPE lines are empty")

	local cells: { { boolean } } = {}
	for rowIndex, line in shape do
		assert(#line == width, `[RMapBuilder] SHAPE line {rowIndex} has {#line} characters, expected {width}`)
		local row = table.create(width, false)
		for colIndex = 1, width do
			local char = string.sub(line, colIndex, colIndex)
			assert(
				char == "#" or char == ".",
				`[RMapBuilder] SHAPE line {rowIndex}, column {colIndex}: '{char}' must be '#' or '.'`
			)
			row[colIndex] = char == "#"
		end
		cells[rowIndex] = row
	end

	return { cells = cells, width = width, height = #shape }
end

--- Checks whether a grid cell is floor. Cells outside the grid count as empty.
--- @param grid Grid -- Parsed grid
--- @param row number -- 1-based row
--- @param col number -- 1-based column
--- @return boolean -- True if the cell is floor
local function isFloor(grid: Grid, row: number, col: number): boolean
	local cellRow = grid.cells[row]
	if cellRow == nil then
		return false
	end
	return cellRow[col] == true
end

--- Finds two floor cells that touch only at a corner, which would make a zero-width gap.
--- @param grid Grid -- Parsed grid
--- @return (number?, number?) -- Top-left row and column of the offending 2x2 block, or nil
local function findPinchPoint(grid: Grid): (number?, number?)
	for row = 1, grid.height - 1 do
		for col = 1, grid.width - 1 do
			local topLeft = isFloor(grid, row, col)
			local topRight = isFloor(grid, row, col + 1)
			local bottomLeft = isFloor(grid, row + 1, col)
			local bottomRight = isFloor(grid, row + 1, col + 1)
			if topLeft == bottomRight and topRight == bottomLeft and topLeft ~= topRight then
				return row, col
			end
		end
	end
	return nil, nil
end

--- Counts every floor cell in the grid.
--- @param grid Grid -- Parsed grid
--- @return number -- Number of floor cells
local function countFloorCells(grid: Grid): number
	local count = 0
	for row = 1, grid.height do
		for col = 1, grid.width do
			if isFloor(grid, row, col) then
				count += 1
			end
		end
	end
	return count
end

--- Counts the floor cells reachable from a start cell by walking between edge-sharing cells.
--- @param grid Grid -- Parsed grid
--- @param startRow number -- 1-based row to start from
--- @param startCol number -- 1-based column to start from
--- @return number -- Number of reachable floor cells
local function countReachableCells(grid: Grid, startRow: number, startCol: number): number
	local stride = grid.width + 2
	local visited: { [number]: boolean } = {}
	local pendingRows: { number } = { startRow }
	local pendingCols: { number } = { startCol }
	local count = 0

	while #pendingRows > 0 do
		local row = table.remove(pendingRows) :: number
		local col = table.remove(pendingCols) :: number
		local key = row * stride + col
		if isFloor(grid, row, col) and not visited[key] then
			visited[key] = true
			count += 1
			for _, offset in NEIGHBOUR_OFFSETS do
				table.insert(pendingRows, row + offset[1])
				table.insert(pendingCols, col + offset[2])
			end
		end
	end

	return count
end

--- Covers the floor cells with as few rectangles as a greedy sweep finds, to keep part count low.
--- @param grid Grid -- Parsed grid
--- @return { FloorRect } -- Non-overlapping rectangles covering every floor cell exactly once
local function meshFloor(grid: Grid): { FloorRect }
	local used: { { boolean } } = {}
	for row = 1, grid.height do
		used[row] = table.create(grid.width, false)
	end

	local function isFree(row: number, col: number): boolean
		return isFloor(grid, row, col) and not used[row][col]
	end

	local rects: { FloorRect } = {}
	for row = 1, grid.height do
		for col = 1, grid.width do
			if isFree(row, col) then
				local cols = 1
				while col + cols <= grid.width and isFree(row, col + cols) do
					cols += 1
				end

				local rows = 1
				while row + rows <= grid.height do
					local rowIsFree = true
					for scanCol = col, col + cols - 1 do
						if not isFree(row + rows, scanCol) then
							rowIsFree = false
							break
						end
					end
					if not rowIsFree then
						break
					end
					rows += 1
				end

				for markRow = row, row + rows - 1 do
					for markCol = col, col + cols - 1 do
						used[markRow][markCol] = true
					end
				end
				table.insert(rects, { row = row, col = col, rows = rows, cols = cols })
			end
		end
	end

	return rects
end

--- Finds every edge between a floor cell and an empty cell, merged into straight runs.
--- @param grid Grid -- Parsed grid (must have no pinch points)
--- @return { WallRun } -- Wall runs along X (between rows) and along Z (between columns)
local function collectWallRuns(grid: Grid): { WallRun }
	local runs: { WallRun } = {}

	-- Walls along X lie on grid line `line`, between row `line` and row `line + 1`.
	for line = 0, grid.height do
		local runStart: number? = nil
		for col = 1, grid.width + 1 do
			local isWall = col <= grid.width and isFloor(grid, line, col) ~= isFloor(grid, line + 1, col)
			if isWall and runStart == nil then
				runStart = col
			elseif not isWall and runStart ~= nil then
				table.insert(runs, { axis = "X", line = line, from = runStart - 1, to = col - 1 })
				runStart = nil
			end
		end
	end

	-- Walls along Z lie on grid line `line`, between column `line` and column `line + 1`.
	for line = 0, grid.width do
		local runStart: number? = nil
		for row = 1, grid.height + 1 do
			local isWall = row <= grid.height and isFloor(grid, row, line) ~= isFloor(grid, row, line + 1)
			if isWall and runStart == nil then
				runStart = row
			elseif not isWall and runStart ~= nil then
				table.insert(runs, { axis = "Z", line = line, from = runStart - 1, to = row - 1 })
				runStart = nil
			end
		end
	end

	return runs
end

--- Converts a vertical grid line index to a world X coordinate (map centred on the origin).
--- @param grid Grid -- Parsed grid
--- @param line number -- Grid line index, 0 = west edge of the grid
--- @return number -- World X in studs
local function gridLineX(grid: Grid, line: number): number
	return (line - grid.width / 2) * CELL_SIZE
end

--- Converts a horizontal grid line index to a world Z coordinate (map centred on the origin).
--- @param grid Grid -- Parsed grid
--- @param line number -- Grid line index, 0 = north edge of the grid
--- @return number -- World Z in studs
local function gridLineZ(grid: Grid, line: number): number
	return (line - grid.height / 2) * CELL_SIZE
end

--- Creates one anchored block in the map's style.
--- @param name string -- Instance name
--- @param size Vector3 -- Block size in studs
--- @param position Vector3 -- Block centre in world space
--- @param color BrickColor -- Block colour
--- @param parent Instance -- Where to put the block
--- @return Part -- The created block
local function makeBlock(name: string, size: Vector3, position: Vector3, color: BrickColor, parent: Instance): Part
	local part = Instance.new("Part")
	part.Name = name
	part.Anchored = true
	part.Size = size
	part.CFrame = CFrame.new(position)
	part.BrickColor = color
	if CLASSIC_STUDS then
		part.Material = Enum.Material.Plastic
		part.TopSurface = Enum.SurfaceType.Studs
		part.BottomSurface = Enum.SurfaceType.Inlet
	else
		part.Material = Enum.Material.SmoothPlastic
		part.TopSurface = Enum.SurfaceType.Smooth
		part.BottomSurface = Enum.SurfaceType.Smooth
	end
	part.Parent = parent
	return part
end

--- Builds the floor blocks.
--- @param grid Grid -- Parsed grid
--- @param parent Instance -- Folder for the floor blocks
--- @return number -- Number of blocks created
local function buildFloor(grid: Grid, parent: Instance): number
	local rects = meshFloor(grid)
	for index, rect in rects do
		local minX = gridLineX(grid, rect.col - 1)
		local maxX = gridLineX(grid, rect.col - 1 + rect.cols)
		local minZ = gridLineZ(grid, rect.row - 1)
		local maxZ = gridLineZ(grid, rect.row - 1 + rect.rows)
		makeBlock(
			`Floor{index}`,
			Vector3.new(maxX - minX, FLOOR_THICKNESS, maxZ - minZ),
			Vector3.new((minX + maxX) / 2, FLOOR_TOP_Y - FLOOR_THICKNESS / 2, (minZ + maxZ) / 2),
			FLOOR_COLOR,
			parent
		)
	end
	return #rects
end

--- Works out the ground footprint of one wall run.
--- @param grid Grid -- Parsed grid
--- @param run WallRun -- The wall run
--- @return (number, number, number, number) -- minX, maxX, minZ, maxZ in studs
local function wallFootprint(grid: Grid, run: WallRun): (number, number, number, number)
	local halfThickness = WALL_THICKNESS / 2
	if run.axis == "X" then
		-- X walls overshoot each end by half a thickness so they fill the corner squares.
		local z = gridLineZ(grid, run.line)
		return gridLineX(grid, run.from) - halfThickness, gridLineX(grid, run.to) + halfThickness, z - halfThickness, z + halfThickness
	end
	-- Z walls stop half a thickness short of each corner so they never overlap an X wall.
	local x = gridLineX(grid, run.line)
	return x - halfThickness, x + halfThickness, gridLineZ(grid, run.from) + halfThickness, gridLineZ(grid, run.to) - halfThickness
end

--- Builds the wall blocks, centred on every floor/empty edge, each with a strap block under it.
--- @param grid Grid -- Parsed grid (must have no pinch points)
--- @param wallParent Instance -- Folder for the wall blocks
--- @param strapParent Instance? -- Folder for the strap blocks; nil when STRAP_HEIGHT is 0
--- @return (number, number) -- Number of wall blocks and strap blocks created
local function buildWalls(grid: Grid, wallParent: Instance, strapParent: Instance?): (number, number)
	local runs = collectWallRuns(grid)
	local bottomY = FLOOR_TOP_Y - FLOOR_THICKNESS - WALL_SINK
	local strapTopY = FLOOR_TOP_Y + STRAP_HEIGHT
	local topY = FLOOR_TOP_Y + WALL_HEIGHT
	-- The strap is the bottom slice of the wall, so both share one footprint and never overlap.
	local wallBottomY = if strapParent then strapTopY else bottomY

	for index, run in runs do
		local minX, maxX, minZ, maxZ = wallFootprint(grid, run)
		local function makeSlice(name: string, fromY: number, toY: number, color: BrickColor, parent: Instance): ()
			makeBlock(
				name,
				Vector3.new(maxX - minX, toY - fromY, maxZ - minZ),
				Vector3.new((minX + maxX) / 2, (fromY + toY) / 2, (minZ + maxZ) / 2),
				color,
				parent
			)
		end
		makeSlice(`Wall{index}`, wallBottomY, topY, WALL_COLOR, wallParent)
		if strapParent then
			makeSlice(`Strap{index}`, bottomY, strapTopY, STRAP_COLOR, strapParent)
		end
	end

	return #runs, if strapParent then #runs else 0
end

--- Builds the spawn pad on top of the floor at SPAWN_CELL.
--- @param grid Grid -- Parsed grid
--- @param parent Instance -- Map model
--- @return SpawnLocation -- The created spawn
local function buildSpawn(grid: Grid, parent: Instance): SpawnLocation
	local spawnLocation = Instance.new("SpawnLocation")
	spawnLocation.Name = "SpawnLocation"
	spawnLocation.Anchored = true
	spawnLocation.Neutral = true
	spawnLocation.Size = SPAWN_SIZE
	spawnLocation.CFrame = CFrame.new(
		gridLineX(grid, SPAWN_CELL.col - 0.5),
		FLOOR_TOP_Y + SPAWN_SIZE.Y / 2,
		gridLineZ(grid, SPAWN_CELL.row - 0.5)
	)
	spawnLocation.BrickColor = FLOOR_COLOR
	spawnLocation.Material = if CLASSIC_STUDS then Enum.Material.Plastic else Enum.Material.SmoothPlastic
	spawnLocation.TopSurface = Enum.SurfaceType.Smooth
	spawnLocation.BottomSurface = Enum.SurfaceType.Smooth
	spawnLocation.Parent = parent
	return spawnLocation
end

--- Turns x, height above the floor and z into a world position.
--- @return Vector3 -- World position
local function at(x: number, height: number, z: number): Vector3
	return Vector3.new(x, FLOOR_TOP_Y + height, z)
end

--- Creates a folder for one play area, with its description as an attribute (shown in Properties).
--- @param parent Instance -- The Sections folder
--- @param name string -- Area name
--- @param description string -- One-line description
--- @return Folder -- The area's folder
local function newSection(parent: Instance, name: string, description: string): Folder
	local folder = Instance.new("Folder")
	folder.Name = name
	folder:SetAttribute("Description", description)
	folder.Parent = parent
	return folder
end

--- Creates an axis-aligned block between two corners.
--- @return Part -- The created block
local function blockBetween(parent: Instance, name: string, minCorner: Vector3, maxCorner: Vector3, color: BrickColor): Part
	local size = maxCorner - minCorner
	assert(size.X > 0 and size.Y > 0 and size.Z > 0, `[RMapBuilder] {name} has a zero or negative size`)
	return makeBlock(name, size, (minCorner + maxCorner) / 2, color, parent)
end

--- Builds a 1-stud-thick platform with its top at `topHeight`, optionally on four corner pillars.
--- @return Part -- The platform deck
local function platform(
	parent: Instance,
	name: string,
	minX: number,
	minZ: number,
	maxX: number,
	maxZ: number,
	topHeight: number,
	color: BrickColor,
	withPillars: boolean
): Part
	local deck = blockBetween(parent, name, at(minX, topHeight - 1, minZ), at(maxX, topHeight, maxZ), color)
	if withPillars then
		local corners = { { minX, minZ }, { maxX - 2, minZ }, { minX, maxZ - 2 }, { maxX - 2, maxZ - 2 } }
		for index, corner in corners do
			blockBetween(
				parent,
				`{name}Pillar{index}`,
				at(corner[1], 0, corner[2]),
				at(corner[1] + 2, topHeight - 1, corner[2] + 2),
				PILLAR_COLOR
			)
		end
	end
	return deck
end

--- Builds a climbable TrussPart ladder standing on the floor, centred on (x, z).
--- @param height number -- Must be a multiple of 2 (a TrussPart rule)
--- @return TrussPart -- The ladder
local function ladder(parent: Instance, name: string, x: number, z: number, height: number): TrussPart
	assert(height >= 2 and height % 2 == 0, `[RMapBuilder] {name} height must be a multiple of 2`)
	local truss = Instance.new("TrussPart")
	truss.Name = name
	truss.Anchored = true
	truss.Size = Vector3.new(2, height, 2)
	truss.CFrame = CFrame.new(at(x, height / 2, z))
	truss.BrickColor = LADDER_COLOR
	truss.Parent = parent
	return truss
end

--- Builds a CFrame at `position` whose front faces `direction`, with its up kept in the vertical plane.
--- Written out as a rotation matrix (not CFrame.lookAt) so tools that export the model get it exactly.
--- @return CFrame -- The facing CFrame
local function facing(position: Vector3, direction: Vector3): CFrame
	local look = direction.Unit
	local right = look:Cross(Vector3.new(0, 1, 0)).Unit
	local up = right:Cross(look)
	-- Matrix columns are RightVector, UpVector and -LookVector.
	return CFrame.new(
		position.X,
		position.Y,
		position.Z,
		right.X,
		up.X,
		-look.X,
		right.Y,
		up.Y,
		-look.Y,
		right.Z,
		up.Z,
		-look.Z
	)
end

--- Builds a ramp whose walking surface runs in a straight line from `low` up to `high`.
--- @return Part -- The ramp
local function ramp(parent: Instance, name: string, low: Vector3, high: Vector3, width: number): Part
	local surface = facing((low + high) / 2, high - low)
	local part = makeBlock(name, Vector3.new(width, RAMP_THICKNESS, (high - low).Magnitude), surface.Position, RAMP_COLOR, parent)
	part.CFrame = surface * CFrame.new(0, -RAMP_THICKNESS / 2, 0)
	return part
end

--- Builds a lamp post with a glowing neon head and a warm light.
local function lamp(parent: Instance, name: string, x: number, z: number): ()
	blockBetween(parent, `{name}Post`, at(x - 0.5, 0, z - 0.5), at(x + 0.5, LAMP_HEIGHT, z + 0.5), LAMP_POST_COLOR)
	local head = blockBetween(parent, `{name}Light`, at(x - 1, LAMP_HEIGHT, z - 1), at(x + 1, LAMP_HEIGHT + 2, z + 1), LAMP_LIGHT_COLOR)
	head.Material = Enum.Material.Neon
	head.TopSurface = Enum.SurfaceType.Smooth
	head.BottomSurface = Enum.SurfaceType.Smooth
	local light = Instance.new("PointLight")
	light.Range = 18
	light.Color = Color3.fromRGB(255, 214, 140)
	light.Parent = head
end

--- Builds a straight wall split into blocks around its openings (doors and windows).
--- @param axis "X" | "Z" -- Direction the wall runs in
--- @param from number -- Start along the wall
--- @param to number -- End along the wall
--- @param side0 number -- Start across the wall (its thickness)
--- @param side1 number -- End across the wall
--- @param openings { Opening } -- Gaps, sorted along the wall
local function wallWithOpenings(
	parent: Instance,
	name: string,
	axis: "X" | "Z",
	from: number,
	to: number,
	side0: number,
	side1: number,
	height: number,
	openings: { Opening },
	color: BrickColor
): ()
	local count = 0
	local function piece(along0: number, along1: number, bottom: number, top: number): ()
		if along1 <= along0 or top <= bottom then
			return
		end
		count += 1
		if axis == "X" then
			blockBetween(parent, `{name}{count}`, at(along0, bottom, side0), at(along1, top, side1), color)
		else
			blockBetween(parent, `{name}{count}`, at(side0, bottom, along0), at(side1, top, along1), color)
		end
	end

	local cursor = from
	for _, opening in openings do
		piece(cursor, opening.from, 0, height)
		piece(opening.from, opening.to, 0, opening.bottom)
		piece(opening.from, opening.to, opening.top, height)
		cursor = opening.to
	end
	piece(cursor, to, 0, height)
end

--- Spawn Plaza: lamps either side of the spawn pad.
local function buildSpawnPlaza(sections: Instance): ()
	local folder = newSection(sections, "SpawnPlaza", "Where players spawn, lit by two neon lamps.")
	lamp(folder, "LampWest", -94, 90)
	lamp(folder, "LampEast", -66, 90)
end

--- Tunnel: a stone hill filling the stem, with a tunnel through it and a ladder onto its roof.
local function buildTunnel(sections: Instance): ()
	local folder = newSection(
		sections,
		"Tunnel",
		"A stone hill with a tunnel through it. Climb the ladder on its north side to stand on top."
	)
	blockBetween(folder, "HillWest", at(-99, 0, 44), at(-88, 12, 70), STONE_COLOR)
	blockBetween(folder, "HillEast", at(-72, 0, 44), at(-61, 12, 70), STONE_COLOR)
	blockBetween(folder, "TunnelRoof", at(-88, 9, 44), at(-72, 12, 70), STONE_COLOR)
	ladder(folder, "Ladder", -95, 43, 12)
	lamp(folder, "LampWest", -91, 41)
	lamp(folder, "LampEast", -69, 41)
end

--- House: two rooms joined by an inside door, with outside doors, windows and a roof ladder.
local function buildHouse(sections: Instance): ()
	local folder =
		newSection(sections, "House", "A two-room house with doors, windows and a ladder up to its flat roof.")
	local function window(from: number, to: number): Opening
		return { from = from, to = to, bottom = 4, top = 8 }
	end
	local function door(from: number, to: number): Opening
		return { from = from, to = to, bottom = 0, top = 9 }
	end
	wallWithOpenings(folder, "NorthWall", "X", -36, -4, -14, -12, 12, { window(-31, -25), window(-17, -11) }, HOUSE_WALL_COLOR)
	wallWithOpenings(folder, "SouthWall", "X", -36, -4, 16, 18, 12, { window(-31, -25), door(-15, -9) }, HOUSE_WALL_COLOR)
	wallWithOpenings(folder, "WestWall", "Z", -12, 16, -36, -34, 12, { door(-1, 5) }, HOUSE_WALL_COLOR)
	wallWithOpenings(folder, "EastWall", "Z", -12, 16, -6, -4, 12, { window(-1, 5) }, HOUSE_WALL_COLOR)
	wallWithOpenings(folder, "MiddleWall", "Z", -12, 16, -21, -19, 12, { door(6, 12) }, HOUSE_WALL_COLOR)
	blockBetween(folder, "Roof", at(-36, 12, -14), at(-4, 13, 18), HOUSE_ROOF_COLOR)
	ladder(folder, "Ladder", -3, -11, 14)
end

--- Crate Stairs: stacks of 1, 2 and 3 crates leading up to the Sky Bridge.
local function buildCrateStairs(sections: Instance): ()
	local folder = newSection(
		sections,
		"CrateStairs",
		"Wooden crates stacked one, two and three high. Hop up them onto the Sky Bridge."
	)
	local stacks = { { z = -92, levels = 1 }, { z = -99, levels = 2 }, { z = -106, levels = 3 } }
	for stackIndex, stack in stacks do
		for level = 1, stack.levels do
			blockBetween(
				folder,
				`Crate{stackIndex}_{level}`,
				at(-66, (level - 1) * 4, stack.z),
				at(-60, level * 4, stack.z + 6),
				CRATE_COLOR
			)
		end
	end
end

--- Lookout Tower: a platform on pillars in the north-west corner, with a ladder.
local function buildLookoutTower(sections: Instance): ()
	local folder = newSection(
		sections,
		"LookoutTower",
		"A lookout platform 14 studs up in the north-west corner, reached by a ladder."
	)
	platform(folder, "Lookout", -98, -118, -80, -100, 14, DECK_COLOR, true)
	ladder(folder, "Ladder", -89, -99, 14)
end

--- Sky Bridge: a long deck across the top of the R to an east platform.
local function buildSkyBridge(sections: Instance): ()
	local folder = newSection(
		sections,
		"SkyBridge",
		"A long bridge across the top of the R, from the Lookout Tower to the east platform."
	)
	platform(folder, "Deck", -80, -112, 40, -106, 14, DECK_COLOR, false)
	for index, x in { -50, -20, 10 } do
		blockBetween(folder, `DeckPillar{index}`, at(x - 1, 0, -110), at(x + 1, 13, -108), PILLAR_COLOR)
	end
	platform(folder, "EastPlatform", 40, -118, 58, -100, 14, DECK_COLOR, true)
end

--- Sky Steps: rainbow floating platforms from the east platform down to the courtyard.
local function buildSkySteps(sections: Instance): ()
	local folder = newSection(
		sections,
		"SkySteps",
		"Six rainbow platforms floating down from the bridge's east platform to the courtyard."
	)
	for index, step in SKY_STEPS do
		platform(folder, `Step{index}`, step[1], step[2], step[3], step[4], step[5], SKY_STEP_COLORS[index], false)
	end
end

--- Slope Hill: a ramp up, a hill and a ramp down, laid out along the leg's diagonal.
local function buildSlopeHill(sections: Instance): ()
	local folder = newSection(sections, "SlopeHill", "Ramps up and over a hill running down the R's leg.")
	local origin = at(10, 0, 30)
	local forward = Vector3.new(1, 0, 1).Unit -- down the leg (south-east)
	local hillHeight = 8
	local function along(distance: number, height: number): Vector3
		return origin + forward * distance + Vector3.new(0, height, 0)
	end
	ramp(folder, "RampUp", along(14, 0), along(44, hillHeight), 10)
	local hillCenter = along(51, hillHeight / 2)
	local hill = makeBlock("Hill", Vector3.new(14, hillHeight, 14), hillCenter, DECK_COLOR, folder)
	hill.CFrame = facing(hillCenter, forward)
	ramp(folder, "RampDown", along(88, 0), along(58, hillHeight), 10)
end

--- Finish Podium: 1st, 2nd and 3rd place blocks at the end of the leg.
local function buildFinishPodium(sections: Instance): ()
	local folder = newSection(
		sections,
		"FinishPodium",
		"A winners' podium for 1st, 2nd and 3rd place at the end of the leg."
	)
	blockBetween(folder, "Second", at(66, 0, 106), at(74, 3, 114), PODIUM_SECOND_COLOR)
	blockBetween(folder, "First", at(74, 0, 106), at(82, 5, 114), PODIUM_FIRST_COLOR)
	blockBetween(folder, "Third", at(82, 0, 106), at(90, 2, 114), PODIUM_THIRD_COLOR)
end

--- Builds every play area into a Sections folder, in the order players loop through them.
--- @param model Model -- The map model
--- @return (number, number) -- Number of areas and number of parts in them
local function buildSections(model: Model): (number, number)
	local sections = Instance.new("Folder")
	sections.Name = "Sections"
	sections.Parent = model

	local builders: { (Instance) -> () } = {
		buildSpawnPlaza,
		buildTunnel,
		buildHouse,
		buildCrateStairs,
		buildLookoutTower,
		buildSkyBridge,
		buildSkySteps,
		buildSlopeHill,
		buildFinishPodium,
	}
	for _, build in builders do
		build(sections)
	end

	local partCount = 0
	for _, descendant in sections:GetDescendants() do
		if descendant:IsA("BasePart") then
			partCount += 1
		end
	end
	return #builders, partCount
end

--- Removes the Baseplate template's own baseplate and spawn from Workspace.
local function removeTemplateParts(): ()
	local baseplate = Workspace:FindFirstChild("Baseplate")
	if baseplate and baseplate:IsA("BasePart") then
		baseplate:Destroy()
		print("[RMapBuilder] Removed the template Baseplate")
	end

	local templateSpawn = Workspace:FindFirstChild("SpawnLocation")
	if templateSpawn and templateSpawn:IsA("SpawnLocation") then
		templateSpawn:Destroy()
		print("[RMapBuilder] Removed the template SpawnLocation")
	end
end

--- Checks the settings and the shape before anything in Workspace is touched.
--- @param grid Grid -- Parsed grid
local function validate(grid: Grid): ()
	assert(CELL_SIZE > 0, "[RMapBuilder] CELL_SIZE must be greater than 0")
	assert(FLOOR_THICKNESS > 0, "[RMapBuilder] FLOOR_THICKNESS must be greater than 0")
	assert(WALL_HEIGHT > 0, "[RMapBuilder] WALL_HEIGHT must be greater than 0")
	assert(
		STRAP_HEIGHT >= 0 and STRAP_HEIGHT < WALL_HEIGHT,
		"[RMapBuilder] STRAP_HEIGHT must be 0 or more and smaller than WALL_HEIGHT"
	)
	assert(
		WALL_THICKNESS > 0 and WALL_THICKNESS < CELL_SIZE,
		"[RMapBuilder] WALL_THICKNESS must be greater than 0 and smaller than CELL_SIZE"
	)
	assert(
		math.max(grid.width, grid.height) * CELL_SIZE <= 2048,
		"[RMapBuilder] Map is wider than 2048 studs (the max part size); lower CELL_SIZE or shrink SHAPE"
	)

	local pinchRow, pinchCol = findPinchPoint(grid)
	if pinchRow ~= nil and pinchCol ~= nil then
		error(
			`[RMapBuilder] SHAPE lines {pinchRow}-{pinchRow + 1}, columns {pinchCol}-{pinchCol + 1}: `
				.. "two floor cells touch only at a corner. Fill one of the empty cells there."
		)
	end

	local spawnRow = math.floor(SPAWN_CELL.row)
	local spawnCol = math.floor(SPAWN_CELL.col)
	for _, row in { spawnRow, math.ceil(SPAWN_CELL.row) } do
		for _, col in { spawnCol, math.ceil(SPAWN_CELL.col) } do
			assert(isFloor(grid, row, col), `[RMapBuilder] SPAWN_CELL touches line {row}, column {col}, which is not floor`)
		end
	end

	local totalCells = countFloorCells(grid)
	local reachableCells = countReachableCells(grid, spawnRow, spawnCol)
	if reachableCells < totalCells then
		warn(
			`[RMapBuilder] {totalCells - reachableCells} floor cells are walled off from the spawn and can't be reached on foot`
		)
	end
end

--- Respawns players who already have a character, so nobody is left on the old map.
local function respawnExistingCharacters(): ()
	if not (RunService:IsRunning() and RunService:IsServer()) then
		return
	end
	for _, player in Players:GetPlayers() do
		if player.Character then
			task.spawn(function(): ()
				local ok, err = pcall(player.LoadCharacterAsync, player)
				if not ok then
					warn(`[RMapBuilder] Could not respawn {player.Name}: {err}`)
				end
			end)
		end
	end
end

-- // PUBLIC FUNCTIONS

--- Builds (or rebuilds) the R map in Workspace.
--- @return Model -- The map model
local function buildMap(): Model
	local grid = parseShape(SHAPE)
	validate(grid)

	local existing = Workspace:FindFirstChild(MODEL_NAME)
	if existing and existing:IsA("Model") then
		existing:Destroy()
	end
	if REMOVE_TEMPLATE_PARTS then
		removeTemplateParts()
	end

	local model = Instance.new("Model")
	model.Name = MODEL_NAME

	local floorFolder = Instance.new("Folder")
	floorFolder.Name = "Floor"
	floorFolder.Parent = model

	local wallFolder = Instance.new("Folder")
	wallFolder.Name = "Walls"
	wallFolder.Parent = model

	local strapFolder: Folder? = nil
	if STRAP_HEIGHT > 0 then
		local folder = Instance.new("Folder")
		folder.Name = "Straps"
		folder.Parent = model
		strapFolder = folder
	end

	local floorCount = buildFloor(grid, floorFolder)
	local wallCount, strapCount = buildWalls(grid, wallFolder, strapFolder)
	buildSpawn(grid, model)

	local sectionCount, sectionPartCount = 0, 0
	if BUILD_SECTIONS then
		sectionCount, sectionPartCount = buildSections(model)
	end

	model.WorldPivot = CFrame.new(0, FLOOR_TOP_Y, 0)
	model.Parent = Workspace

	print(
		`[RMapBuilder] Built {MODEL_NAME}: {grid.width * CELL_SIZE} x {grid.height * CELL_SIZE} studs, `
			.. `{floorCount} floor blocks, {wallCount} wall blocks, {strapCount} strap blocks, `
			.. `{sectionCount} play areas ({sectionPartCount} parts)`
	)
	return model
end

-- // CONNECTIONS
-- None: the map is static once built.

-- // INIT
buildMap()
respawnExistingCharacters()
