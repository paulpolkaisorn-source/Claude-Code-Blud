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

local FLOOR_COLOR = BrickColor.new("Medium stone grey")
local WALL_COLOR = BrickColor.new("Dark stone grey")
local CLASSIC_STUDS = true -- studs on top faces for the classic blocky look

-- Grid position of the spawn (1-based; fractions allowed, col 1.5 = between cols 1 and 2).
local SPAWN_CELL = { row = 11, col = 1.5 }
local SPAWN_SIZE = Vector3.new(12, 1, 12)

local MODEL_NAME = "RMap"

-- Removes the "Baseplate" and "SpawnLocation" that Studio's Baseplate template puts in
-- Workspace. The baseplate would fill the R's hole and z-fight with the R's floor, and
-- the template spawn would sit on top of a wall. Set to false to keep them.
local REMOVE_TEMPLATE_PARTS = true

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

--- Builds the wall blocks, centred on every floor/empty edge.
--- @param grid Grid -- Parsed grid (must have no pinch points)
--- @param parent Instance -- Folder for the wall blocks
--- @return number -- Number of blocks created
local function buildWalls(grid: Grid, parent: Instance): number
	local runs = collectWallRuns(grid)
	local halfThickness = WALL_THICKNESS / 2
	local bottomY = FLOOR_TOP_Y - FLOOR_THICKNESS - WALL_SINK
	local topY = FLOOR_TOP_Y + WALL_HEIGHT
	local centerY = (bottomY + topY) / 2
	local height = topY - bottomY

	for index, run in runs do
		local size: Vector3
		local position: Vector3
		if run.axis == "X" then
			-- X walls overshoot each end by half a thickness so they fill the corner squares.
			local minX = gridLineX(grid, run.from) - halfThickness
			local maxX = gridLineX(grid, run.to) + halfThickness
			size = Vector3.new(maxX - minX, height, WALL_THICKNESS)
			position = Vector3.new((minX + maxX) / 2, centerY, gridLineZ(grid, run.line))
		else
			-- Z walls stop half a thickness short of each corner so they never overlap an X wall.
			local minZ = gridLineZ(grid, run.from) + halfThickness
			local maxZ = gridLineZ(grid, run.to) - halfThickness
			size = Vector3.new(WALL_THICKNESS, height, maxZ - minZ)
			position = Vector3.new(gridLineX(grid, run.line), centerY, (minZ + maxZ) / 2)
		end
		makeBlock(`Wall{index}`, size, position, WALL_COLOR, parent)
	end

	return #runs
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

	local floorCount = buildFloor(grid, floorFolder)
	local wallCount = buildWalls(grid, wallFolder)
	buildSpawn(grid, model)

	model.WorldPivot = CFrame.new(0, FLOOR_TOP_Y, 0)
	model.Parent = Workspace

	print(
		`[RMapBuilder] Built {MODEL_NAME}: {grid.width * CELL_SIZE} x {grid.height * CELL_SIZE} studs, `
			.. `{floorCount} floor blocks, {wallCount} wall blocks`
	)
	return model
end

-- // CONNECTIONS
-- None: the map is static once built.

-- // INIT
buildMap()
respawnExistingCharacters()
