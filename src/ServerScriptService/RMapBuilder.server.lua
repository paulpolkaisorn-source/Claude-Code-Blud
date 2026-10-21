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
local Lighting = game:GetService("Lighting")
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
	glass: boolean?, -- fill the gap with a window pane
}

-- Gives every part whose path inside the map (e.g. "Sections/House/Roof") matches `pattern` a material.
type MaterialRule = {
	pattern: string,
	material: Enum.Material,
}

-- A wall between two play areas with one big door. It runs along `axis` on world line `line`
-- (z for "X", x for "Z"), from `from` to `to`, with the door between `doorFrom` and `doorTo`.
type Divider = {
	name: string,
	axis: "X" | "Z",
	line: number,
	from: number,
	to: number,
	doorFrom: number,
	doorTo: number,
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
local CAP_COLOR = BrickColor.new("Medium stone grey")
local CAP_HEIGHT = 1 -- a slightly wider coping along the top of every wall; 0 for none
local CAP_OVERHANG = 0.3
local SPAWN_COLOR = BrickColor.new("Light stone grey")
-- true: classic plastic with studs everywhere. false: realistic Roblox materials (see MATERIAL_RULES).
local CLASSIC_STUDS = false

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
-- them too. Nothing anyone can stand on is higher than 17 studs (a jump adds about 7), so players
-- can't get over the walls, which reach 25 studs with their caps.
local BUILD_SECTIONS = true
local RAMP_THICKNESS = 1
local LAMP_HEIGHT = 10
local RAMP_ANGLE = 20 -- degrees; every raised platform is reached by walking up a ramp, no jumping needed
local LAMP_POST_COLOR = BrickColor.new("Black")
local LAMP_LIGHT_COLOR = BrickColor.new("Bright yellow")
local STONE_COLOR = BrickColor.new("Medium stone grey")
local HOUSE_WALL_COLOR = BrickColor.new("Institutional white")
local HOUSE_ROOF_COLOR = BrickColor.new("Bright red")
local DECK_COLOR = BrickColor.new("Nougat")
local HILL_COLOR = BrickColor.new("Sea green")
local PILLAR_COLOR = BrickColor.new("Medium stone grey")
local RAMP_COLOR = BrickColor.new("Nougat")
local PODIUM_FIRST_COLOR = BrickColor.new("Bright yellow")
local PODIUM_SECOND_COLOR = BrickColor.new("Medium stone grey")
local PODIUM_THIRD_COLOR = BrickColor.new("Bright orange")
local BLACK = BrickColor.new("Black")
local WHITE = BrickColor.new("Institutional white")
local WOOD_COLOR = BrickColor.new("Reddish brown")
local GOLD_COLOR = BrickColor.new("Deep orange")
local BLANKET_COLOR = BrickColor.new("Bright blue")
local BEDROOM_RUG_COLOR = BrickColor.new("Bright violet")
local LIVING_RUG_COLOR = BrickColor.new("Sand blue")
local FRIDGE_COLOR = BrickColor.new("Medium stone grey")
local STOOL_COLOR = BrickColor.new("Bright red")
local TV_SCREEN_COLOR = BrickColor.new("Bright blue")
local COUCH_COLOR = BrickColor.new("Bright red")
local LEAF_COLOR = BrickColor.new("Dark green")
local STATUE_DETAIL_COLOR = BrickColor.new("Dark stone grey") -- carved eyes and smile
local CABINET_COLOR = BrickColor.new("Reddish brown")
local CABINET_DOOR_COLOR = BrickColor.new("Brown")

-- Closed wooden cabinets in free corners: { minX, minZ, maxX, maxZ } and the way the doors face
-- (N = -Z, S = +Z, W = -X, E = +X). The back and one side of each touch the walls.
local CABINETS: { { area: { number }, facing: "N" | "S" | "E" | "W" } } = {
	{ area = { -67, 116, -61, 119 }, facing = "N" }, -- spawn plaza, south-east corner
	{ area = { -99, 33, -96, 39 }, facing = "E" }, -- courtyard, beside the Spawn Gate
	{ area = { -99, -59, -96, -53 }, facing = "E" }, -- courtyard, beside the Lookout Gate
	{ area = { 93, -64, 99, -61 }, facing = "N" }, -- top room, east corner
	{ area = { 96, -7, 99, -1 }, facing = "W" }, -- courtyard, east corner
	{ area = { 1, 41, 7, 44 }, facing = "S" }, -- Slope Hill room, beside the Slope Gate
	{ area = { 61, 116, 67, 119 }, facing = "N" }, -- podium room, south-west corner
}
local COLA_COLOR = BrickColor.new("Bright red")
local LOGO_COLOR = BrickColor.new("Institutional white")
local GIANT_BRICK_COLOR = BrickColor.new("Bright red")
local GLASS_COLOR = BrickColor.new("Light blue")
local GLASS_TRANSPARENCY = 0.5
local RAIL_COLOR = BrickColor.new("Black")
local RAIL_HEIGHT = 2.5
local TRUNK_COLOR = BrickColor.new("Brown")
local LEAF_LIGHT_COLOR = BrickColor.new("Sea green")
local PATH_COLOR = BrickColor.new("Medium stone grey")
local ROAD_COLOR = BrickColor.new("Dark stone grey")
local CHIMNEY_COLOR = BrickColor.new("Reddish brown")
local BEDROOM_FLOOR_COLOR = BrickColor.new("Sand blue")
local KITCHEN_FLOOR_COLOR = BrickColor.new("Institutional white")
local LIVING_FLOOR_COLOR = BrickColor.new("Nougat")

-- Landscape, in world x, z: blocky trees, bushes and stone paths.
local TREES: { { number } } = {
	{ -94, 112 },
	{ -66, 112 },
	{ -92, 18 },
	{ -50, -48 },
	{ -66, -72 },
	{ 26, -72 },
	{ 50, 28 },
	{ 92, -10 },
	{ 95, 114 },
}
local BUSHES: { { number } } = { { -8, 33 }, { 0, 33 }, { -58, -10 }, { -66, -10 } }
-- Paths as { minX, minZ, maxX, maxZ }; "Road" is the asphalt through the tunnel.
local PATHS: { { name: string, area: { number } } } = {
	{ name = "PathSpawn", area = { -84, 70, -76, 84 } },
	{ name = "Road", area = { -86, 44, -74, 70 } },
	{ name = "PathGate", area = { -84, 35, -76, 44 } },
	{ name = "PathHouse", area = { -84, 30, -14, 35 } },
}

-- Realistic materials, matched in order against each part's path inside the map (first match wins).
-- Neon and glass parts keep their own material. Ignored when CLASSIC_STUDS is true.
local MATERIAL_RULES: { MaterialRule } = {
	{ pattern = "^Floor/", material = Enum.Material.Grass },
	{ pattern = "^Walls/", material = Enum.Material.Concrete },
	{ pattern = "^Caps/", material = Enum.Material.Concrete },
	{ pattern = "^Straps/", material = Enum.Material.Brick },
	{ pattern = "^Dividers/.*Strap", material = Enum.Material.Brick },
	{ pattern = "^Dividers/", material = Enum.Material.Concrete },
	{ pattern = "^SpawnLocation$", material = Enum.Material.Marble },
	{ pattern = "Trunk$", material = Enum.Material.Wood },
	{ pattern = "Leaves%d*$", material = Enum.Material.LeafyGrass },
	{ pattern = "^Landscape/Bush", material = Enum.Material.LeafyGrass },
	{ pattern = "^Landscape/Road", material = Enum.Material.Asphalt },
	{ pattern = "^Landscape/Path", material = Enum.Material.Cobblestone },
	{ pattern = "Post%d*$", material = Enum.Material.Metal },
	{ pattern = "Rail$", material = Enum.Material.Metal },
	{ pattern = "Pillar%d*$", material = Enum.Material.Concrete },
	{ pattern = "^Sections/SlopeHill/Hill$", material = Enum.Material.Grass },
	{ pattern = "^Sections/SlopeHill/", material = Enum.Material.Ground },
	{ pattern = "^Sections/FinishPodium/.*Ramp$", material = Enum.Material.Marble },
	{ pattern = "^Sections/FinishPodium/", material = Enum.Material.Foil },
	{ pattern = "^Sections/RainbowRamp/", material = Enum.Material.SmoothPlastic },
	{ pattern = "Ramp[^/]*$", material = Enum.Material.WoodPlanks },
	{ pattern = "^Sections/Tunnel/", material = Enum.Material.Rock },
	{ pattern = "^Sections/House/BedroomFloor$", material = Enum.Material.Carpet },
	{ pattern = "^Sections/House/KitchenFloor$", material = Enum.Material.CeramicTiles },
	{ pattern = "^Sections/House/LivingFloor$", material = Enum.Material.WoodPlanks },
	{ pattern = "^Sections/House/Roof$", material = Enum.Material.RoofShingles },
	{ pattern = "^Sections/House/Chimney$", material = Enum.Material.Brick },
	{ pattern = "^Sections/House/.*Wall%d*$", material = Enum.Material.Plaster },
	{ pattern = "^Sections/House/.*Rug$", material = Enum.Material.Fabric },
	{ pattern = "^Sections/House/Mattress$", material = Enum.Material.Fabric },
	{ pattern = "^Sections/House/Pillow$", material = Enum.Material.Fabric },
	{ pattern = "^Sections/House/Blanket$", material = Enum.Material.Fabric },
	{ pattern = "^Sections/House/Couch", material = Enum.Material.Fabric },
	{ pattern = "^Sections/House/Counter$", material = Enum.Material.Marble },
	{ pattern = "^Sections/House/Stove$", material = Enum.Material.Metal },
	{ pattern = "^Sections/House/Fridge$", material = Enum.Material.Metal },
	{ pattern = "^Sections/House/PlantPot", material = Enum.Material.Concrete },
	{ pattern = "^Sections/House/Stool", material = Enum.Material.SmoothPlastic },
	{ pattern = "^Sections/House/", material = Enum.Material.Wood },
	{ pattern = "^Sections/NoobStatue/Base$", material = Enum.Material.Granite },
	{ pattern = "^Sections/NoobStatue/", material = Enum.Material.Slate },
	{ pattern = "^Sections/BloxyCola/Machine%d$", material = Enum.Material.Metal },
	{ pattern = "^Sections/BloxyTrophy/Pedestal", material = Enum.Material.Marble },
	{ pattern = "^Sections/BloxyTrophy/", material = Enum.Material.Foil },
	{ pattern = "^Sections/RobloxLogo/Stage$", material = Enum.Material.Granite },
	{ pattern = "^Sections/GiantBrick/", material = Enum.Material.Plastic },
	{ pattern = "^Sections/Cabinets/.*Handle%d$", material = Enum.Material.Metal },
	{ pattern = "^Sections/Cabinets/", material = Enum.Material.Wood },
	{ pattern = "^Sections/.*/Lookout$", material = Enum.Material.WoodPlanks },
	{ pattern = "^Sections/SkyBridge/", material = Enum.Material.WoodPlanks },
}

-- Realistic lighting (sun, haze, colour grading, glow). The settings ride along inside the map on a
-- Script called RealisticLighting, which applies them every time the game starts.
local APPLY_LIGHTING = true
local LIGHTING_PROPERTIES: { [string]: any } = {
	Technology = "Future",
	ClockTime = 14.5,
	GeographicLatitude = 35,
	Brightness = 2.5,
	Ambient = Color3.fromRGB(70, 70, 78),
	OutdoorAmbient = Color3.fromRGB(135, 138, 150),
	EnvironmentDiffuseScale = 1,
	EnvironmentSpecularScale = 1,
	ShadowSoftness = 0.2,
	GlobalShadows = true,
}
local LIGHTING_SCRIPT_SOURCE = [[
-- Applies RMap's realistic lighting when the game starts. The settings are this script's
-- attributes (Lighting properties) and children (sky effects); change them in Properties.
local Lighting = game:GetService("Lighting")
for name, value in script:GetAttributes() do
	pcall(function()
		Lighting[name] = if name == "Technology" then Enum.Technology[value] else value
	end)
end
for _, effect in script:GetChildren() do
	local old = Lighting:FindFirstChild(effect.Name)
	if old then
		old:Destroy()
	end
	effect:Clone().Parent = Lighting
end
]]

-- Rainbow Ramp stripes, from the top of the ramp to the bottom.
local RAINBOW_COLORS: { BrickColor } = {
	BrickColor.new("Bright red"),
	BrickColor.new("Bright orange"),
	BrickColor.new("Bright yellow"),
	BrickColor.new("Lime green"),
	BrickColor.new("Bright blue"),
	BrickColor.new("Bright violet"),
}

-- Walls that split the map into rooms, styled like the outer walls, each with a big door.
-- Every door lines up with the path or ramp that goes through it.
local DOOR_HEIGHT = 16
local DIVIDERS: { Divider } = {
	{ name = "SpawnGate", axis = "X", line = 40, from = -99, to = -61, doorFrom = -88, doorTo = -72 },
	{ name = "LookoutGate", axis = "X", line = -60, from = -99, to = -41, doorFrom = -96, doorTo = -80 },
	{ name = "RainbowGate", axis = "X", line = -60, from = 41, to = 99, doorFrom = 41, doorTo = 57 },
	{ name = "SlopeGate", axis = "X", line = 40, from = 1, to = 59, doorFrom = 14, doorTo = 30 },
	{ name = "PodiumGate", axis = "X", line = 100, from = 61, to = 99, doorFrom = 66, doorTo = 90 },
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
--- @param halfWidth number -- Half the block's thickness (caps are a little wider than walls)
--- @return (number, number, number, number) -- minX, maxX, minZ, maxZ in studs
local function wallFootprint(grid: Grid, run: WallRun, halfWidth: number): (number, number, number, number)
	if run.axis == "X" then
		-- X walls overshoot each end by half their width so they fill the corner squares.
		local z = gridLineZ(grid, run.line)
		return gridLineX(grid, run.from) - halfWidth, gridLineX(grid, run.to) + halfWidth, z - halfWidth, z + halfWidth
	end
	-- Z walls stop half a width short of each corner so they never overlap an X wall.
	local x = gridLineX(grid, run.line)
	return x - halfWidth, x + halfWidth, gridLineZ(grid, run.from) + halfWidth, gridLineZ(grid, run.to) - halfWidth
end

--- Builds the wall blocks, centred on every floor/empty edge, each with a strap block under it and
--- a slightly wider cap on top.
--- @param grid Grid -- Parsed grid (must have no pinch points)
--- @param wallParent Instance -- Folder for the wall blocks
--- @param strapParent Instance? -- Folder for the strap blocks; nil when STRAP_HEIGHT is 0
--- @param capParent Instance? -- Folder for the cap blocks; nil when CAP_HEIGHT is 0
--- @return (number, number, number) -- Number of wall, strap and cap blocks created
local function buildWalls(
	grid: Grid,
	wallParent: Instance,
	strapParent: Instance?,
	capParent: Instance?
): (number, number, number)
	local runs = collectWallRuns(grid)
	local bottomY = FLOOR_TOP_Y - FLOOR_THICKNESS - WALL_SINK
	local strapTopY = FLOOR_TOP_Y + STRAP_HEIGHT
	local topY = FLOOR_TOP_Y + WALL_HEIGHT
	local half = WALL_THICKNESS / 2
	-- The strap is the bottom slice of the wall, so both share one footprint and never overlap.
	local wallBottomY = if strapParent then strapTopY else bottomY

	for index, run in runs do
		local function makeSlice(
			name: string,
			halfWidth: number,
			fromY: number,
			toY: number,
			color: BrickColor,
			parent: Instance
		): ()
			local minX, maxX, minZ, maxZ = wallFootprint(grid, run, halfWidth)
			makeBlock(
				name,
				Vector3.new(maxX - minX, toY - fromY, maxZ - minZ),
				Vector3.new((minX + maxX) / 2, (fromY + toY) / 2, (minZ + maxZ) / 2),
				color,
				parent
			)
		end
		makeSlice(`Wall{index}`, half, wallBottomY, topY, WALL_COLOR, wallParent)
		if strapParent then
			makeSlice(`Strap{index}`, half, bottomY, strapTopY, STRAP_COLOR, strapParent)
		end
		if capParent then
			makeSlice(`Cap{index}`, half + CAP_OVERHANG, topY, topY + CAP_HEIGHT, CAP_COLOR, capParent)
		end
	end

	return #runs, if strapParent then #runs else 0, if capParent then #runs else 0
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
	spawnLocation.BrickColor = SPAWN_COLOR
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
local function ramp(
	parent: Instance,
	name: string,
	low: Vector3,
	high: Vector3,
	width: number,
	color: BrickColor?
): Part
	local surface = facing((low + high) / 2, high - low)
	local part = makeBlock(
		name,
		Vector3.new(width, RAMP_THICKNESS, (high - low).Magnitude),
		surface.Position,
		color or RAMP_COLOR,
		parent
	)
	part.CFrame = surface * CFrame.new(0, -RAMP_THICKNESS / 2, 0)
	return part
end

--- Works out where a RAMP_ANGLE ramp must start on the floor to reach `top`.
--- @param top Vector3 -- Centre of the ramp's top edge, where it meets the platform
--- @param downhill Vector3 -- Flat direction the ramp runs down towards
--- @return Vector3 -- Centre of the ramp's bottom edge, on the floor
local function rampFoot(top: Vector3, downhill: Vector3): Vector3
	local rise = top.Y - FLOOR_TOP_Y
	local run = rise / math.tan(math.rad(RAMP_ANGLE))
	return top + downhill.Unit * run - Vector3.new(0, rise, 0)
end

--- Builds a RAMP_ANGLE ramp from the floor up to `top`.
--- @return Part -- The ramp
local function rampFromFloor(parent: Instance, name: string, top: Vector3, downhill: Vector3, width: number): Part
	return ramp(parent, name, rampFoot(top, downhill), top, width)
end

--- Makes a part glow (neon), optionally giving it a warm light that reaches `range` studs.
--- @return BasePart -- The same part
local function glow(part: BasePart, range: number?): BasePart
	part.Material = Enum.Material.Neon
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	if range then
		local light = Instance.new("PointLight")
		light.Range = range
		light.Color = Color3.fromRGB(255, 214, 140)
		light.Parent = part
	end
	return part
end

--- Builds a lamp post with a glowing neon head and a warm light.
local function lamp(parent: Instance, name: string, x: number, z: number): ()
	blockBetween(parent, `{name}Post`, at(x - 0.5, 0, z - 0.5), at(x + 0.5, LAMP_HEIGHT, z + 0.5), LAMP_POST_COLOR)
	glow(
		blockBetween(parent, `{name}Light`, at(x - 1, LAMP_HEIGHT, z - 1), at(x + 1, LAMP_HEIGHT + 2, z + 1), LAMP_LIGHT_COLOR),
		18
	)
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

	local panes = 0
	local cursor = from
	for _, opening in openings do
		piece(cursor, opening.from, 0, height)
		piece(opening.from, opening.to, 0, opening.bottom)
		piece(opening.from, opening.to, opening.top, height)
		if opening.glass then
			-- A thin pane down the middle of the wall's thickness.
			panes += 1
			local middle = (side0 + side1) / 2
			local pane = if axis == "X"
				then blockBetween(
					parent,
					`{name}Glass{panes}`,
					at(opening.from, opening.bottom, middle - 0.1),
					at(opening.to, opening.top, middle + 0.1),
					GLASS_COLOR
				)
				else blockBetween(
					parent,
					`{name}Glass{panes}`,
					at(middle - 0.1, opening.bottom, opening.from),
					at(middle + 0.1, opening.top, opening.to),
					GLASS_COLOR
				)
			pane.Material = Enum.Material.Glass
			pane.Transparency = GLASS_TRANSPARENCY
			pane.CastShadow = false
		end
		cursor = opening.to
	end
	piece(cursor, to, 0, height)
end

--- Builds a railing (a top rail on posts) along one straight edge of a platform whose top is at
--- `deckTop`. The rectangle min..max is the railing's footprint, 0.4 studs thick.
local function railing(
	parent: Instance,
	name: string,
	minX: number,
	minZ: number,
	maxX: number,
	maxZ: number,
	deckTop: number
): ()
	blockBetween(parent, `{name}Rail`, at(minX, deckTop + RAIL_HEIGHT - 0.4, minZ), at(maxX, deckTop + RAIL_HEIGHT, maxZ), RAIL_COLOR)
	local alongX = maxX - minX >= maxZ - minZ
	local length = if alongX then maxX - minX else maxZ - minZ
	local spans = math.max(1, math.ceil(length / 6))
	for index = 0, spans do
		local offset = (length - 0.4) * index / spans
		local x = if alongX then minX + offset else minX
		local z = if alongX then minZ else minZ + offset
		blockBetween(parent, `{name}Post{index + 1}`, at(x, deckTop, z), at(x + 0.4, deckTop + RAIL_HEIGHT - 0.4, z + 0.4), RAIL_COLOR)
	end
end

--- Spawn Plaza: lamps either side of the spawn pad.
local function buildSpawnPlaza(sections: Instance): ()
	local folder = newSection(sections, "SpawnPlaza", "Where players spawn, lit by two neon lamps.")
	lamp(folder, "LampWest", -86, 102)
	lamp(folder, "LampEast", -74, 102)
end

--- Tunnel: a stone hill filling the stem, with a tunnel through it and a ramp onto its roof.
local function buildTunnel(sections: Instance): ()
	local folder = newSection(
		sections,
		"Tunnel",
		"A stone hill with a tunnel through it. Walk up the ramp beside the spawn to stand on top."
	)
	blockBetween(folder, "HillWest", at(-99, 0, 44), at(-88, 12, 70), STONE_COLOR)
	blockBetween(folder, "HillEast", at(-72, 0, 44), at(-61, 12, 70), STONE_COLOR)
	blockBetween(folder, "TunnelRoof", at(-88, 9, 44), at(-72, 12, 70), STONE_COLOR)
	rampFromFloor(folder, "Ramp", at(-94, 12, 70), Vector3.new(0, 0, 1), 8)
	lamp(folder, "LampWest", -91, 36)
	lamp(folder, "LampEast", -69, 36)
	for index, z in { 50, 57, 64 } do
		glow(blockBetween(folder, `CeilingLight{index}`, at(-81, 8.7, z - 1), at(-79, 9, z + 1), WHITE), 14)
	end
end

--- House: a big one-floor house with a bedroom, kitchen and living room inside, two wide
--- entrances and a ramp up to its flat roof.
local function buildHouse(sections: Instance): ()
	local folder = newSection(
		sections,
		"House",
		"A big one-floor house: bedroom, kitchen and living room inside, two wide entrances and a ramp up to the flat roof."
	)
	local function window(from: number, to: number): Opening
		return { from = from, to = to, bottom = 4, top = 8, glass = true }
	end
	local function door(from: number, to: number): Opening
		return { from = from, to = to, bottom = 0, top = 9 }
	end
	local function entrance(from: number, to: number): Opening
		return { from = from, to = to, bottom = 0, top = 10 }
	end
	local function box(name: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: BrickColor): Part
		return blockBetween(folder, name, at(x0, y0, z0), at(x1, y1, z1), color)
	end

	-- Shell: outside walls around x -44..4, z -12..30, 12 studs tall, under a flat roof.
	wallWithOpenings(folder, "NorthWall", "X", -44, 4, -12, -10, 12, { window(-39, -35), window(-14, -8) }, HOUSE_WALL_COLOR)
	wallWithOpenings(
		folder,
		"SouthWall",
		"X",
		-44,
		4,
		28,
		30,
		12,
		{ window(-38, -32), entrance(-24, -14), window(-8, -2) },
		HOUSE_WALL_COLOR
	)
	wallWithOpenings(folder, "WestWall", "Z", -10, 28, -44, -42, 12, { window(-4, 2), window(15, 21) }, HOUSE_WALL_COLOR)
	wallWithOpenings(folder, "EastWall", "Z", -10, 28, 2, 4, 12, { entrance(17, 25) }, HOUSE_WALL_COLOR)
	-- Inside walls: the living room (south) opens into the bedroom (north-west) and the kitchen (north-east).
	wallWithOpenings(folder, "HallWall", "X", -42, 2, 8, 10, 12, { door(-27, -21), door(-10, -4) }, HOUSE_WALL_COLOR)
	wallWithOpenings(folder, "KitchenWall", "Z", -10, 8, -20, -18, 12, {}, HOUSE_WALL_COLOR)
	box("Roof", -44, 12, -12, 4, 13, 30, HOUSE_ROOF_COLOR)
	rampFromFloor(folder, "RoofRamp", at(4, 13, -2), Vector3.new(1, 0, 0), 8)
	box("Chimney", -38, 13, -8, -35, 16.5, -5, CHIMNEY_COLOR)
	-- Thin floor coverings: carpet, tiles and wooden boards.
	box("BedroomFloor", -42, 0, -10, -20, 0.1, 8, BEDROOM_FLOOR_COLOR)
	box("KitchenFloor", -20, 0, -10, 2, 0.1, 8, KITCHEN_FLOOR_COLOR)
	box("LivingFloor", -42, 0, 8, 2, 0.1, 28, LIVING_FLOOR_COLOR)

	-- Bedroom
	box("Headboard", -41, 0, -10, -34, 4, -9, WOOD_COLOR)
	box("BedFrame", -41, 0, -9, -34, 1.5, 1, WOOD_COLOR)
	box("Mattress", -41, 1.5, -9, -34, 2.5, 1, WHITE)
	box("Pillow", -40, 2.5, -8.5, -35, 3.2, -6.5, WHITE)
	box("Blanket", -41, 2.5, -5, -34, 2.8, 1, BLANKET_COLOR)
	box("Nightstand", -33, 0, -9, -31, 2, -7, WOOD_COLOR)
	glow(box("NightLamp", -32.5, 2, -8.5, -31.5, 3, -7.5, LAMP_LIGHT_COLOR))
	box("Wardrobe", -28, 0, -10, -21, 8, -8, WOOD_COLOR)
	box("BedroomRug", -40, 0, 2, -30, 0.2, 7, BEDROOM_RUG_COLOR)
	glow(box("BedroomLight", -33, 11.6, -3, -29, 12, 1, WHITE), 20)

	-- Kitchen
	box("Counter", -17, 0, -10, -3, 3.5, -7, WHITE)
	box("Stove", -12, 3.5, -10, -8, 3.7, -7, BLACK)
	box("Fridge", -2, 0, -10, 2, 8, -7, FRIDGE_COLOR)
	box("TableLeg", -9.5, 0, 0, -8.5, 2.5, 1, WOOD_COLOR)
	box("TableTop", -12, 2.5, -2, -6, 3, 3, WOOD_COLOR)
	box("StoolWest", -15, 0, -0.5, -13, 2, 1.5, STOOL_COLOR)
	box("StoolEast", -5, 0, -0.5, -3, 2, 1.5, STOOL_COLOR)
	glow(box("KitchenLight", -11, 11.6, -3, -7, 12, 1, WHITE), 20)

	-- Living room
	box("TVStand", -39, 0, 11, -31, 2, 13, BLACK)
	glow(box("TVScreen", -38, 2, 11.5, -32, 6, 12.5, TV_SCREEN_COLOR))
	box("LivingRug", -41, 0, 14, -29, 0.2, 21, LIVING_RUG_COLOR)
	box("CoffeeTable", -38, 0.2, 16, -32, 1.7, 19, WOOD_COLOR)
	box("CouchSeat", -40, 0, 22, -30, 2, 26, COUCH_COLOR)
	box("CouchBack", -40, 0, 26, -30, 4, 28, COUCH_COLOR)
	box("CouchArmWest", -41, 0, 22, -40, 3, 28, COUCH_COLOR)
	box("CouchArmEast", -30, 0, 22, -29, 3, 28, COUCH_COLOR)
	for index, spot in { { -13, 25 }, { -2, 11 } } do
		box(`PlantPot{index}`, spot[1], 0, spot[2], spot[1] + 2, 2, spot[2] + 2, WOOD_COLOR)
		box(`PlantLeaves{index}`, spot[1] - 0.5, 2, spot[2] - 0.5, spot[1] + 2.5, 5, spot[2] + 2.5, LEAF_COLOR)
	end
	glow(box("LivingLight", -22, 11.6, 16, -14, 12, 22, WHITE), 20)
end

--- Noob Statue: the classic Roblox noob carved in stone, on a granite base, facing the spawn.
local function buildNoobStatue(sections: Instance): ()
	local folder =
		newSection(sections, "NoobStatue", "A stone statue of the classic Roblox noob on a dark granite base.")
	local centerX, centerZ, scale = -62, -20, 1.8
	blockBetween(folder, "Base", at(centerX - 5, 0, centerZ - 4), at(centerX + 5, 1, centerZ + 4), BLACK)
	-- Body parts in classic character units (1 unit = `scale` studs), standing on the base.
	local function piece(name: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: BrickColor): ()
		blockBetween(
			folder,
			name,
			at(centerX + x0 * scale, 1 + y0 * scale, centerZ + z0 * scale),
			at(centerX + x1 * scale, 1 + y1 * scale, centerZ + z1 * scale),
			color
		)
	end
	piece("LeftLeg", -1, 0, -0.5, 0, 2, 0.5, STONE_COLOR)
	piece("RightLeg", 0, 0, -0.5, 1, 2, 0.5, STONE_COLOR)
	piece("Torso", -1, 2, -0.5, 1, 4, 0.5, STONE_COLOR)
	piece("LeftArm", -2, 2, -0.5, -1, 4, 0.5, STONE_COLOR)
	piece("RightArm", 1, 2, -0.5, 2, 4, 0.5, STONE_COLOR)
	piece("Head", -0.6, 4, -0.6, 0.6, 5.2, 0.6, STONE_COLOR)
	piece("EyeLeft", -0.35, 4.65, 0.6, -0.15, 4.95, 0.65, STATUE_DETAIL_COLOR)
	piece("EyeRight", 0.15, 4.65, 0.6, 0.35, 4.95, 0.65, STATUE_DETAIL_COLOR)
	piece("Smile", -0.3, 4.3, 0.6, 0.3, 4.4, 0.65, STATUE_DETAIL_COLOR)
end

--- Bloxy Cola: two vending machines against the courtyard's east wall.
local function buildBloxyCola(sections: Instance): ()
	local folder =
		newSection(sections, "BloxyCola", "Two Bloxy Cola vending machines with glowing panels in the courtyard's east corner.")
	for index, z in { 3, 11 } do
		local name = `Machine{index}`
		blockBetween(folder, name, at(74, 0, z), at(79, 10, z + 6), COLA_COLOR)
		glow(blockBetween(folder, `{name}Panel`, at(73.6, 4, z + 1), at(74, 9, z + 5), WHITE))
		blockBetween(folder, `{name}Stripe`, at(73.6, 2.8, z + 0.5), at(74, 3.4, z + 5.5), WHITE)
		blockBetween(folder, `{name}Slot`, at(73.6, 1, z + 2), at(74, 2.5, z + 4), BLACK)
	end
end

--- Bloxy Trophy: a giant golden cup trophy on a black pedestal.
local function buildBloxyTrophy(sections: Instance): ()
	local folder = newSection(sections, "BloxyTrophy", "A giant golden Bloxy-style trophy on a black pedestal.")
	local centerX, centerZ = 86, -28
	local function box(name: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: BrickColor): ()
		blockBetween(folder, name, at(centerX + x0, y0, centerZ + z0), at(centerX + x1, y1, centerZ + z1), color)
	end
	box("Pedestal", -6, 0, -6, 6, 2, 6, BLACK)
	box("PedestalTop", -4, 2, -4, 4, 3, 4, BLACK)
	box("Foot", -3, 3, -3, 3, 4, 3, GOLD_COLOR)
	box("Stem", -1, 4, -1, 1, 8, 1, GOLD_COLOR)
	box("CupBottom", -4, 8, -4, 4, 9, 4, GOLD_COLOR)
	box("CupWest", -4, 9, -4, -3, 13, 4, GOLD_COLOR)
	box("CupEast", 3, 9, -4, 4, 13, 4, GOLD_COLOR)
	box("CupNorth", -3, 9, -4, 3, 13, -3, GOLD_COLOR)
	box("CupSouth", -3, 9, 3, 3, 13, 4, GOLD_COLOR)
	box("HandleWest", -5.5, 9.5, -0.5, -4, 12.5, 0.5, GOLD_COLOR)
	box("HandleEast", 4, 9.5, -0.5, 5.5, 12.5, 0.5, GOLD_COLOR)
end

--- Roblox Logo: a giant tilted square with a square hole, standing on a stage between two lamps.
local function buildRobloxLogo(sections: Instance): ()
	local folder = newSection(
		sections,
		"RobloxLogo",
		"A giant tilted-square Roblox logo standing on a black stage, lit by two neon lamps."
	)
	local centerX, centerZ = -20, -82
	blockBetween(folder, "Stage", at(centerX - 14, 0, centerZ - 6), at(centerX + 14, 1, centerZ + 6), BLACK)

	local size, barWidth, depth, tilt = 12, 3, 3, math.rad(15)
	-- The lowest corner rests on the stage, sunk in slightly so it looks planted.
	local center = at(centerX, 1 + size / 2 * (math.sin(tilt) + math.cos(tilt)) - 0.3, centerZ)
	local right = Vector3.new(math.cos(tilt), math.sin(tilt), 0)
	local up = Vector3.new(-math.sin(tilt), math.cos(tilt), 0)
	local function logoBar(name: string, offsetX: number, offsetY: number, sizeX: number, sizeY: number): ()
		local position = center + right * offsetX + up * offsetY
		local part = makeBlock(name, Vector3.new(sizeX, sizeY, depth), position, LOGO_COLOR, folder)
		part.CFrame = CFrame.new(position.X, position.Y, position.Z, right.X, up.X, 0, right.Y, up.Y, 0, right.Z, up.Z, 1)
	end
	local offset = (size - barWidth) / 2
	logoBar("LogoTop", 0, offset, size, barWidth)
	logoBar("LogoBottom", 0, -offset, size, barWidth)
	logoBar("LogoLeft", -offset, 0, barWidth, size - 2 * barWidth)
	logoBar("LogoRight", offset, 0, barWidth, size - 2 * barWidth)

	lamp(folder, "LampWest", centerX - 18, centerZ)
	lamp(folder, "LampEast", centerX + 18, centerZ)
end

--- Giant Brick: a classic 2x4 brick blown up to giant size, with big studs on top.
local function buildGiantBrick(sections: Instance): ()
	local folder = newSection(sections, "GiantBrick", "A giant classic 2x4 brick with oversized studs.")
	blockBetween(folder, "Brick", at(82, 0, -74), at(98, 6, -66), GIANT_BRICK_COLOR)
	for row, z in { -72, -68 } do
		for column, x in { 84, 88, 92, 96 } do
			blockBetween(folder, `Stud{row}_{column}`, at(x - 1.25, 6, z - 1.25), at(x + 1.25, 7.2, z + 1.25), GIANT_BRICK_COLOR)
		end
	end
end

--- Lookout Tower: a platform on pillars in the north-west corner, with a ramp up to it.
local function buildLookoutTower(sections: Instance): ()
	local folder = newSection(
		sections,
		"LookoutTower",
		"A lookout platform 14 studs up in the north-west corner, reached by a long ramp. It leads onto the Sky Bridge."
	)
	platform(folder, "Lookout", -98, -118, -80, -100, 14, DECK_COLOR, true)
	rampFromFloor(folder, "Ramp", at(-92, 14, -100), Vector3.new(0, 0, 1), 8)
	-- Railings on every edge except where the ramp arrives (south) and the bridge leaves (east).
	railing(folder, "LookoutNorth", -98, -118, -80, -117.6, 14)
	railing(folder, "LookoutWest", -98, -117.6, -97.6, -100, 14)
	railing(folder, "LookoutSouth", -88, -100.4, -80, -100, 14)
	railing(folder, "LookoutEastA", -80.4, -117.6, -80, -112, 14)
	railing(folder, "LookoutEastB", -80.4, -106, -80, -100.4, 14)
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
	railing(folder, "DeckNorth", -80, -112, 40, -111.6, 14)
	railing(folder, "DeckSouth", -80, -106.4, 40, -106, 14)
	-- East platform: open where the bridge arrives (west) and the Rainbow Ramp leaves (south).
	railing(folder, "EastNorth", 40, -118, 58, -117.6, 14)
	railing(folder, "EastEast", 57.6, -117.6, 58, -100, 14)
	railing(folder, "EastSouthA", 40.4, -100.4, 44, -100, 14)
	railing(folder, "EastSouthB", 54, -100.4, 57.6, -100, 14)
	railing(folder, "EastWestA", 40, -117.6, 40.4, -112, 14)
	railing(folder, "EastWestB", 40, -106, 40.4, -100, 14)
end

--- Rainbow Ramp: a striped ramp from the bridge's east platform down to the courtyard.
local function buildRainbowRamp(sections: Instance): ()
	local folder = newSection(
		sections,
		"RainbowRamp",
		"A rainbow-striped ramp from the bridge's east platform down to the courtyard."
	)
	local top = at(49, 14, -100)
	local foot = rampFoot(top, Vector3.new(0, 0, 1))
	local stripes = #RAINBOW_COLORS
	for index, color in RAINBOW_COLORS do
		-- Every stripe is a slice of the same slope, so the walking surface stays smooth.
		local high = top + (foot - top) * ((index - 1) / stripes)
		local low = top + (foot - top) * (index / stripes)
		ramp(folder, `Stripe{index}`, low, high, 10, color)
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
	local hill = makeBlock("Hill", Vector3.new(14, hillHeight, 14), hillCenter, HILL_COLOR, folder)
	hill.CFrame = facing(hillCenter, forward)
	ramp(folder, "RampDown", along(88, 0), along(58, hillHeight), 10)
end

--- Finish Podium: 1st, 2nd and 3rd place blocks at the end of the leg, each with its own ramp.
local function buildFinishPodium(sections: Instance): ()
	local folder = newSection(
		sections,
		"FinishPodium",
		"A winners' podium for 1st, 2nd and 3rd place at the end of the leg, each with its own ramp."
	)
	local places = {
		{ name = "Second", minX = 66, height = 3, color = PODIUM_SECOND_COLOR },
		{ name = "First", minX = 74, height = 5, color = PODIUM_FIRST_COLOR },
		{ name = "Third", minX = 82, height = 2, color = PODIUM_THIRD_COLOR },
	}
	for _, place in places do
		blockBetween(folder, place.name, at(place.minX, 0, 106), at(place.minX + 8, place.height, 114), place.color)
		rampFromFloor(folder, `{place.name}Ramp`, at(place.minX + 4, place.height, 106), Vector3.new(0, 0, -1), 6)
	end
end

--- Builds one divider wall: a red strap and grey wall either side of the door, a lintel above it
--- and a cap along the top that meets the outer walls' caps.
local function buildDivider(parent: Instance, divider: Divider): ()
	local function slab(
		name: string,
		from: number,
		to: number,
		bottom: number,
		top: number,
		halfWidth: number,
		color: BrickColor
	): ()
		if to <= from or top <= bottom then
			return
		end
		if divider.axis == "X" then
			blockBetween(parent, name, at(from, bottom, divider.line - halfWidth), at(to, top, divider.line + halfWidth), color)
		else
			blockBetween(parent, name, at(divider.line - halfWidth, bottom, from), at(divider.line + halfWidth, top, to), color)
		end
	end

	local half = WALL_THICKNESS / 2
	for side, span in { { divider.from, divider.doorFrom }, { divider.doorTo, divider.to } } do
		slab(`{divider.name}Strap{side}`, span[1], span[2], 0, STRAP_HEIGHT, half, STRAP_COLOR)
		slab(`{divider.name}Wall{side}`, span[1], span[2], STRAP_HEIGHT, WALL_HEIGHT, half, WALL_COLOR)
	end
	slab(`{divider.name}Lintel`, divider.doorFrom, divider.doorTo, DOOR_HEIGHT, WALL_HEIGHT, half, WALL_COLOR)
	if CAP_HEIGHT > 0 then
		-- The outer walls' caps overhang by CAP_OVERHANG, so this one stops that much short of each end.
		slab(
			`{divider.name}Cap`,
			divider.from + CAP_OVERHANG,
			divider.to - CAP_OVERHANG,
			WALL_HEIGHT,
			WALL_HEIGHT + CAP_HEIGHT,
			half + CAP_OVERHANG,
			CAP_COLOR
		)
	end
end

--- Builds the walls that split the map into rooms.
--- @param model Model -- The map model
--- @return number -- Number of divider walls
local function buildDividers(model: Model): number
	local folder = Instance.new("Folder")
	folder.Name = "Dividers"
	folder.Parent = model
	for _, divider in DIVIDERS do
		buildDivider(folder, divider)
	end
	return #DIVIDERS
end

--- Cabinets: closed wooden cabinets (no openings) with two doors and brass handles, in corners.
local function buildCabinets(sections: Instance): ()
	local folder = newSection(sections, "Cabinets", "Seven closed wooden cabinets standing in corners around the map.")
	for index, cabinet in CABINETS do
		local minX, minZ, maxX, maxZ = cabinet.area[1], cabinet.area[2], cabinet.area[3], cabinet.area[4]
		local facing = cabinet.facing
		local name = `Cabinet{index}`
		blockBetween(folder, `{name}Body`, at(minX, 0, minZ), at(maxX, 7.6, maxZ), CABINET_COLOR)
		blockBetween(folder, `{name}Top`, at(minX, 7.6, minZ), at(maxX, 8, maxZ), CABINET_DOOR_COLOR)

		-- Thin pieces on the front face: `from`..`to` along the front, `out0`..`out1` studs in front of it.
		local function front(partName: string, from: number, to: number, y0: number, y1: number, out0: number, out1: number, color: BrickColor): ()
			if facing == "N" then
				blockBetween(folder, partName, at(from, y0, minZ - out1), at(to, y1, minZ - out0), color)
			elseif facing == "S" then
				blockBetween(folder, partName, at(from, y0, maxZ + out0), at(to, y1, maxZ + out1), color)
			elseif facing == "W" then
				blockBetween(folder, partName, at(minX - out1, y0, from), at(minX - out0, y1, to), color)
			else
				blockBetween(folder, partName, at(maxX + out0, y0, from), at(maxX + out1, y1, to), color)
			end
		end
		local along0, along1 = if facing == "N" or facing == "S" then minX else minZ, if facing == "N" or facing == "S" then maxX else maxZ
		local middle = (along0 + along1) / 2
		front(`{name}Door1`, along0 + 0.3, middle - 0.1, 0.6, 7.2, 0, 0.15, CABINET_DOOR_COLOR)
		front(`{name}Door2`, middle + 0.1, along1 - 0.3, 0.6, 7.2, 0, 0.15, CABINET_DOOR_COLOR)
		front(`{name}Handle1`, middle - 0.7, middle - 0.4, 3.4, 4.6, 0.15, 0.35, GOLD_COLOR)
		front(`{name}Handle2`, middle + 0.4, middle + 0.7, 3.4, 4.6, 0.15, 0.35, GOLD_COLOR)
	end
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
		buildNoobStatue,
		buildHouse,
		buildBloxyCola,
		buildBloxyTrophy,
		buildLookoutTower,
		buildSkyBridge,
		buildRobloxLogo,
		buildGiantBrick,
		buildRainbowRamp,
		buildSlopeHill,
		buildFinishPodium,
		buildCabinets,
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

--- Landscape: blocky trees, bushes and stone paths around the map.
--- @param model Model -- The map model
local function buildLandscape(model: Model): ()
	local folder = Instance.new("Folder")
	folder.Name = "Landscape"
	folder.Parent = model
	for index, spot in TREES do
		local x, z = spot[1], spot[2]
		blockBetween(folder, `Tree{index}Trunk`, at(x - 1, 0, z - 1), at(x + 1, 8, z + 1), TRUNK_COLOR)
		blockBetween(folder, `Tree{index}Leaves1`, at(x - 4, 8, z - 4), at(x + 4, 13, z + 4), LEAF_COLOR)
		blockBetween(folder, `Tree{index}Leaves2`, at(x - 2.5, 13, z - 2.5), at(x + 2.5, 16, z + 2.5), LEAF_LIGHT_COLOR)
	end
	for index, spot in BUSHES do
		blockBetween(folder, `Bush{index}`, at(spot[1] - 1.5, 0, spot[2] - 1.5), at(spot[1] + 1.5, 2.5, spot[2] + 1.5), LEAF_COLOR)
	end
	for _, path in PATHS do
		local area = path.area
		blockBetween(
			folder,
			path.name,
			at(area[1], 0, area[2]),
			at(area[3], 0.2, area[4]),
			if path.name == "Road" then ROAD_COLOR else PATH_COLOR
		)
	end
end

--- Returns a part's path inside the map, like "Sections/House/Roof".
--- @return string -- Slash-separated names below `model`
local function relativePath(model: Instance, part: Instance): string
	local names = { part.Name }
	local node = part.Parent
	while node and node ~= model do
		table.insert(names, 1, node.Name)
		node = node.Parent
	end
	return table.concat(names, "/")
end

--- Gives every part its realistic material from MATERIAL_RULES (neon and glass parts are kept).
--- @param model Model -- The map model
local function applyMaterials(model: Model): ()
	for _, descendant in model:GetDescendants() do
		if
			descendant:IsA("BasePart")
			and descendant.Material ~= Enum.Material.Neon
			and descendant.Material ~= Enum.Material.Glass
		then
			local path = relativePath(model, descendant)
			for _, rule in MATERIAL_RULES do
				if string.find(path, rule.pattern) then
					descendant.Material = rule.material
					break
				end
			end
		end
	end
end

--- Copies lighting settings from a RealisticLighting script (attributes and child effects) into Lighting.
--- @param controller Instance -- The RealisticLighting script
local function applyLightingFrom(controller: Instance): ()
	for name, value in controller:GetAttributes() do
		pcall(function()
			(Lighting :: any)[name] = if name == "Technology" then (Enum.Technology :: any)[value] else value
		end)
	end
	for _, effect in controller:GetChildren() do
		local old = Lighting:FindFirstChild(effect.Name)
		if old then
			old:Destroy()
		end
		effect:Clone().Parent = Lighting
	end
end

--- Adds realistic lighting. The settings live on a Script inside the map that re-applies them
--- every time the game starts, so they travel with RMap.rbxm; they're also applied right away.
--- @param model Model -- The map model
local function buildLighting(model: Model): ()
	local controller = Instance.new("Script")
	controller.Name = "RealisticLighting"
	for name, value in LIGHTING_PROPERTIES do
		controller:SetAttribute(name, value)
	end

	local atmosphere = Instance.new("Atmosphere")
	atmosphere.Density = 0.28
	atmosphere.Offset = 0.2
	atmosphere.Color = Color3.fromRGB(199, 210, 222)
	atmosphere.Decay = Color3.fromRGB(92, 110, 128)
	atmosphere.Glare = 0.15
	atmosphere.Haze = 1.2
	atmosphere.Parent = controller

	local grading = Instance.new("ColorCorrectionEffect")
	grading.Brightness = 0.02
	grading.Contrast = 0.08
	grading.Saturation = 0.12
	grading.TintColor = Color3.fromRGB(255, 248, 240)
	grading.Parent = controller

	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.6
	bloom.Size = 28
	bloom.Threshold = 1.6
	bloom.Parent = controller

	local sunRays = Instance.new("SunRaysEffect")
	sunRays.Intensity = 0.04
	sunRays.Spread = 0.7
	sunRays.Parent = controller

	-- Scripts can only be given source in Studio (Command Bar) or by tools, not in a running game.
	pcall(function()
		controller.Source = LIGHTING_SCRIPT_SOURCE
	end)
	controller.Parent = model
	applyLightingFrom(controller)
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
		CAP_HEIGHT >= 0 and CAP_OVERHANG >= 0 and WALL_THICKNESS + 2 * CAP_OVERHANG < CELL_SIZE,
		"[RMapBuilder] CAP_HEIGHT and CAP_OVERHANG must be 0 or more, and caps must be thinner than a cell"
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

	local capFolder: Folder? = nil
	if CAP_HEIGHT > 0 then
		local folder = Instance.new("Folder")
		folder.Name = "Caps"
		folder.Parent = model
		capFolder = folder
	end

	local floorCount = buildFloor(grid, floorFolder)
	local wallCount, strapCount = buildWalls(grid, wallFolder, strapFolder, capFolder)
	buildSpawn(grid, model)

	local sectionCount, sectionPartCount, dividerCount = 0, 0, 0
	if BUILD_SECTIONS then
		sectionCount, sectionPartCount = buildSections(model)
		dividerCount = buildDividers(model)
		buildLandscape(model)
	end
	if not CLASSIC_STUDS then
		applyMaterials(model)
	end
	if APPLY_LIGHTING then
		buildLighting(model)
	end

	model.WorldPivot = CFrame.new(0, FLOOR_TOP_Y, 0)
	model.Parent = Workspace

	print(
		`[RMapBuilder] Built {MODEL_NAME}: {grid.width * CELL_SIZE} x {grid.height * CELL_SIZE} studs, `
			.. `{floorCount} floor blocks, {wallCount} wall blocks, {strapCount} strap blocks, `
			.. `{sectionCount} play areas ({sectionPartCount} parts), {dividerCount} walls with doors`
	)
	return model
end

-- // CONNECTIONS
-- None: the map is static once built.

-- // INIT
buildMap()
respawnExistingCharacters()
