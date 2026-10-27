--!strict
--[[
	OldSchoolBuilder
	Builds "Old School": a realistic, abandoned one-floor school that fills about three quarters
	of a sealed, walled lot (200 x 141 studs). The brick building runs right up to the side and
	back lot walls, so the only open ground is the front yard, with a small overgrown football
	pitch; the lot wall has no gate or gap.

	Inside: two hallways; five classrooms between them; two more classrooms, a science lab and a
	computer lab behind the back one; the lobby, office, nurse's room, staff lounge and toilets
	at the front; and a gym and a small cafeteria at the east end. Walls have a painted or tiled lower half, baseboards and a chair rail;
	windows have frames and sills (some smashed); doors have casings and hang open; ceilings
	have tile grids with tiles missing, and the roof has caved in over Classroom C and the gym.

	Everything is ordinary anchored parts with realistic Roblox materials, sized for normal
	Roblox characters (doors 8 studs tall, ceilings 16). A RealisticLighting script inside the
	model sets a gloomy, foggy dusk every time the game starts.

	HOW TO USE
	  Permanent map (recommended): open Studio's Command Bar (View > Command Bar), paste this
	  whole file and press Enter. The parts are saved with your place.
	  Runtime map: put this file in ServerScriptService as a Script.

	Running it again replaces the previous map (the Workspace model named MODEL_NAME).
	Change SEED for a different scatter of debris and knocked-over furniture.
]]

-- // SERVICES
local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

-- // TYPES
-- A position and rotation that furniture is built relative to; `r` is a row-major 3x3 rotation.
type Frame = {
	origin: Vector3,
	r: { number },
}

-- A gap in a wall: `from`/`to` along the wall, `bottom`/`top` above the foundation. `glass` = true
-- glazes a framed window, false leaves it smashed, nil makes a plain opening (doorway or hatch).
-- A doorway with `leaf` gets a door hung open that many degrees toward side `toward` (-1 or 1).
type Opening = {
	from: number,
	to: number,
	bottom: number,
	top: number,
	glass: boolean?,
	leaf: number?,
	toward: number?,
}

-- The finish on one face of a wall (`face` -1 = the side0 face, 1 = the side1 face): a painted or
-- tiled lower wall, a baseboard and a chair rail, over a plaster lining when `lining` is set.
type Finish = {
	face: number,
	color: Color3,
	material: Enum.Material,
	lining: boolean?,
}

-- A room, by the inside faces of its walls.
type Room = {
	name: string,
	x0: number,
	x1: number,
	z0: number,
	z1: number,
}

-- // CONSTANTS
local MODEL_NAME = "OldSchool"
local REMOVE_TEMPLATE_PARTS = true
local SEED = 1987
local MAX_WORKING_LIGHTS = 40 -- lights that still glow (each one is a PointLight)

local M = Enum.Material
-- The lot is built at x -130..70, z -56.5..84.5 and moved to sit centred on the origin at the end.
local LOT_MIN_X, LOT_MAX_X, LOT_MIN_Z, LOT_MAX_Z = -130, 70, -56.5, 84.5
local LOT_WALL = 1.5 -- thickness of the lot wall
local BASE = 0.2 -- top of the building's concrete foundation
local FLOOR = 0.3 -- top of the room floors; furniture stands here
local CEILING = 16 -- top of every wall, underside of the ceiling

-- The building's outside faces: it meets the lot walls on three sides, leaving only the front yard.
local BX0, BX1, BZ0, BZ1 = LOT_MIN_X + LOT_WALL, LOT_MAX_X - LOT_WALL, LOT_MIN_Z + LOT_WALL, 52
-- Inside faces of its 2-stud brick walls.
local IX0, IX1, IZ0, IZ1 = BX0 + 2, BX1 - 2, BZ0 + 2, BZ1 - 2
-- The wall between the classroom wing and the gym and cafeteria.
local WING_X0, WING_X1 = 20, 22
-- Bands from the back of the building to the front (z of inside faces).
local ROW2_Z0, ROW2_Z1 = IZ0, -26
local MID_HALL_Z0, MID_HALL_Z1 = -25, -15
local ROW1_Z0, ROW1_Z1 = -14, 13
local HALL_Z0, HALL_Z1 = 14, 24
local FRONT_Z0 = 25
local DIVIDER_Z0, DIVIDER_Z1 = -27, -25 -- the wall between the cafeteria and the gym
-- Where the roof has caved in: { x0, x1, z0, z1 } over Classroom C and over the gym.
local HOLES: { { number } } = { { -56, -48, -6, 2 }, { 40, 48, 14, 24 } }
-- The small football pitch in the front yard (inside its touchlines and goal lines).
local PITCH_X0, PITCH_X1, PITCH_Z0, PITCH_Z1 = -36, 36, 58.5, 80.5

-- Weathered, realistic colours.
local BRICK = Color3.fromRGB(128, 62, 45)
local BRICK_DARK = Color3.fromRGB(96, 50, 40)
local CONCRETE = Color3.fromRGB(150, 148, 140)
local CONCRETE_DARK = Color3.fromRGB(112, 110, 104)
local PLASTER = Color3.fromRGB(196, 188, 166)
local CEILING_COLOR = Color3.fromRGB(184, 178, 162)
local STAINED_TILE = Color3.fromRGB(150, 140, 118)
local ROOF_COLOR = Color3.fromRGB(58, 58, 60)
local CLASS_PAINT = Color3.fromRGB(116, 128, 106)
local ROOM_PAINT = Color3.fromRGB(150, 130, 102)
local GYM_PAINT = Color3.fromRGB(84, 100, 124)
local WAINSCOT = Color3.fromRGB(122, 146, 128)
local BASEBOARD = Color3.fromRGB(50, 42, 38)
local TRIM = Color3.fromRGB(92, 66, 46)
local FRAME_METAL = Color3.fromRGB(66, 72, 70)
local THRESHOLD = Color3.fromRGB(112, 110, 102)
local TBAR = Color3.fromRGB(190, 186, 174)
local PLENUM = Color3.fromRGB(16, 16, 18)
local DOOR = Color3.fromRGB(102, 72, 48)
local WOOD_FLOOR = Color3.fromRGB(126, 90, 58)
local GYM_FLOOR = Color3.fromRGB(170, 126, 80)
local WOOD = Color3.fromRGB(140, 102, 66)
local WOOD_DARK = Color3.fromRGB(82, 56, 38)
local HALL_TILE = Color3.fromRGB(150, 142, 124)
local HALL_BORDER = Color3.fromRGB(92, 100, 88)
local WHITE_TILE = Color3.fromRGB(205, 205, 198)
local VINYL = Color3.fromRGB(172, 162, 140)
local TERRAZZO = Color3.fromRGB(162, 156, 144)
local CARPET = Color3.fromRGB(88, 70, 64)
local CARPET_BLUE = Color3.fromRGB(60, 70, 92)
local METAL = Color3.fromRGB(122, 126, 130)
local STEEL = Color3.fromRGB(166, 168, 170)
local RUST = Color3.fromRGB(122, 70, 40)
local RADIATOR = Color3.fromRGB(168, 160, 140)
local LOCKER = Color3.fromRGB(78, 104, 92)
local CHALKBOARD = Color3.fromRGB(38, 56, 44)
local CHALK = Color3.fromRGB(222, 222, 214)
local LAB_TOP = Color3.fromRGB(34, 36, 38)
local GRASS = Color3.fromRGB(92, 102, 58)
local DIRT = Color3.fromRGB(104, 84, 62)
local ASPHALT = Color3.fromRGB(58, 58, 60)
local CRACK = Color3.fromRGB(30, 30, 30)
local LEAVES = Color3.fromRGB(62, 84, 46)
local DEAD_WOOD = Color3.fromRGB(78, 64, 52)
local GLASS = Color3.fromRGB(160, 180, 190)
local WATER = Color3.fromRGB(40, 44, 48)
local PAPER = Color3.fromRGB(222, 216, 196)
local CARDBOARD = Color3.fromRGB(150, 116, 78)
local SEAT = Color3.fromRGB(110, 80, 52)
local PORCELAIN = Color3.fromRGB(220, 220, 214)
local STALL = Color3.fromRGB(110, 130, 140)
local MAT_BLUE = Color3.fromRGB(52, 72, 110)
local MAT_RED = Color3.fromRGB(120, 44, 40)
local FLAG = Color3.fromRGB(110, 30, 30)
local RED = Color3.fromRGB(128, 34, 30)
local BLACK = Color3.fromRGB(24, 24, 26)
local WHITE = Color3.fromRGB(230, 230, 224)
local BONE = Color3.fromRGB(214, 206, 184)
local BEIGE = Color3.fromRGB(196, 186, 160)
local GOLD = Color3.fromRGB(196, 150, 60)
local CORK = Color3.fromRGB(150, 116, 76)
local DUMPSTER = Color3.fromRGB(56, 78, 58)
local TURF = Color3.fromRGB(98, 116, 60)
local TURF_DARK = Color3.fromRGB(84, 102, 52)
local FABRIC_BROWN = Color3.fromRGB(110, 84, 62)
local CURTAIN = Color3.fromRGB(150, 162, 150)
local YELLOW = Color3.fromRGB(206, 170, 40)
local TUBE_ON = Color3.fromRGB(214, 222, 228)
local TUBE_OFF = Color3.fromRGB(150, 150, 146)
local LAMP_ON = Color3.fromRGB(255, 170, 90)
local RIM = Color3.fromRGB(200, 90, 40)
local BOOK_COLORS: { Color3 } = {
	Color3.fromRGB(120, 40, 36),
	Color3.fromRGB(40, 60, 100),
	Color3.fromRGB(50, 84, 52),
	Color3.fromRGB(140, 110, 60),
	Color3.fromRGB(90, 60, 90),
	Color3.fromRGB(60, 60, 60),
}
local POSTER_COLORS: { Color3 } = {
	Color3.fromRGB(170, 70, 60),
	Color3.fromRGB(70, 110, 160),
	Color3.fromRGB(200, 170, 80),
	Color3.fromRGB(90, 140, 90),
	Color3.fromRGB(190, 180, 160),
}
local PAINT_COLORS: { Color3 } = {
	Color3.fromRGB(180, 40, 40),
	Color3.fromRGB(40, 90, 170),
	Color3.fromRGB(220, 180, 40),
	Color3.fromRGB(50, 140, 70),
	Color3.fromRGB(150, 60, 150),
}

-- "OLD SCHOOL" sign letters as strokes on a 3 x 5 grid: { x0, y0, x1, y1 }.
local LETTERS: { [string]: { { number } } } = {
	O = { { 0, 0, 1, 5 }, { 2, 0, 3, 5 }, { 1, 4, 2, 5 }, { 1, 0, 2, 1 } },
	L = { { 0, 0, 1, 5 }, { 1, 0, 3, 1 } },
	D = { { 0, 0, 1, 5 }, { 1, 4, 2, 5 }, { 1, 0, 2, 1 }, { 2, 1, 3, 4 } },
	S = { { 0, 4, 3, 5 }, { 0, 3, 1, 4 }, { 0, 2, 3, 3 }, { 2, 1, 3, 2 }, { 0, 0, 3, 1 } },
	C = { { 0, 4, 3, 5 }, { 0, 1, 1, 4 }, { 0, 0, 3, 1 } },
	H = { { 0, 0, 1, 5 }, { 2, 0, 3, 5 }, { 1, 2, 2, 3 } },
}

-- Window kinds: { bottom, top, width, gap }.
local WINDOW_KINDS: { [string]: { number } } = {
	tall = { 4, 11, 5, 3 },
	high = { 10, 14, 7, 4 },
	small = { 9, 12, 4, 3 },
}

-- Gloomy, foggy dusk. Applied now and, through the RealisticLighting script, whenever the game starts.
local APPLY_LIGHTING = true
local LIGHTING_PROPERTIES: { [string]: any } = {
	Technology = "Future",
	ClockTime = 18.2,
	GeographicLatitude = 45,
	Brightness = 1.2,
	Ambient = Color3.fromRGB(45, 45, 52),
	OutdoorAmbient = Color3.fromRGB(86, 88, 96),
	EnvironmentDiffuseScale = 0.6,
	EnvironmentSpecularScale = 0.5,
	ShadowSoftness = 0.4,
	GlobalShadows = true,
}
local LIGHTING_SCRIPT_SOURCE = [[
-- Applies Old School's gloomy lighting when the game starts. The settings are this script's
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

-- // ROOMS
local function room(name: string, x0: number, x1: number, z0: number, z1: number): Room
	return { name = name, x0 = x0, x1 = x1, z0 = z0, z1 = z1 }
end

local OFFICE = room("Office", IX0, -102, FRONT_Z0, IZ1)
local NURSE = room("NurseRoom", -101, -83, FRONT_Z0, IZ1)
local LOBBY = room("Lobby", -82, -44, FRONT_Z0, IZ1)
local LOUNGE = room("StaffLounge", -43, -21, FRONT_Z0, IZ1)
local BOYS = room("BoysToilet", -20, -4, FRONT_Z0, IZ1)
local GIRLS = room("GirlsToilet", -3, WING_X0, FRONT_Z0, IZ1)
local FRONT_ROOMS: { Room } = { OFFICE, NURSE, LOBBY, LOUNGE, BOYS, GIRLS }

local ROW1_ROOMS: { Room } = {
	room("ClassroomA", IX0, -97, ROW1_Z0, ROW1_Z1),
	room("ClassroomB", -96, -67, ROW1_Z0, ROW1_Z1),
	room("ClassroomC", -66, -37, ROW1_Z0, ROW1_Z1),
	room("ClassroomD", -36, -7, ROW1_Z0, ROW1_Z1),
	room("ClassroomE", -6, WING_X0, ROW1_Z0, ROW1_Z1),
}
local SCIENCE = room("ScienceLab", -96, -59, ROW2_Z0, ROW2_Z1)
local COMPUTER = room("ComputerLab", -58, -21, ROW2_Z0, ROW2_Z1)
local ROW2_ROOMS: { Room } = {
	room("ClassroomF", IX0, -97, ROW2_Z0, ROW2_Z1),
	SCIENCE,
	COMPUTER,
	room("ClassroomG", -20, WING_X0, ROW2_Z0, ROW2_Z1),
}
local GYM = room("Gym", WING_X1, IX1, DIVIDER_Z1, IZ1)
local CAFETERIA = room("Cafeteria", WING_X1, IX1, IZ0, DIVIDER_Z0)

-- // STATE
local randomState = SEED
local workingLights = 0
local roofFolder: Instance = Instance.new("Folder") -- replaced by buildRoof
local hallOpenings: { [string]: { Opening } } = {} -- doors on each hallway face, for the lockers

-- // PRIVATE FUNCTIONS

--- Repeatable pseudo-random number in [0, 1), so the same SEED always gives the same mess.
local function random(): number
	randomState = (randomState * 16807) % 2147483647
	return randomState / 2147483647
end

--- Random number between `low` and `high`.
local function between(low: number, high: number): number
	return low + (high - low) * random()
end

--- Random entry of a list.
local function pick<T>(list: { T }): T
	return list[math.floor(random() * #list) + 1]
end

--- A colour made slightly lighter or darker at random, so repeated parts don't look identical.
local function tint(color: Color3, amount: number): Color3
	local k = 1 + between(-amount, amount)
	return Color3.new(math.clamp(color.R * k, 0, 1), math.clamp(color.G * k, 0, 1), math.clamp(color.B * k, 0, 1))
end

--- Applies colour, material and smooth surfaces to an anchored part.
local function style(part: BasePart, color: Color3, material: Enum.Material): ()
	part.Anchored = true
	part.Color = color
	part.Material = material
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
end

--- Creates an axis-aligned block between two corners.
local function box(
	parent: Instance,
	name: string,
	x0: number,
	y0: number,
	z0: number,
	x1: number,
	y1: number,
	z1: number,
	color: Color3,
	material: Enum.Material
): Part
	assert(x1 > x0 and y1 > y0 and z1 > z0, `[OldSchoolBuilder] {name} has a zero or negative size`)
	local part = Instance.new("Part")
	part.Name = name
	part.Size = Vector3.new(x1 - x0, y1 - y0, z1 - z0)
	part.CFrame = CFrame.new((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
	style(part, color, material)
	part.Parent = parent
	return part
end

--- Multiplies two row-major 3x3 matrices.
local function multiply3(a: { number }, b: { number }): { number }
	local out = table.create(9, 0)
	for row = 0, 2 do
		for col = 0, 2 do
			local sum = 0
			for k = 0, 2 do
				sum += a[row * 3 + k + 1] * b[k * 3 + col + 1]
			end
			out[row * 3 + col + 1] = sum
		end
	end
	return out
end

--- Makes a frame at (x, y, z) turned `yaw` degrees about Y, then tipped `pitch` about X and `roll` about Z.
--- Rotations are built as plain matrices so every tool that saves the model reproduces them exactly.
local function frame(x: number, y: number, z: number, yaw: number, pitch: number?, roll: number?): Frame
	local cy, sy = math.cos(math.rad(yaw)), math.sin(math.rad(yaw))
	local p, rl = math.rad(pitch or 0), math.rad(roll or 0)
	local cp, sp, cr, sr = math.cos(p), math.sin(p), math.cos(rl), math.sin(rl)
	local turn = { cy, 0, sy, 0, 1, 0, -sy, 0, cy }
	local tip = { 1, 0, 0, 0, cp, -sp, 0, sp, cp }
	local tilt = { cr, -sr, 0, sr, cr, 0, 0, 0, 1 }
	return { origin = Vector3.new(x, y, z), r = multiply3(multiply3(turn, tip), tilt) }
end

--- A point given in a frame's local coordinates, in world space.
local function pointIn(f: Frame, x: number, y: number, z: number): Vector3
	local r = f.r
	return Vector3.new(
		f.origin.X + r[1] * x + r[2] * y + r[3] * z,
		f.origin.Y + r[4] * x + r[5] * y + r[6] * z,
		f.origin.Z + r[7] * x + r[8] * y + r[9] * z
	)
end

--- A frame placed at (x, y, z) inside another frame and turned `yaw` degrees about its up axis.
local function child(f: Frame, x: number, y: number, z: number, yaw: number): Frame
	local cy, sy = math.cos(math.rad(yaw)), math.sin(math.rad(yaw))
	return { origin = pointIn(f, x, y, z), r = multiply3(f.r, { cy, 0, sy, 0, 1, 0, -sy, 0, cy }) }
end

--- Creates a block given in a frame's local coordinates.
local function piece(
	parent: Instance,
	name: string,
	f: Frame,
	x0: number,
	y0: number,
	z0: number,
	x1: number,
	y1: number,
	z1: number,
	color: Color3,
	material: Enum.Material
): Part
	local r = f.r
	local center = pointIn(f, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
	local part = Instance.new("Part")
	part.Name = name
	part.Size = Vector3.new(x1 - x0, y1 - y0, z1 - z0)
	part.CFrame = CFrame.new(center.X, center.Y, center.Z, r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9])
	style(part, color, material)
	part.Parent = parent
	return part
end

--- Creates a long block running from `p0` to `p1` (branches, poles, pipes, chains, cracks).
local function beam(
	parent: Instance,
	name: string,
	p0: Vector3,
	p1: Vector3,
	width: number,
	depth: number,
	color: Color3,
	material: Enum.Material
): Part
	local look = (p1 - p0).Unit
	local reference = if math.abs(look.Y) > 0.99 then Vector3.new(1, 0, 0) else Vector3.new(0, 1, 0)
	local right = look:Cross(reference).Unit
	local up = right:Cross(look)
	local center = (p0 + p1) / 2
	local part = Instance.new("Part")
	part.Name = name
	part.Size = Vector3.new(width, depth, (p1 - p0).Magnitude)
	part.CFrame = CFrame.new(
		center.X,
		center.Y,
		center.Z,
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
	style(part, color, material)
	part.Parent = parent
	return part
end

--- Makes a part glow, optionally with a light reaching `range` studs.
local function glow(part: BasePart, color: Color3, range: number?, brightness: number?): BasePart
	part.Material = M.Neon
	if range then
		local light = Instance.new("PointLight")
		light.Range = range
		light.Brightness = brightness or 0.8
		light.Color = color
		light.Parent = part
	end
	return part
end

--- Creates a folder for one area, with its description as an attribute.
local function newSection(parent: Instance, name: string, description: string): Folder
	local folder = Instance.new("Folder")
	folder.Name = name
	folder:SetAttribute("Description", description)
	folder.Parent = parent
	return folder
end

--- A block given along a wall (`axis` is the direction the wall runs) and across it (`p0`..`p1`).
local function wallBox(
	parent: Instance,
	name: string,
	axis: "X" | "Z",
	a0: number,
	a1: number,
	y0: number,
	y1: number,
	p0: number,
	p1: number,
	color: Color3,
	material: Enum.Material
): Part
	if axis == "X" then
		return box(parent, name, a0, y0, p0, a1, y1, p1, color, material)
	end
	return box(parent, name, p0, y0, a0, p1, y1, a1, color, material)
end

--- Removes `a`..`b` from a list of intervals.
local function cut(spans: { { number } }, a: number, b: number): { { number } }
	local out: { { number } } = {}
	for _, span in spans do
		if b <= span[1] or a >= span[2] then
			table.insert(out, span)
		else
			if a > span[1] then
				table.insert(out, { span[1], a })
			end
			if b < span[2] then
				table.insert(out, { b, span[2] })
			end
		end
	end
	return out
end

--- True if the rectangle x0..x1, z0..z1 overlaps a hole in the roof.
local function inHole(x0: number, x1: number, z0: number, z1: number): boolean
	for _, hole in HOLES do
		if x1 > hole[1] and x0 < hole[2] and z1 > hole[3] and z0 < hole[4] then
			return true
		end
	end
	return false
end

--- Builds a straight wall from the foundation to the ceiling, split around its openings, with
--- framed windows (glazed or smashed), door casings, thresholds, hung doors and wall finishes.
local function wall(
	parent: Instance,
	name: string,
	axis: "X" | "Z",
	from: number,
	to: number,
	side0: number,
	side1: number,
	openings: { Opening },
	color: Color3,
	material: Enum.Material,
	finishes: { Finish }?
): ()
	table.sort(openings, function(a: Opening, b: Opening): boolean
		return a.from < b.from
	end)
	local count = 0
	local middle = (side0 + side1) / 2
	local function add(label: string, a0: number, a1: number, y0: number, y1: number, p0: number, p1: number, c: Color3, m: Enum.Material): Part?
		if a1 - a0 < 0.01 or y1 - y0 < 0.01 or p1 - p0 < 0.005 then
			return nil
		end
		count += 1
		return wallBox(parent, `{name}{label}{count}`, axis, a0, a1, y0, y1, p0, p1, c, m)
	end
	-- A frame in the wall's plane: `lean` tips it toward +along, `yaw` turns it about the vertical.
	local function at(a: number, y: number, p: number, yaw: number, lean: number): Frame
		if axis == "X" then
			return frame(a, y, p, yaw, 0, -lean)
		end
		return frame(p, y, a, yaw, lean, 0)
	end
	-- A block in such a frame, given along the wall (a), up (y) and through it (t).
	local function inPlane(label: string, f: Frame, a0: number, y0: number, t0: number, a1: number, y1: number, t1: number, c: Color3, m: Enum.Material): Part
		count += 1
		if axis == "X" then
			return piece(parent, `{name}{label}{count}`, f, a0, y0, t0, a1, y1, t1, c, m)
		end
		return piece(parent, `{name}{label}{count}`, f, t0, y0, a0, t1, y1, a1, c, m)
	end
	local function finish(a0: number, a1: number, y0: number, y1: number): ()
		if not finishes then
			return
		end
		for _, f in finishes do
			local face = if f.face < 0 then side0 else side1
			local out = if f.face < 0 then -1 else 1
			local function layer(label: string, near: number, far: number, low: number, high: number, c: Color3, m: Enum.Material): ()
				local p0, p1 = face + out * near, face + out * far
				add(label, a0, a1, low, high, math.min(p0, p1), math.max(p0, p1), c, m)
			end
			local depth = 0
			if f.lining then
				layer("Lining", 0, 0.08, math.max(y0, FLOOR), y1, PLASTER, M.Plaster)
				depth = 0.08
			end
			if y0 <= BASE + 0.001 then
				layer("Lower", depth, depth + 0.05, FLOOR, math.min(y1, FLOOR + 4.2), f.color, f.material)
				layer("Baseboard", depth + 0.05, depth + 0.15, FLOOR, math.min(y1, FLOOR + 0.5), BASEBOARD, M.Wood)
				if y1 >= FLOOR + 4.45 then
					layer("Rail", depth + 0.05, depth + 0.15, FLOOR + 4.2, FLOOR + 4.45, TRIM, M.Wood)
				end
			end
		end
	end
	local function slab(a0: number, a1: number, bottom: number, top: number): ()
		if add("", a0, a1, BASE + bottom, BASE + top, side0, side1, color, material) then
			finish(a0, a1, BASE + bottom, BASE + top)
		end
	end

	local height = CEILING - BASE
	local cursor = from
	for _, o in openings do
		slab(cursor, o.from, 0, height)
		slab(o.from, o.to, 0, o.bottom)
		slab(o.from, o.to, o.top, height)
		local y0, y1 = BASE + o.bottom, BASE + o.top
		if o.glass ~= nil then
			-- Window: sills on both sides and a metal frame with a mullion and a transom.
			for _, p in { side0 - 0.35, side1 } do
				add("Sill", o.from - 0.3, o.to + 0.3, y0 - 0.25, y0, p, p + 0.35, CONCRETE, M.Concrete)
			end
			local w, f0, f1 = 0.22, middle - 0.15, middle + 0.15
			local mid, transom = (o.from + o.to) / 2, y0 + (y1 - y0) * 0.62
			add("Frame", o.from, o.from + w, y0, y1, f0, f1, FRAME_METAL, M.Metal)
			add("Frame", o.to - w, o.to, y0, y1, f0, f1, FRAME_METAL, M.Metal)
			add("Frame", o.from + w, o.to - w, y0, y0 + w, f0, f1, FRAME_METAL, M.Metal)
			add("Frame", o.from + w, o.to - w, y1 - w, y1, f0, f1, FRAME_METAL, M.Metal)
			add("Frame", mid - w / 2, mid + w / 2, y0 + w, y1 - w, f0, f1, FRAME_METAL, M.Metal)
			add("Frame", o.from + w, mid - w / 2, transom - w / 2, transom + w / 2, f0, f1, FRAME_METAL, M.Metal)
			add("Frame", mid + w / 2, o.to - w, transom - w / 2, transom + w / 2, f0, f1, FRAME_METAL, M.Metal)
			if o.glass then
				local pane = add("Glass", o.from + w, o.to - w, y0 + w, y1 - w, middle - 0.05, middle + 0.05, GLASS, M.Glass)
				if pane then
					pane.Transparency = 0.55
					pane.Reflectance = 0.1
					pane.CastShadow = false
				end
			else
				-- Smashed: jagged shards left in the bottom corners and broken glass on the floor inside.
				for k = 1, 2 do
					local size = between(0.8, 1.6)
					local corner = if k == 1 then o.from + w else o.to - w
					local lean = if k == 1 then between(15, 35) else -between(15, 35)
					local a0, a1 = if k == 1 then 0 else -size * 0.5, if k == 1 then size * 0.5 else 0
					inPlane("Shard", at(corner, y0 + w, middle, 0, lean), a0, 0, -0.04, a1, size, 0.04, GLASS, M.Glass).Transparency = 0.35
				end
				if finishes then
					for _, f in finishes do
						local out = if f.face < 0 then -1 else 1
						local face = if f.face < 0 then side0 else side1
						for _ = 1, 4 do
							local s = between(0.25, 0.7)
							local fr = at(between(o.from, o.to), FLOOR + 0.02, face + out * between(0.6, 2.2), between(0, 180), 0)
							inPlane("FloorShard", fr, -s / 2, 0, -s / 3, s / 2, 0.04, s / 3, GLASS, M.Glass).Transparency = 0.3
						end
					end
				end
			end
		elseif o.bottom > 0 then
			-- Serving hatch: a steel ledge through the wall.
			add("Ledge", o.from, o.to, y0, y0 + 0.15, side0 - 0.6, side1 + 0.6, STEEL, M.Metal)
		else
			-- Doorway: threshold, wooden casing on both faces and maybe a door hanging open.
			add("Threshold", o.from, o.to, BASE, FLOOR, side0, side1, THRESHOLD, M.Metal)
			for _, p in { side0 - 0.12, side1 } do
				add("Casing", o.from - 0.45, o.from, FLOOR, y1 + 0.45, p, p + 0.12, TRIM, M.Wood)
				add("Casing", o.to, o.to + 0.45, FLOOR, y1 + 0.45, p, p + 0.12, TRIM, M.Wood)
				add("Casing", o.from - 0.45, o.to + 0.45, y1, y1 + 0.45, p, p + 0.12, TRIM, M.Wood)
			end
			local leaf = o.leaf
			if leaf then
				local width, tall = o.to - o.from - 0.3, y1 - 0.1 - FLOOR
				local toward = o.toward or 1
				local yaw = if axis == "X" then -toward * leaf else toward * leaf
				local f = at(o.from + 0.15, FLOOR, middle, yaw, 0)
				inPlane("Door", f, 0, 0, -0.1, width, tall, 0.1, tint(DOOR, 0.1), M.Wood)
				inPlane("DoorWindow", f, width * 0.3, tall * 0.55, -0.12, width * 0.7, tall * 0.85, 0.12, GLASS, M.Glass).Transparency = 0.5
				inPlane("DoorHandle", f, width - 0.55, tall * 0.45, -0.25, width - 0.35, tall * 0.5, 0.25, METAL, M.Metal)
			end
		end
		cursor = o.to
	end
	slab(cursor, to, 0, height)
end

--- Adds evenly spaced windows of a kind ("tall", "high" or "small") between `from` and `to`.
--- Each is smashed with probability `broken`.
local function addWindows(list: { Opening }, from: number, to: number, kind: string, broken: number): ()
	local spec = WINDOW_KINDS[kind]
	local bottom, top, width, gap = spec[1], spec[2], spec[3], spec[4]
	local span = to - from
	local count = math.floor((span - 2 + gap) / (width + gap))
	if count < 1 then
		return
	end
	local start = from + (span - (count * width + (count - 1) * gap)) / 2
	for index = 0, count - 1 do
		local a = start + index * (width + gap)
		table.insert(list, { from = a, to = a + width, bottom = bottom, top = top, glass = random() >= broken })
	end
end

--- A doorway opening, optionally with a door hung open `leaf` degrees toward side `toward`.
local function door(from: number, to: number, top: number, leaf: number?, toward: number?): Opening
	return { from = from, to = to, bottom = 0, top = top, leaf = leaf, toward = toward }
end

--- A floor slab of the roof or ceiling with the caved-in holes left open.
local function holedSlab(parent: Instance, name: string, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: Color3, material: Enum.Material): ()
	local xs = { x0, x1 }
	for _, hole in HOLES do
		table.insert(xs, hole[1])
		table.insert(xs, hole[2])
	end
	table.sort(xs)
	local count = 0
	for index = 1, #xs - 1 do
		local a, b = xs[index], xs[index + 1]
		if b - a > 0.01 then
			local spans: { { number } } = { { z0, z1 } }
			for _, hole in HOLES do
				if hole[1] <= a and hole[2] >= b then
					spans = cut(spans, hole[3], hole[4])
				end
			end
			for _, span in spans do
				count += 1
				box(parent, `{name}{count}`, a, y0, span[1], b, y1, span[2], color, material)
			end
		end
	end
end

--- Scatters loose sheets of paper over a floor area.
local function papers(parent: Instance, name: string, count: number, x0: number, z0: number, x1: number, z1: number): ()
	for index = 1, count do
		local f = frame(between(x0, x1), FLOOR, between(z0, z1), between(0, 180))
		piece(parent, `{name}{index}`, f, -0.5, 0, -0.7, 0.5, 0.03, 0.7, tint(PAPER, 0.08), M.SmoothPlastic)
	end
end

--- Scatters broken glass around a point.
local function shards(parent: Instance, name: string, x: number, z: number, count: number): ()
	for index = 1, count do
		local f = frame(x + between(-2.5, 2.5), FLOOR + 0.02, z + between(-1.5, 1.5), between(0, 180), between(-6, 6))
		local size = between(0.3, 0.9)
		piece(parent, `{name}{index}`, f, -size / 2, 0, -size / 3, size / 2, 0.04, size / 3, GLASS, M.Glass).Transparency = 0.3
	end
end

--- Piles rubble chunks (concrete and plaster from the ceiling) around a point.
local function rubble(parent: Instance, name: string, x: number, z: number, radius: number, count: number): ()
	for index = 1, count do
		local size = between(0.4, 1.4)
		local f = frame(x + between(-radius, radius), FLOOR + size * 0.3, z + between(-radius, radius), between(0, 360), between(-30, 30), between(-30, 30))
		local isPlaster = random() < 0.5
		piece(
			parent,
			`{name}{index}`,
			f,
			-size / 2,
			-size * 0.3,
			-size / 2,
			size / 2,
			if isPlaster then size * 0.1 else size * 0.3,
			size / 2,
			if isPlaster then CEILING_COLOR else CONCRETE_DARK,
			if isPlaster then M.Plaster else M.Concrete
		)
	end
end

--- A dark puddle of rainwater on the floor.
local function puddle(parent: Instance, name: string, x0: number, z0: number, x1: number, z1: number): ()
	local water = box(parent, name, x0, FLOOR, z0, x1, FLOOR + 0.03, z1, WATER, M.Glass)
	water.Transparency = 0.2
	water.Reflectance = 0.15
end

--- A fluorescent ceiling panel at (x, z) that still glows with probability `chance`.
local function ceilingLight(parent: Instance, name: string, x: number, z: number, alongX: boolean, chance: number): ()
	local working = random() < chance and workingLights < MAX_WORKING_LIGHTS
	local f = frame(x, CEILING, z, if alongX then 90 else 0)
	piece(parent, `{name}Housing`, f, -1, -0.25, -2, 1, 0, 2, TBAR, M.Metal)
	local lens = piece(parent, `{name}Lens`, f, -0.85, -0.3, -1.85, 0.85, -0.25, 1.85, if working then TUBE_ON else TUBE_OFF, M.SmoothPlastic)
	if working then
		workingLights += 1
		glow(lens, TUBE_ON, 24, 0.7)
	end
end

--- A grid of ceiling panels over a room, roughly `spacing` studs apart.
local function roomLights(parent: Instance, r: Room, spacing: number, chance: number): ()
	local nx = math.max(1, math.floor((r.x1 - r.x0) / spacing))
	local nz = math.max(1, math.floor((r.z1 - r.z0) / spacing))
	local count = 0
	for i = 1, nx do
		for k = 1, nz do
			local x = r.x0 + (i - 0.5) * (r.x1 - r.x0) / nx
			local z = r.z0 + (k - 0.5) * (r.z1 - r.z0) / nz
			if not inHole(x - 1, x + 1, z - 2, z + 2) then
				count += 1
				ceilingLight(parent, `Light{count}`, x, z, false, chance)
			end
		end
	end
end

--- A light panel that has come loose and hangs at an angle from one end.
local function hangingLight(parent: Instance, name: string, x: number, z: number): ()
	local f = frame(x, CEILING - 0.05, z, 15, -35)
	piece(parent, `{name}Housing`, f, -1, -0.25, -4, 1, 0, 0, TBAR, M.Metal)
	piece(parent, `{name}Lens`, f, -0.85, -0.3, -3.85, 0.85, -0.25, -0.15, TUBE_OFF, M.SmoothPlastic)
	beam(parent, `{name}Wire`, pointIn(f, 0, -0.1, -3.9), Vector3.new(x, CEILING, z) + (pointIn(f, 0, 0, -4) - f.origin) * Vector3.new(1, 0, 1), 0.05, 0.05, BLACK, M.SmoothPlastic)
end

--- Industrial lamps hanging under the gym and cafeteria trusses, a few still lit.
local function highBays(parent: Instance, xs: { number }, zs: { number }, chance: number): ()
	local count = 0
	for _, x in xs do
		for _, z in zs do
			count += 1
			local working = random() < chance and workingLights < MAX_WORKING_LIGHTS
			box(parent, `HighBay{count}Housing`, x - 1, CEILING - 2.2, z - 1, x + 1, CEILING - 1.6, z + 1, METAL, M.Metal)
			local lens = box(parent, `HighBay{count}Lens`, x - 0.8, CEILING - 2.3, z - 0.8, x + 0.8, CEILING - 2.2, z + 0.8, if working then TUBE_ON else TUBE_OFF, M.SmoothPlastic)
			beam(parent, `HighBay{count}Rod`, Vector3.new(x, CEILING - 1.6, z), Vector3.new(x, CEILING - 1.4, z), 0.08, 0.08, METAL, M.Metal)
			if working then
				workingLights += 1
				glow(lens, TUBE_ON, 36, 0.8)
			end
		end
	end
end

--- Knocks out ceiling tiles over a room: dark gaps in the grid, tiles dangling or lying below.
local function ceilingDamage(parent: Instance, r: Room, count: number): ()
	local cells: { { number } } = {}
	for gx = math.ceil(r.x0 / 4), math.floor(r.x1 / 4) - 1 do
		for gz = math.ceil(r.z0 / 4), math.floor(r.z1 / 4) - 1 do
			if not inHole(gx * 4 - 0.5, gx * 4 + 4.5, gz * 4 - 0.5, gz * 4 + 4.5) then
				table.insert(cells, { gx * 4, gz * 4 })
			end
		end
	end
	for index = 1, math.min(count, #cells) do
		local cell = table.remove(cells, math.floor(random() * #cells) + 1)
		if cell then
			local x, z = cell[1], cell[2]
			box(roofFolder, `{r.name}MissingTile{index}`, x + 0.06, CEILING - 0.02, z + 0.06, x + 3.94, CEILING, z + 3.94, PLENUM, M.SmoothPlastic)
			local color = tint(STAINED_TILE, 0.12)
			if random() < 0.25 then
				local f = frame(x + 0.06, CEILING - 0.06, z + 2, 0, 0, -between(40, 70))
				piece(parent, `FallenTile{index}`, f, 0, -0.1, -1.88, 3.8, 0, 1.88, color, M.Plaster)
			else
				-- Broken in two on the floor.
				for half = 1, 2 do
					local w, d = between(1, 1.9), between(1.2, 3)
					local f = frame(x + 2 + between(-1.8, 1.8), FLOOR + 0.06, z + 2 + between(-1.8, 1.8), between(0, 180), between(-4, 4))
					piece(parent, `FallenTile{index}_{half}`, f, -w / 2, -0.05, -d / 2, w / 2, 0.05, d / 2, color, M.Plaster)
				end
			end
		end
	end
end

--- Builds a school desk (top, book rack, four metal legs) facing -X in its frame.
local function desk(parent: Instance, name: string, f: Frame): ()
	piece(parent, `{name}Top`, f, -1, 2.5, -1.5, 1, 2.65, 1.5, tint(WOOD, 0.1), M.Wood)
	piece(parent, `{name}Rack`, f, -0.7, 2, -1.3, 0.6, 2.08, 1.3, METAL, M.Metal)
	for index, corner in { { -0.85, -1.35 }, { 0.85, -1.35 }, { -0.85, 1.35 }, { 0.85, 1.35 } } do
		piece(parent, `{name}Leg{index}`, f, corner[1] - 0.075, 0, corner[2] - 0.075, corner[1] + 0.075, 2.5, corner[2] + 0.075, METAL, M.Metal)
	end
end

--- Builds a school chair (seat, backrest, four legs) facing -X in its frame.
local function chair(parent: Instance, name: string, f: Frame): ()
	local color = tint(SEAT, 0.1)
	piece(parent, `{name}Seat`, f, -0.8, 1.5, -0.8, 0.8, 1.65, 0.8, color, M.Wood)
	piece(parent, `{name}Back`, f, 0.7, 1.65, -0.8, 0.85, 3.6, 0.8, color, M.Wood)
	for index, corner in { { -0.65, -0.65 }, { 0.65, -0.65 }, { -0.65, 0.65 }, { 0.65, 0.65 } } do
		piece(parent, `{name}Leg{index}`, f, corner[1] - 0.06, 0, corner[2] - 0.06, corner[1] + 0.06, 1.5, corner[2] + 0.06, METAL, M.Metal)
	end
end

--- A chair that is standing at (x, z) facing `yaw`, or lying on its back near there.
local function looseChair(parent: Instance, name: string, x: number, z: number, yaw: number, fallen: boolean): ()
	if fallen then
		chair(parent, name, frame(x + between(-0.3, 0.3), FLOOR + 0.8, z + between(-0.3, 0.3), between(0, 360), 90))
	else
		chair(parent, name, frame(x, FLOOR, z, yaw + between(-15, 15)))
	end
end

--- A lab or art stool: square seat on four legs.
local function stool(parent: Instance, name: string, f: Frame): ()
	piece(parent, `{name}Seat`, f, -0.6, 2.6, -0.6, 0.6, 2.75, 0.6, tint(WOOD, 0.1), M.Wood)
	for index, corner in { { -0.45, -0.45 }, { 0.45, -0.45 }, { -0.45, 0.45 }, { 0.45, 0.45 } } do
		piece(parent, `{name}Leg{index}`, f, corner[1] - 0.06, 0, corner[2] - 0.06, corner[1] + 0.06, 2.6, corner[2] + 0.06, METAL, M.Metal)
	end
end

--- A table (top and four legs) `2hw` by `2hd`, `height` tall, centred on its frame.
local function tableTop(parent: Instance, name: string, f: Frame, hw: number, hd: number, height: number, color: Color3, material: Enum.Material): ()
	piece(parent, `{name}Top`, f, -hw, height - 0.2, -hd, hw, height, hd, color, material)
	for index, corner in { { -1, -1 }, { 1, -1 }, { -1, 1 }, { 1, 1 } } do
		local x, z = corner[1] * (hw - 0.35), corner[2] * (hd - 0.35)
		piece(parent, `{name}Leg{index}`, f, x - 0.1, 0, z - 0.1, x + 0.1, height - 0.2, z + 0.1, METAL, M.Metal)
	end
end

--- Shelving in a frame's local space: back panel at x = 0, open toward -x, running z 0..length.
--- `kind` fills it with "books", "bottles", "boxes" or "jars".
local function shelving(parent: Instance, name: string, f: Frame, length: number, depth: number, height: number, color: Color3, material: Enum.Material, kind: string, fill: number): ()
	piece(parent, `{name}Back`, f, -0.1, 0, 0, 0, height, length, color, material)
	piece(parent, `{name}SideA`, f, -depth, 0, 0, -0.1, height, 0.15, color, material)
	piece(parent, `{name}SideB`, f, -depth, 0, length - 0.15, -0.1, height, length, color, material)
	local levels: { number } = {}
	local level = 0
	while level < height - 1.9 do
		table.insert(levels, level)
		level += 2.3
	end
	table.insert(levels, height - 0.15)
	for index, y in levels do
		piece(parent, `{name}Shelf{index}`, f, -depth, y, 0.15, -0.1, y + 0.15, length - 0.15, color, material)
	end
	local items = 0
	for shelf = 1, #levels - 1 do
		local bottom = levels[shelf] + 0.15
		local space = levels[shelf + 1] - bottom - 0.1
		local z = 0.3
		while z < length - 0.7 do
			local thickness = if kind == "books" then between(0.2, 0.4) elseif kind == "boxes" then between(1, 1.8) else between(0.35, 0.5)
			thickness = math.min(thickness, length - 0.2 - z)
			if random() < fill then
				items += 1
				local itemName = `{name}Item{items}`
				if kind == "books" then
					local tall = math.min(space, between(1.2, 1.9))
					piece(parent, itemName, f, -depth + 0.15, bottom, z, -0.2, bottom + tall, z + thickness, pick(BOOK_COLORS), M.Fabric)
				elseif kind == "boxes" then
					local tall = math.min(space, between(0.8, 1.8))
					piece(parent, itemName, f, -depth + 0.1, bottom, z, -0.2, bottom + tall, z + thickness, tint(CARDBOARD, 0.15), M.Cardboard)
				elseif kind == "bottles" then
					local tall = math.min(space, between(0.6, 1.2))
					local bottle = piece(parent, itemName, f, -depth + 0.4, bottom, z, -depth + 0.4 + thickness, bottom + tall, z + thickness, pick(PAINT_COLORS), M.Glass)
					bottle.Transparency = 0.35
				else
					local tall = math.min(space, between(0.5, 0.9))
					piece(parent, itemName, f, -depth + 0.3, bottom, z, -depth + 0.3 + thickness, bottom + tall, z + thickness, pick(PAINT_COLORS), M.SmoothPlastic)
				end
			end
			z += thickness + (if kind == "books" then 0.05 else between(0.15, 0.5))
		end
	end
end

--- An old CRT computer on a desk top, screen facing -x in its frame, with keyboard and cable.
local function computer(parent: Instance, name: string, f: Frame, smashed: boolean): ()
	piece(parent, `{name}Monitor`, f, -0.7, 0, -1, 0.9, 1.8, 1, tint(BEIGE, 0.06), M.SmoothPlastic)
	piece(parent, `{name}Tube`, f, 0.9, 0.3, -0.6, 1.5, 1.5, 0.6, tint(BEIGE, 0.06), M.SmoothPlastic)
	local screen = piece(parent, `{name}Screen`, f, -0.75, 0.3, -0.8, -0.7, 1.5, 0.8, if smashed then Color3.fromRGB(90, 96, 100) else BLACK, M.Glass)
	screen.Reflectance = 0.2
	piece(parent, `{name}Keyboard`, f, -1.8, 0, -0.9, -1.1, 0.12, 0.9, tint(BEIGE, 0.06), M.SmoothPlastic)
end

--- A trash can at (x, z), standing or tipped over.
local function trashCan(parent: Instance, name: string, x: number, z: number, tipped: boolean): ()
	local f = if tipped then frame(x, FLOOR + 0.7, z, between(0, 360), 90) else frame(x, FLOOR, z, between(0, 90))
	piece(parent, name, f, -0.7, 0, -0.7, 0.7, 2, 0.7, METAL, M.Metal)
	piece(parent, `{name}Inside`, f, -0.6, 1.98, -0.6, 0.6, 2.01, 0.6, BLACK, M.SmoothPlastic)
	if tipped then
		papers(parent, `{name}Trash`, 4, x - 2, z - 2, x + 2, z + 2)
	end
end

--- A yellow "wet floor" sign: two boards leaning together.
local function wetFloorSign(parent: Instance, name: string, x: number, z: number): ()
	local yaw = between(0, 360)
	for index, lean in { 14, -14 } do
		local f = frame(x, FLOOR, z, yaw, lean)
		piece(parent, `{name}Board{index}`, f, -0.6, 0, -0.04 - lean * 0.002, 0.6, 2.4, 0.04 - lean * 0.002, YELLOW, M.SmoothPlastic)
	end
end

--- A wall board (cork notice board or poster) flat against a wall face.
--- `axis` is the direction the wall runs; `face` is its face and `dir` the side the board is on.
local function wallBoard(parent: Instance, name: string, axis: "X" | "Z", a0: number, a1: number, y0: number, y1: number, face: number, dir: number, color: Color3, material: Enum.Material, notes: number): ()
	local p0, p1 = face, face + dir * 0.1
	wallBox(parent, name, axis, a0, a1, y0, y1, math.min(p0, p1), math.max(p0, p1), color, material)
	for index = 1, notes do
		local a, y = between(a0 + 0.6, a1 - 0.6), between(y0 + 0.6, y1 - 0.6)
		local q0, q1 = p1, p1 + dir * 0.03
		wallBox(parent, `{name}Note{index}`, axis, a - 0.5, a + 0.5, y - 0.6, y + 0.6, math.min(q0, q1), math.max(q0, q1), if index % 2 == 0 then PAPER else pick(POSTER_COLORS), M.SmoothPlastic)
	end
end

--- A chalkboard with frame, tray, chalk writing and an eraser on a wall at x = `x0` facing +x.
local function chalkboard(parent: Instance, x0: number, cz: number): ()
	local bx = x0 + 0.25
	box(parent, "BoardFrame", bx, FLOOR + 3.3, cz - 8.4, bx + 0.3, FLOOR + 9.6, cz + 8.4, WOOD_DARK, M.Wood)
	box(parent, "Chalkboard", bx + 0.3, FLOOR + 3.6, cz - 8, bx + 0.4, FLOOR + 9.3, cz + 8, tint(CHALKBOARD, 0.06), M.Slate)
	box(parent, "ChalkTray", bx + 0.3, FLOOR + 3.4, cz - 8, bx + 0.9, FLOOR + 3.55, cz + 8, WOOD_DARK, M.Wood)
	box(parent, "Eraser", bx + 0.35, FLOOR + 3.55, cz + 2, bx + 0.75, FLOOR + 3.8, cz + 3, BLACK, M.Fabric)
	for index, y in { 8.4, 7.5, 6.6, 5.7, 4.8 } do
		local length = between(5, 13)
		box(parent, `Chalk{index}`, bx + 0.4, FLOOR + y, cz - 7, bx + 0.45, FLOOR + y + 0.12, cz - 7 + length, CHALK, M.SmoothPlastic)
	end
end

--- Lockers in a row against a wall face. `axis` is the direction the wall runs, `face` the wall's
--- face position and `dir` (+1 or -1) the side the lockers stand on.
local function lockerRun(parent: Instance, prefix: string, axis: "X" | "Z", from: number, to: number, face: number, dir: number): ()
	local count = math.floor((to - from) / 2.5)
	if count < 1 then
		return
	end
	local start = from + (to - from - count * 2.5) / 2
	local color = tint(LOCKER, 0.12)
	local front = face + dir * 2
	local function slot(name: string, a0: number, a1: number, y0: number, y1: number, p0: number, p1: number, c: Color3, m: Enum.Material): ()
		wallBox(parent, name, axis, a0, a1, y0, y1, math.min(p0, p1), math.max(p0, p1), c, m)
	end
	for index = 0, count - 1 do
		local a = start + index * 2.5
		local name = `{prefix}Locker{index + 1}`
		slot(name, a, a + 2.5, FLOOR, FLOOR + 7, face, front, tint(color, 0.05), M.CorrodedMetal)
		slot(`{name}Plate`, a + 1, a + 1.5, FLOOR + 6.6, FLOOR + 6.8, front, front + dir * 0.03, GOLD, M.Foil)
		if random() < 0.12 then
			-- The door hangs open, showing the dark inside.
			slot(`{name}Inside`, a + 0.2, a + 2.3, FLOOR + 0.3, FLOOR + 6.5, front, front + dir * 0.02, BLACK, M.SmoothPlastic)
			local angle = between(70, 110)
			local yaw = if axis == "X" then -dir * angle else dir * angle
			local p = front + dir * 0.06
			if axis == "X" then
				piece(parent, `{name}Door`, frame(a + 0.05, FLOOR + 0.2, p, yaw), 0, 0, -0.04, 2.3, 6.4, 0.04, color, M.CorrodedMetal)
			else
				piece(parent, `{name}Door`, frame(p, FLOOR + 0.2, a + 0.05, yaw), -0.04, 0, 0, 0.04, 6.4, 2.3, color, M.CorrodedMetal)
			end
		else
			slot(`{name}VentA`, a + 0.6, a + 1.9, FLOOR + 5.9, FLOOR + 6.05, front, front + dir * 0.04, BLACK, M.SmoothPlastic)
			slot(`{name}VentB`, a + 0.6, a + 1.9, FLOOR + 6.3, FLOOR + 6.45, front, front + dir * 0.04, BLACK, M.SmoothPlastic)
			slot(`{name}Handle`, a + 2, a + 2.15, FLOOR + 3, FLOOR + 3.8, front, front + dir * 0.2, METAL, M.Metal)
		end
	end
end

--- The parts of `from`..`to` that are at least `margin` away from every opening.
local function freeRanges(from: number, to: number, openings: { Opening }, margin: number): { { number } }
	local spans: { { number } } = { { from, to } }
	for _, o in openings do
		spans = cut(spans, o.from - margin, o.to + margin)
	end
	return spans
end

--- Lines a hallway wall face with lockers, and fills short gaps with fountains and fire cabinets.
local function lineWall(parent: Instance, prefix: string, axis: "X" | "Z", from: number, to: number, face: number, dir: number, openings: { Opening }): ()
	for index, span in freeRanges(from, to, openings, 1.2) do
		local length = span[2] - span[1]
		local name = `{prefix}{index}`
		local mid = (span[1] + span[2]) / 2
		local roll = random()
		local function out(depth: number): (number, number)
			local p = face + dir * depth
			return math.min(face, p), math.max(face, p)
		end
		if length >= 5 and roll < 0.8 then
			lockerRun(parent, name, axis, span[1], span[2], face, dir)
		elseif length >= 3 then
			if roll < 0.9 then
				local p0, p1 = out(1.4)
				wallBox(parent, `{name}Fountain`, axis, mid - 0.8, mid + 0.8, FLOOR + 2.4, FLOOR + 3.4, p0, p1, STEEL, M.Metal)
				local q0, q1 = out(0.25)
				wallBox(parent, `{name}FountainBack`, axis, mid - 0.8, mid + 0.8, FLOOR + 3.4, FLOOR + 5, q0, q1, STEEL, M.Metal)
			else
				local p0, p1 = out(0.5)
				wallBox(parent, `{name}FireCabinet`, axis, mid - 1, mid + 1, FLOOR + 4.6, FLOOR + 7.4, p0, p1, RED, M.Metal)
			end
			if length >= 7 then
				wallBoard(parent, `{name}NoticeBoard`, axis, mid - 2.5, mid + 2.5, FLOOR + 6.5, FLOOR + 10, face, dir, CORK, M.Fabric, 4)
			end
		end
	end
end

--- Builds a dead, leafless tree: a leaning trunk with a few branches and twigs.
local function deadTree(parent: Instance, name: string, x: number, z: number, height: number): ()
	local top = Vector3.new(x + between(-1.5, 1.5), height, z + between(-1.5, 1.5))
	beam(parent, `{name}Trunk`, Vector3.new(x, -0.5, z), top, 1.4, 1.4, DEAD_WOOD, M.Wood)
	for index = 1, 5 do
		local t = between(0.45, 0.95)
		local start = Vector3.new(x, 0, z):Lerp(top, t)
		local angle = math.rad(index * 72 + between(-20, 20))
		local reach = between(4, 7) * (1.1 - t * 0.5)
		local tip = start + Vector3.new(math.cos(angle) * reach, between(2, 5), math.sin(angle) * reach)
		beam(parent, `{name}Branch{index}`, start, tip, 0.5, 0.5, DEAD_WOOD, M.Wood)
		local twigAngle = angle + between(-0.8, 0.8)
		beam(parent, `{name}Twig{index}`, tip, tip + Vector3.new(math.cos(twigAngle) * 2.5, between(1, 2.5), math.sin(twigAngle) * 2.5), 0.22, 0.22, DEAD_WOOD, M.Wood)
	end
end

--- Scatters clumps of weeds over an area.
local function weeds(parent: Instance, name: string, count: number, x0: number, z0: number, x1: number, z1: number, baseY: number): ()
	for index = 1, count do
		local size = between(0.6, 1.6)
		local f = frame(between(x0, x1), baseY, between(z0, z1), between(0, 90))
		piece(parent, `{name}{index}`, f, -size / 2, 0, -size / 2, size / 2, size * between(0.6, 1.2), size / 2, tint(LEAVES, 0.15), M.LeafyGrass)
	end
end

--- Draws a cracked line on a flat surface whose top is at `y`.
local function crack(parent: Instance, name: string, x: number, z: number, y: number, length: number): ()
	local angle = between(0, math.pi)
	local mid = Vector3.new(x + math.cos(angle) * length * 0.5, y + 0.01, z + math.sin(angle) * length * 0.5)
	local bend = angle + between(-0.6, 0.6)
	beam(parent, `{name}A`, Vector3.new(x, y + 0.01, z), mid, 0.25, 0.02, CRACK, M.SmoothPlastic)
	beam(parent, `{name}B`, mid, mid + Vector3.new(math.cos(bend) * length * 0.5, 0, math.sin(bend) * length * 0.5), 0.18, 0.02, CRACK, M.SmoothPlastic)
end

--- Thin ivy creeping up a wall face. `axis` is the direction the wall runs; `face` is the wall's
--- outside face position and `out` (+1 or -1) the side the ivy grows on.
local function ivy(parent: Instance, name: string, axis: "X" | "Z", face: number, out: number, from: number, to: number, height: number, baseY: number): ()
	local count = 0
	local cursor = from
	while cursor < to - 0.5 do
		local width = math.min(between(1, 2.5), to - cursor)
		local top = baseY + height * between(0.4, 1)
		count += 1
		local near, far = if out > 0 then face else face - 0.12, if out > 0 then face + 0.12 else face
		wallBox(parent, `{name}{count}`, axis, cursor, cursor + width, baseY, top, near, far, tint(LEAVES, 0.12), M.LeafyGrass)
		cursor += width
	end
end

--- An outdoor bench with a backrest, seat along x from `x` to `x + 6`, back on the +z side.
local function parkBench(parent: Instance, name: string, x: number, y: number, z: number): ()
	box(parent, `{name}Seat`, x, y + 1.6, z, x + 6, y + 1.8, z + 2, tint(WOOD, 0.1), M.WoodPlanks)
	box(parent, `{name}Back`, x, y + 1.8, z + 1.8, x + 6, y + 3.6, z + 2, tint(WOOD, 0.1), M.WoodPlanks)
	box(parent, `{name}LegA`, x + 0.3, y, z + 0.2, x + 0.6, y + 1.6, z + 1.8, RUST, M.CorrodedMetal)
	box(parent, `{name}LegB`, x + 5.4, y, z + 0.2, x + 5.7, y + 1.6, z + 1.8, RUST, M.CorrodedMetal)
end

-- Building ---------------------------------------------------------------------------------

--- The school building: foundation, outside brick walls with windows and inside walls.
local function buildShell(model: Instance): ()
	local folder = Instance.new("Folder")
	folder.Name = "Building"
	folder.Parent = model
	box(folder, "Foundation", BX0, 0, BZ0, BX1, BASE, BZ1, CONCRETE, M.Concrete)

	local function paint(face: number, color: Color3): Finish
		return { face = face, color = color, material = M.Plaster }
	end
	local function lined(face: number): { Finish }
		return { { face = face, color = ROOM_PAINT, material = M.Plaster, lining = true } }
	end
	local function corridor(face: number): Finish
		return { face = face, color = WAINSCOT, material = M.CeramicTiles }
	end
	local gymMid = (GYM.x0 + GYM.x1) / 2

	-- Front: tall windows, small toilet windows, the main entrance and the gym's side door.
	local front: { Opening } = {}
	for _, r in FRONT_ROOMS do
		if r == LOBBY then
			addWindows(front, r.x0, -69, "tall", 0.4)
			addWindows(front, -57, r.x1, "tall", 0.4)
		elseif r == BOYS or r == GIRLS then
			addWindows(front, r.x0, r.x1, "small", 0.3)
		else
			addWindows(front, r.x0, r.x1, "tall", 0.35)
		end
	end
	table.insert(front, door(-68, -58, 11))
	table.insert(front, door(WING_X1 + 4, WING_X1 + 10, 8, 70, 1))
	addWindows(front, WING_X1 + 11, gymMid - 4, "high", 0.3) -- the gap behind the hoop has no window
	addWindows(front, gymMid + 4, IX1, "high", 0.3)
	wall(folder, "FrontWall", "X", BX0, BX1, IZ1, BZ1, front, BRICK, M.Brick, lined(-1))
	-- Cast-iron radiators under the tall front windows.
	for index, o in front do
		if o.glass ~= nil and o.bottom == 4 then
			local z1 = IZ1 - 0.25
			box(folder, `Radiator{index}`, o.from + 0.4, FLOOR + 0.5, z1 - 0.5, o.to - 0.4, FLOOR + 2.9, z1, tint(RADIATOR, 0.06), M.Metal)
			box(folder, `Radiator{index}FootA`, o.from + 0.6, FLOOR, z1 - 0.4, o.from + 0.9, FLOOR + 0.5, z1 - 0.1, RUST, M.CorrodedMetal)
			box(folder, `Radiator{index}FootB`, o.to - 0.9, FLOOR, z1 - 0.4, o.to - 0.6, FLOOR + 0.5, z1 - 0.1, RUST, M.CorrodedMetal)
		end
	end

	-- Back and sides face the lot wall, so they only have high windows above it.
	local back: { Opening } = {}
	for _, r in ROW2_ROOMS do
		addWindows(back, r.x0, r.x1, "high", 0.35)
	end
	addWindows(back, WING_X1, IX1, "high", 0.3)
	wall(folder, "BackWall", "X", BX0, BX1, BZ0, IZ0, back, BRICK, M.Brick, lined(1))
	local west: { Opening } = {}
	for _, span in { { ROW2_Z0, ROW2_Z1 }, { MID_HALL_Z0, MID_HALL_Z1 }, { ROW1_Z0, ROW1_Z1 }, { HALL_Z0, HALL_Z1 }, { FRONT_Z0, IZ1 } } do
		addWindows(west, span[1], span[2], "high", 0.35)
	end
	wall(folder, "WestWall", "Z", IZ0, IZ1, BX0, IX0, west, BRICK, M.Brick, lined(1))
	local east: { Opening } = {}
	addWindows(east, IZ0, DIVIDER_Z0, "high", 0.3)
	addWindows(east, DIVIDER_Z1, IZ1, "high", 0.3)
	wall(folder, "EastWall", "Z", IZ0, IZ1, IX1, BX1, east, BRICK, M.Brick, lined(-1))

	-- The wing wall: both hallways open into the gym through double doorways.
	wall(folder, "WingWall", "Z", IZ0, IZ1, WING_X0, WING_X1, {
		door(HALL_Z0 + 1, HALL_Z1 - 1, 10),
		door(MID_HALL_Z0 + 1, MID_HALL_Z1 - 1, 10),
	}, PLASTER, M.Plaster, { paint(-1, CLASS_PAINT), paint(1, GYM_PAINT) })
	wall(folder, "GymDivider", "X", WING_X1, IX1, DIVIDER_Z0, DIVIDER_Z1, { door(WING_X1 + 3, WING_X1 + 9, 10) }, PLASTER, M.Plaster, {
		paint(-1, GYM_PAINT),
		paint(1, GYM_PAINT),
	})

	-- Hallway walls, each with the doors of the rooms along it (doors swing out into the hallway).
	local function bandDoors(rooms: { Room }, toward: number): { Opening }
		local list: { Opening } = {}
		for _, r in rooms do
			if r == LOBBY then
				table.insert(list, { from = -76, to = -50, bottom = 0, top = 12 })
			else
				local leaf: number? = if random() < 0.8 then between(40, 90) else nil
				table.insert(list, door(r.x1 - 6, r.x1 - 2, 8, leaf, toward))
			end
		end
		return list
	end
	local w1 = bandDoors(FRONT_ROOMS, -1)
	local w2 = bandDoors(ROW1_ROOMS, 1)
	local w3: { Opening } = {}
	local w4 = bandDoors(ROW2_ROOMS, 1)
	wall(folder, "HallWall1", "X", IX0, WING_X0, HALL_Z1, FRONT_Z0, w1, PLASTER, M.Plaster, { corridor(-1), paint(1, ROOM_PAINT) })
	wall(folder, "HallWall2", "X", IX0, WING_X0, ROW1_Z1, HALL_Z0, w2, PLASTER, M.Plaster, { paint(-1, CLASS_PAINT), corridor(1) })
	wall(folder, "HallWall3", "X", IX0, WING_X0, MID_HALL_Z1, ROW1_Z0, w3, PLASTER, M.Plaster, { corridor(-1), paint(1, CLASS_PAINT) })
	wall(folder, "HallWall4", "X", IX0, WING_X0, ROW2_Z1, MID_HALL_Z0, w4, PLASTER, M.Plaster, { paint(-1, CLASS_PAINT), corridor(1) })
	hallOpenings.FrontLow, hallOpenings.FrontHigh = w2, w1
	hallOpenings.MidLow, hallOpenings.MidHigh = w4, w3

	-- Walls between neighbouring rooms.
	local function partitions(prefix: string, rooms: { Room }, z0: number, z1: number, color: Color3): ()
		for index = 1, #rooms - 1 do
			local a, b = rooms[index], rooms[index + 1]
			wall(folder, `{prefix}Wall{index}`, "Z", z0, z1, a.x1, b.x0, {}, PLASTER, M.Plaster, { paint(-1, color), paint(1, color) })
		end
	end
	partitions("Front", FRONT_ROOMS, FRONT_Z0, IZ1, ROOM_PAINT)
	partitions("Row1", ROW1_ROOMS, ROW1_Z0, ROW1_Z1, CLASS_PAINT)
	partitions("Row2", ROW2_ROOMS, ROW2_Z0, ROW2_Z1, CLASS_PAINT)
end

--- Ceiling with its tile grid, roof deck, parapet and rooftop units. Kept in their own folder
--- so the viewer can hide them; the caved-in holes go through both ceiling and roof.
local function buildRoof(model: Instance): ()
	local folder = Instance.new("Folder")
	folder.Name = "Roof"
	folder.Parent = model
	roofFolder = folder
	holedSlab(folder, "Ceiling", BX0, BX1, BZ0, BZ1, CEILING, CEILING + 0.4, CEILING_COLOR, M.Plaster)
	holedSlab(folder, "RoofDeck", BX0, BX1, BZ0, BZ1, CEILING + 0.4, CEILING + 1.2, ROOF_COLOR, M.Asphalt)
	local top = CEILING + 1.2
	box(folder, "ParapetFront", BX0, top, BZ1 - 1, BX1, top + 1.5, BZ1, BRICK, M.Brick)
	box(folder, "ParapetBack", BX0, top, BZ0, BX1, top + 1.5, BZ0 + 1, BRICK, M.Brick)
	box(folder, "ParapetWest", BX0, top, BZ0 + 1, BX0 + 1, top + 1.5, BZ1 - 1, BRICK, M.Brick)
	box(folder, "ParapetEast", BX1 - 1, top, BZ0 + 1, BX1, top + 1.5, BZ1 - 1, BRICK, M.Brick)
	box(folder, "CopingFront", BX0, top + 1.5, BZ1 - 1, BX1, top + 1.7, BZ1, CONCRETE, M.Concrete)
	box(folder, "CopingBack", BX0, top + 1.5, BZ0, BX1, top + 1.7, BZ0 + 1, CONCRETE, M.Concrete)
	box(folder, "CopingWest", BX0, top + 1.5, BZ0 + 1, BX0 + 1, top + 1.7, BZ1 - 1, CONCRETE, M.Concrete)
	box(folder, "CopingEast", BX1 - 1, top + 1.5, BZ0 + 1, BX1, top + 1.7, BZ1 - 1, CONCRETE, M.Concrete)
	for index, spot in { { -90, 0 }, { -20, 4 }, { -40, -40 }, { 40, 30 }, { 50, -40 } } do
		local x, z = spot[1], spot[2]
		box(folder, `AirUnit{index}`, x - 3, top, z - 3, x + 3, top + 2.4, z + 3, tint(RUST, 0.1), M.CorrodedMetal)
		box(folder, `AirUnit{index}Fan`, x - 2, top + 2.4, z - 2, x + 2, top + 2.5, z + 2, BLACK, M.Metal)
		box(folder, `AirUnit{index}Duct`, x + 3, top, z - 0.8, x + 6, top + 1.6, z + 0.8, METAL, M.Metal)
	end
	for index, spot in { { -110, 20 }, { -60, -8 }, { 0, -10 }, { -30, -45 }, { 10, 30 }, { 45, 40 } } do
		box(folder, `Vent{index}`, spot[1] - 0.6, top, spot[2] - 0.6, spot[1] + 0.6, top + 1.4, spot[2] + 0.6, METAL, M.Metal)
	end
	box(folder, "RoofHatch", -30, top, -6, -26, top + 0.6, -2, METAL, M.Metal)
	for index, spot in { { -100, -10, 8, 6 }, { -20, -40, 10, 5 }, { 30, 0, 6, 9 } } do
		local water = box(folder, `RoofPuddle{index}`, spot[1], top, spot[2], spot[1] + spot[3], top + 0.03, spot[2] + spot[4], WATER, M.Glass)
		water.Transparency = 0.2
		water.Reflectance = 0.2
	end
	-- Torn roof and ceiling hanging down into the holes.
	for index, hole in HOLES do
		local cx, half = (hole[1] + hole[2]) / 2, (hole[2] - hole[1]) / 2 - 0.5
		piece(folder, `HoleFlapRoof{index}`, frame(cx, CEILING + 0.8, hole[3], 0, 35), -half, -0.4, 0, half, 0.4, 2.5, ROOF_COLOR, M.Asphalt)
		piece(folder, `HoleFlapCeiling{index}`, frame(cx, CEILING + 0.2, hole[4], 180, 50), -half, -0.2, 0, half, 0.2, 3, CEILING_COLOR, M.Plaster)
	end

	-- Suspended ceiling grid over the classroom wing.
	local count = 0
	for gx = math.ceil(IX0 / 4), math.floor(WING_X0 / 4) do
		local x = gx * 4
		if x > IX0 + 0.5 and x < WING_X0 - 0.5 then
			local spans: { { number } } = { { IZ0, IZ1 } }
			for _, hole in HOLES do
				if x + 0.06 > hole[1] and x - 0.06 < hole[2] then
					spans = cut(spans, hole[3], hole[4])
				end
			end
			for _, span in spans do
				count += 1
				box(folder, `Grid{count}`, x - 0.06, CEILING - 0.06, span[1], x + 0.06, CEILING, span[2], TBAR, M.Metal)
			end
		end
	end
	for gz = math.ceil(IZ0 / 4), math.floor(IZ1 / 4) do
		local z = gz * 4
		if z > IZ0 + 0.5 and z < IZ1 - 0.5 then
			local spans: { { number } } = { { IX0, WING_X0 } }
			for _, hole in HOLES do
				if z + 0.06 > hole[3] and z - 0.06 < hole[4] then
					spans = cut(spans, hole[1], hole[2])
				end
			end
			for _, span in spans do
				count += 1
				box(folder, `Grid{count}`, span[1], CEILING - 0.06, z - 0.06, span[2], CEILING, z + 0.06, TBAR, M.Metal)
			end
		end
	end
	-- Exposed steel trusses over the gym and cafeteria.
	local trusses = 0
	for z = IZ0 + 4, IZ1 - 4, 8 do
		if z + 0.3 > DIVIDER_Z0 and z - 0.3 < DIVIDER_Z1 then
			continue
		end
		local spans: { { number } } = { { WING_X1, IX1 } }
		for _, hole in HOLES do
			if z + 0.3 > hole[3] and z - 0.3 < hole[4] then
				spans = cut(spans, hole[1], hole[2])
			end
		end
		for _, span in spans do
			trusses += 1
			box(folder, `Truss{trusses}`, span[1], CEILING - 1.4, z - 0.3, span[2], CEILING, z + 0.3, METAL, M.Metal)
		end
	end
end

-- Rooms ------------------------------------------------------------------------------------

--- A classroom: chalkboard on the west wall, desks in rows facing it, door near the east end of
--- the z1 wall. `mess` (0..1) sets how much is knocked over.
local function buildClassroom(sections: Instance, r: Room, description: string, mess: number, withShelf: boolean): Folder
	local folder = newSection(sections, r.name, description)
	local x0, x1, z0, z1 = r.x0, r.x1, r.z0, r.z1
	local cz = (z0 + z1) / 2
	if random() < 0.5 then
		box(folder, "Floor", x0, BASE, z0, x1, FLOOR, z1, tint(WOOD_FLOOR, 0.08), M.WoodPlanks)
	else
		box(folder, "Floor", x0, BASE, z0, x1, FLOOR, z1, tint(VINYL, 0.06), M.CeramicTiles)
	end
	chalkboard(folder, x0, cz)
	box(folder, "Clock", x1 - 0.25, FLOOR + 11, cz - 0.75, x1, FLOOR + 12.5, cz + 0.75, WHITE, M.SmoothPlastic)
	box(folder, "ClockHand", x1 - 0.3, FLOOR + 11.7, cz - 0.05, x1 - 0.25, FLOOR + 12.3, cz + 0.05, BLACK, M.SmoothPlastic)

	-- Teacher's desk and chair.
	box(folder, "TeacherDeskTop", x0 + 3, FLOOR + 2.6, cz + 3.5, x0 + 6, FLOOR + 2.75, cz + 8.5, WOOD_DARK, M.Wood)
	box(folder, "TeacherDeskLeft", x0 + 3, FLOOR, cz + 3.5, x0 + 6, FLOOR + 2.6, cz + 5, WOOD_DARK, M.Wood)
	box(folder, "TeacherDeskRight", x0 + 3, FLOOR, cz + 7, x0 + 6, FLOOR + 2.6, cz + 8.5, WOOD_DARK, M.Wood)
	box(folder, "TeacherBooks", x0 + 3.4, FLOOR + 2.75, cz + 7, x0 + 4.6, FLOOR + 3.3, cz + 8.2, pick(BOOK_COLORS), M.Fabric)
	chair(folder, "TeacherChair", frame(x0 + 2.1, FLOOR, cz + 6, 180 + between(-20, 20)))
	trashCan(folder, "TrashCan", x0 + 4.5, cz + 10.5, random() < mess)

	-- Student desks in rows of four, some knocked over.
	local rows = math.min(5, math.floor((x1 - x0 - 11) / 4))
	for row = 1, rows do
		for column = 1, 4 do
			local x, z = x0 + 6 + row * 4, cz - 15 + column * 6
			local label = `{row}_{column}`
			local underHole = inHole(x - 1.5, x + 3, z - 1.5, z + 1.5)
			if underHole or random() < mess * 0.4 then
				desk(folder, `Desk{label}`, frame(x, FLOOR + 1, z, between(-40, 40), 0, 90))
			else
				desk(folder, `Desk{label}`, frame(x + between(-0.2, 0.2), FLOOR, z + between(-0.2, 0.2), between(-5, 5)))
			end
			looseChair(folder, `Chair{label}`, x + 2.2, z, 0, underHole or random() < mess * 0.5)
		end
	end

	-- Posters on the back wall (one slipped), a notice board by the door, maybe a bookshelf.
	for index = 1, 3 do
		local px = x0 + (x1 - x0) * 0.25 * index
		local w, h = between(2, 3.2), between(2.5, 3.5)
		local f = frame(px, FLOOR + 6, z0 + 0.12, 0, 0, if index == 2 then between(-18, 18) else 0)
		piece(folder, `Poster{index}`, f, -w / 2, 0, -0.02, w / 2, h, 0.02, pick(POSTER_COLORS), M.SmoothPlastic)
	end
	wallBoard(folder, "NoticeBoard", "X", x0 + 5, x0 + 13, FLOOR + 5, FLOOR + 8.5, z1, -1, CORK, M.Fabric, 5)
	if withShelf then
		shelving(folder, "Bookshelf", frame(x1, FLOOR, cz - 5, 0), 10, 1.5, 7, WOOD_DARK, M.Wood, "books", 0.8)
	end
	papers(folder, "Paper", math.floor(10 + mess * 16), x0 + 2, z0 + 2, x1 - 2, z1 - 2)
	roomLights(folder, r, 9, 0.12)
	ceilingDamage(folder, r, math.floor(1 + mess * 3))
	return folder
end

--- Science lab: slate-topped lab benches with sinks, stools, a fume hood, chemicals and a skeleton.
local function buildScienceLab(sections: Instance): ()
	local r = SCIENCE
	local folder = newSection(sections, r.name, "Science lab: black lab benches with sinks, a fume hood, a shelf of chemicals, spilled liquid and the class skeleton.")
	local cz = (r.z0 + r.z1) / 2
	box(folder, "Floor", r.x0, BASE, r.z0, r.x1, FLOOR, r.z1, tint(VINYL, 0.05), M.CeramicTiles)
	chalkboard(folder, r.x0, cz)
	box(folder, "DemoBench", r.x0 + 3, FLOOR, cz + 2, r.x0 + 6, FLOOR + 3, cz + 9, WOOD_DARK, M.Wood)
	box(folder, "DemoBenchTop", r.x0 + 2.8, FLOOR + 3, cz + 1.8, r.x0 + 6.2, FLOOR + 3.2, cz + 9.2, LAB_TOP, M.Slate)
	for i, x in { r.x0 + 12, r.x0 + 20, r.x0 + 28 } do
		for k, zc in { cz - 6.2, cz + 6.2 } do
			local name = `Bench{i}_{k}`
			box(folder, `{name}Cabinet`, x - 1.4, FLOOR, zc - 5.5, x + 1.4, FLOOR + 2.9, zc + 5.5, tint(WOOD_DARK, 0.08), M.Wood)
			box(folder, `{name}Top`, x - 1.6, FLOOR + 2.9, zc - 5.7, x + 1.6, FLOOR + 3.1, zc + 5.7, LAB_TOP, M.Slate)
			box(folder, `{name}Sink`, x - 0.6, FLOOR + 3.1, zc - 0.8, x + 0.6, FLOOR + 3.14, zc + 0.8, STEEL, M.Metal)
			local tapBase = Vector3.new(x, FLOOR + 3.1, zc + 1.1)
			beam(folder, `{name}TapRiser`, tapBase, tapBase + Vector3.new(0, 1.3, 0), 0.12, 0.12, STEEL, M.Metal)
			beam(folder, `{name}TapSpout`, tapBase + Vector3.new(0, 1.3, 0), tapBase + Vector3.new(0, 1.3, -0.7), 0.12, 0.12, STEEL, M.Metal)
			for g, gz in { zc - 4.5, zc + 4.5 } do
				box(folder, `{name}GasTap{g}`, x - 0.15, FLOOR + 3.1, gz - 0.15, x + 0.15, FLOOR + 3.6, gz + 0.15, GOLD, M.Metal)
			end
			for s, spot in { { -2.4, -2.5 }, { -2.4, 2.5 }, { 2.4, -2.5 }, { 2.4, 2.5 } } do
				if random() < 0.25 then
					stool(folder, `{name}Stool{s}`, frame(x + spot[1], FLOOR + 0.6, zc + spot[2], between(0, 360), 90))
				else
					stool(folder, `{name}Stool{s}`, frame(x + spot[1] + between(-0.2, 0.2), FLOOR, zc + spot[2], between(0, 30)))
				end
			end
			for b = 1, 2 do
				local beaker = box(folder, `{name}Beaker{b}`, x - 0.9 + b * 0.6, FLOOR + 3.1, zc - 3 + b, x - 0.5 + b * 0.6, FLOOR + 3.8, zc - 2.6 + b, GLASS, M.Glass)
				beaker.Transparency = 0.4
			end
		end
	end
	-- Fume hood and chemical shelf on the east wall.
	local hx = r.x1
	box(folder, "HoodCabinet", hx - 2.5, FLOOR, r.z0 + 2, hx, FLOOR + 3, r.z0 + 8, tint(WOOD_DARK, 0.05), M.Wood)
	box(folder, "HoodTop", hx - 2.6, FLOOR + 3, r.z0 + 2, hx, FLOOR + 3.2, r.z0 + 8, LAB_TOP, M.Slate)
	box(folder, "HoodBody", hx - 2.5, FLOOR + 7, r.z0 + 2, hx, FLOOR + 9, r.z0 + 8, STEEL, M.Metal)
	box(folder, "HoodSideA", hx - 2.5, FLOOR + 3.2, r.z0 + 2, hx, FLOOR + 7, r.z0 + 2.2, STEEL, M.Metal)
	box(folder, "HoodSideB", hx - 2.5, FLOOR + 3.2, r.z0 + 7.8, hx, FLOOR + 7, r.z0 + 8, STEEL, M.Metal)
	local sash = box(folder, "HoodSash", hx - 2.5, FLOOR + 5, r.z0 + 2.2, hx - 2.4, FLOOR + 7, r.z0 + 7.8, GLASS, M.Glass)
	sash.Transparency = 0.5
	box(folder, "HoodDuct", hx - 1.6, FLOOR + 9, r.z0 + 4.4, hx - 0.4, CEILING, r.z0 + 5.6, STEEL, M.Metal)
	shelving(folder, "ChemicalShelf", frame(hx, FLOOR, r.z0 + 12, 0), 10, 1.4, 7.5, WOOD_DARK, M.Wood, "bottles", 0.75)
	-- Periodic table on the back wall.
	local layout = { "1................1", "11..........111111", "11..........111111", "111111111111111111", "111111111111111111", "111111111111111111", "111111111111111111" }
	local groupColors = { POSTER_COLORS[1], POSTER_COLORS[3], POSTER_COLORS[2], POSTER_COLORS[4], POSTER_COLORS[5] }
	local cells = 0
	for row, line in layout do
		for column = 1, #line do
			if string.sub(line, column, column) == "1" then
				cells += 1
				local x, y = r.x0 + 6 + column * 0.55, FLOOR + 9.4 - row * 0.6
				box(folder, `Element{cells}`, x, y, r.z0 + 0.1, x + 0.48, y + 0.52, r.z0 + 0.14, groupColors[(column % #groupColors) + 1], M.SmoothPlastic)
			end
		end
	end
	-- The class skeleton on its stand in the corner, staring at the room.
	local s = frame(r.x0 + 3, FLOOR, r.z0 + 3, -35)
	piece(folder, "SkeletonStand", s, -0.8, 0, -0.8, 0.8, 0.2, 0.8, METAL, M.Metal)
	piece(folder, "SkeletonPole", s, 0.44, 0.2, -0.06, 0.56, 7.2, 0.06, METAL, M.Metal)
	piece(folder, "SkeletonSkull", s, -0.45, 6.4, -0.35, 0.15, 7.2, 0.35, BONE, M.SmoothPlastic)
	piece(folder, "SkeletonJaw", s, -0.45, 6.15, -0.28, 0, 6.4, 0.28, BONE, M.SmoothPlastic)
	for index, side in { -1, 1 } do
		piece(folder, `SkeletonEye{index}`, s, -0.47, 6.7, side * 0.25 - 0.08, -0.44, 6.9, side * 0.25 + 0.08, BLACK, M.SmoothPlastic)
	end
	piece(folder, "SkeletonSpine", s, -0.08, 3.4, -0.08, 0.08, 6.15, 0.08, BONE, M.SmoothPlastic)
	for index = 1, 4 do
		local y = 4.4 + index * 0.35
		piece(folder, `SkeletonRib{index}`, s, -0.5, y, -0.55, 0.12, y + 0.1, 0.55, BONE, M.SmoothPlastic)
	end
	piece(folder, "SkeletonPelvis", s, -0.35, 3.2, -0.55, 0.15, 3.6, 0.55, BONE, M.SmoothPlastic)
	for index, side in { -1, 1 } do
		local shoulder, elbow, wrist = pointIn(s, -0.1, 5.9, side * 0.62), pointIn(s, -0.15, 4.5, side * 0.75), pointIn(s, -0.45, 3.3, side * 0.7)
		beam(folder, `SkeletonUpperArm{index}`, shoulder, elbow, 0.12, 0.12, BONE, M.SmoothPlastic)
		beam(folder, `SkeletonForearm{index}`, elbow, wrist, 0.1, 0.1, BONE, M.SmoothPlastic)
		local hip, knee, ankle = pointIn(s, -0.1, 3.2, side * 0.3), pointIn(s, -0.2, 1.75, side * 0.32), pointIn(s, -0.1, 0.35, side * 0.3)
		beam(folder, `SkeletonThigh{index}`, hip, knee, 0.15, 0.15, BONE, M.SmoothPlastic)
		beam(folder, `SkeletonShin{index}`, knee, ankle, 0.12, 0.12, BONE, M.SmoothPlastic)
		piece(folder, `SkeletonFoot{index}`, s, -0.6, 0.2, side * 0.3 - 0.12, 0, 0.35, side * 0.3 + 0.12, BONE, M.SmoothPlastic)
	end
	local spill = box(folder, "Spill", r.x0 + 15, FLOOR, cz - 0.5, r.x0 + 19, FLOOR + 0.03, cz + 2.5, Color3.fromRGB(70, 110, 60), M.Glass)
	spill.Transparency = 0.25
	shards(folder, "BrokenBeaker", r.x0 + 17, cz + 1.5, 6)
	papers(folder, "Paper", 14, r.x0 + 2, r.z0 + 2, r.x1 - 3, r.z1 - 2)
	roomLights(folder, r, 9, 0.12)
	ceilingDamage(folder, r, 4)
end

--- Computer lab: rows of old CRT computers, some smashed or pulled onto the floor.
local function buildComputerLab(sections: Instance): ()
	local r = COMPUTER
	local folder = newSection(sections, r.name, "Computer lab: rows of dusty CRT computers, some smashed or dragged onto the floor, and a dead server rack.")
	local cz = (r.z0 + r.z1) / 2
	box(folder, "Floor", r.x0, BASE, r.z0, r.x1, FLOOR, r.z1, CARPET_BLUE, M.Carpet)
	box(folder, "WhiteboardFrame", r.x0, FLOOR + 3.8, cz - 7.2, r.x0 + 0.3, FLOOR + 9.2, cz + 7.2, STEEL, M.Metal)
	box(folder, "Whiteboard", r.x0 + 0.3, FLOOR + 4, cz - 7, r.x0 + 0.35, FLOOR + 9, cz + 7, WHITE, M.SmoothPlastic)
	for row, z in { cz - 7, cz, cz + 7 } do
		local name = `Row{row}`
		box(folder, `{name}Desk`, r.x0 + 6, FLOOR + 2.5, z - 1.2, r.x0 + 31, FLOOR + 2.65, z + 1.2, tint(BEIGE, 0.05), M.SmoothPlastic)
		box(folder, `{name}Panel`, r.x0 + 6, FLOOR + 0.6, z + 1, r.x0 + 31, FLOOR + 2.5, z + 1.15, METAL, M.Metal)
		for leg, x in { r.x0 + 6.2, r.x0 + 18.5, r.x0 + 30.6 } do
			box(folder, `{name}Leg{leg}`, x, FLOOR, z - 1.1, x + 0.2, FLOOR + 2.5, z + 1, METAL, M.Metal)
		end
		for seat = 1, 6 do
			local x = r.x0 + 4.5 + seat * 4
			local label = `{name}Seat{seat}`
			local roll = random()
			if roll < 0.12 then
				computer(folder, `{label}PC`, frame(x + between(-1, 1), FLOOR + 1, z - 3, between(0, 360), 0, 90), true)
			else
				computer(folder, `{label}PC`, frame(x, FLOOR + 2.65, z + 0.2, -90 + between(-8, 8)), roll < 0.3)
			end
			box(folder, `{label}Tower`, x + 1, FLOOR, z - 0.3, x + 1.7, FLOOR + 2, z + 0.9, tint(BEIGE, 0.06), M.SmoothPlastic)
			looseChair(folder, `{label}Chair`, x, z - 2.3, 90, random() < 0.2)
		end
	end
	box(folder, "ServerRack", r.x1 - 3, FLOOR, r.z0, r.x1, FLOOR + 9, r.z0 + 3, BLACK, M.Metal)
	for index = 1, 6 do
		box(folder, `ServerUnit{index}`, r.x1 - 3.05, FLOOR + index * 1.3, r.z0 + 0.3, r.x1 - 3, FLOOR + index * 1.3 + 0.8, r.z0 + 2.7, METAL, M.Metal)
	end
	papers(folder, "Paper", 12, r.x0 + 2, r.z0 + 2, r.x1 - 4, r.z1 - 2)
	roomLights(folder, r, 9, 0.1)
	ceilingDamage(folder, r, 5)
end


--- Office: ransacked principal's desk, old computer, filing cabinets and a bookcase.
local function buildOffice(sections: Instance): ()
	local r = OFFICE
	local folder = newSection(sections, r.name, "The principal's office, ransacked: papers everywhere, an old computer, a toppled chair and a pulled-out filing drawer.")
	box(folder, "Floor", r.x0, BASE, r.z0, r.x1, FLOOR, r.z1, CARPET, M.Carpet)
	box(folder, "DeskTop", -120, FLOOR + 2.5, 38, -113, FLOOR + 2.65, 42, WOOD_DARK, M.Wood)
	box(folder, "DeskLeft", -120, FLOOR, 38, -118.5, FLOOR + 2.5, 42, WOOD_DARK, M.Wood)
	box(folder, "DeskRight", -114.5, FLOOR, 38, -113, FLOOR + 2.5, 42, WOOD_DARK, M.Wood)
	box(folder, "DeskFront", -118.5, FLOOR + 0.6, 38, -114.5, FLOOR + 2.5, 38.2, WOOD_DARK, M.Wood)
	computer(folder, "PC", frame(-116.5, FLOOR + 2.65, 40.5, -90), false)
	box(folder, "Phone", -119.5, FLOOR + 2.65, 38.6, -118.6, FLOOR + 2.95, 39.4, BLACK, M.SmoothPlastic)
	box(folder, "NamePlate", -117.5, FLOOR + 2.65, 38.2, -115.5, FLOOR + 3, 38.4, GOLD, M.Foil)
	local seat = frame(-115, FLOOR + 1, 44.5, 30, 0, 80)
	piece(folder, "ChairSeat", seat, -1, 1.6, -1, 1, 1.9, 1, BLACK, M.Fabric)
	piece(folder, "ChairBack", seat, 0.8, 1.9, -1, 1.1, 4.2, 1, BLACK, M.Fabric)
	piece(folder, "ChairPole", seat, -0.15, 0.3, -0.15, 0.15, 1.6, 0.15, METAL, M.Metal)
	piece(folder, "ChairFoot", seat, -1.1, 0, -0.15, 1.1, 0.3, 0.15, METAL, M.Metal)
	looseChair(folder, "VisitorChair1", -119, 34.5, 90, false)
	looseChair(folder, "VisitorChair2", -114, 34.5, 90, true)
	for index, z in { 28, 30.5, 33 } do
		local name = `FilingCabinet{index}`
		local x0 = r.x0 + 0.25
		box(folder, name, x0, FLOOR, z, x0 + 2, FLOOR + 5, z + 2, tint(METAL, 0.06), M.Metal)
		for drawer = 1, 3 do
			box(folder, `{name}Line{drawer}`, x0 + 2, FLOOR + drawer * 1.6, z + 0.2, x0 + 2.05, FLOOR + drawer * 1.6 + 0.08, z + 1.8, BLACK, M.SmoothPlastic)
		end
	end
	box(folder, "OpenDrawer", r.x0 + 2.25, FLOOR + 3.3, 30.7, r.x0 + 3.85, FLOOR + 4.6, 32.3, METAL, M.Metal)
	shelving(folder, "Bookcase", frame(r.x1, FLOOR, 30, 0), 10, 1.5, 8, WOOD_DARK, M.Wood, "books", 0.7)
	box(folder, "WaterCooler", r.x1 - 1.8, FLOOR, 46, r.x1 - 0.3, FLOOR + 3.5, 47.5, WHITE, M.SmoothPlastic)
	local bottle = box(folder, "WaterBottle", r.x1 - 1.6, FLOOR + 3.5, 46.2, r.x1 - 0.5, FLOOR + 5, 47.3, Color3.fromRGB(110, 150, 180), M.Glass)
	bottle.Transparency = 0.4
	box(folder, "PlantPot", -124.5, FLOOR, 46, -123, FLOOR + 1.5, 47.5, RUST, M.Concrete)
	beam(folder, "DeadPlant", Vector3.new(-123.75, FLOOR + 1.5, 46.75), Vector3.new(-123.2, FLOOR + 4.5, 46.4), 0.15, 0.15, DEAD_WOOD, M.Wood)
	for index, z in { 30, 37 } do
		box(folder, `Picture{index}`, r.x1 - 0.15, FLOOR + 9, z, r.x1, FLOOR + 11, z + 3, WOOD_DARK, M.Wood)
		box(folder, `Picture{index}Art`, r.x1 - 0.2, FLOOR + 9.2, z + 0.2, r.x1 - 0.15, FLOOR + 10.8, z + 2.8, pick(POSTER_COLORS), M.SmoothPlastic)
	end
	papers(folder, "Paper", 30, r.x0 + 1, r.z0 + 1, r.x1 - 1, r.z1 - 1.5)
	roomLights(folder, r, 10, 0.1)
	ceilingDamage(folder, r, 3)
end

--- Nurse's room: two cots, a torn privacy curtain, a medicine cabinet, scale and eye chart.
local function buildNurse(sections: Instance): ()
	local r = NURSE
	local folder = newSection(sections, r.name, "The nurse's room: stained cots, a torn privacy curtain, an empty medicine cabinet and an eye chart.")
	box(folder, "Floor", r.x0, BASE, r.z0, r.x1, FLOOR, r.z1, WHITE_TILE, M.CeramicTiles)
	for index, z in { 30, 41 } do
		local name = `Cot{index}`
		box(folder, `{name}Frame`, r.x0 + 0.5, FLOOR + 1.6, z, r.x0 + 3.5, FLOOR + 1.9, z + 6.5, METAL, M.Metal)
		box(folder, `{name}Mattress`, r.x0 + 0.6, FLOOR + 1.9, z + 0.1, r.x0 + 3.4, FLOOR + 2.5, z + 6.4, tint(Color3.fromRGB(190, 186, 170), 0.08), M.Fabric)
		box(folder, `{name}Pillow`, r.x0 + 0.9, FLOOR + 2.5, z + 0.3, r.x0 + 3.1, FLOOR + 2.9, z + 1.5, WHITE, M.Fabric)
		for leg, spot in { { 0.6, 0.1 }, { 3.2, 0.1 }, { 0.6, 6.2 }, { 3.2, 6.2 } } do
			box(folder, `{name}Leg{leg}`, r.x0 + spot[1], FLOOR, z + spot[2], r.x0 + spot[1] + 0.2, FLOOR + 1.6, z + spot[2] + 0.2, METAL, M.Metal)
		end
	end
	beam(folder, "CurtainRail", Vector3.new(r.x0 + 5, FLOOR + 9, 27), Vector3.new(r.x0 + 5, FLOOR + 9, 48), 0.1, 0.1, METAL, M.Metal)
	for index = 1, 6 do
		local z = 27.5 + index * 3
		if index ~= 4 then
			local drop = if index == 2 then between(4, 6) else between(7.5, 8.5)
			piece(folder, `Curtain{index}`, frame(r.x0 + 5, FLOOR + 9, z, between(-8, 8)), -0.03, -drop, -1.4, 0.03, 0, 1.4, CURTAIN, M.Fabric)
		end
	end
	box(folder, "MedicineCabinetBack", r.x1 - 0.2, FLOOR + 5, 30, r.x1, FLOOR + 9, 34, WHITE, M.Metal)
	box(folder, "MedicineCabinetBottom", r.x1 - 1.2, FLOOR + 5, 30, r.x1 - 0.2, FLOOR + 5.2, 34, WHITE, M.Metal)
	box(folder, "MedicineCabinetTop", r.x1 - 1.2, FLOOR + 8.8, 30, r.x1 - 0.2, FLOOR + 9, 34, WHITE, M.Metal)
	box(folder, "MedicineCabinetShelf", r.x1 - 1.2, FLOOR + 6.9, 30.2, r.x1 - 0.2, FLOOR + 7, 33.8, WHITE, M.Metal)
	box(folder, "MedicineCabinetSideA", r.x1 - 1.2, FLOOR + 5.2, 30, r.x1 - 0.2, FLOOR + 8.8, 30.2, WHITE, M.Metal)
	box(folder, "MedicineCabinetSideB", r.x1 - 1.2, FLOOR + 5.2, 33.8, r.x1 - 0.2, FLOOR + 8.8, 34, WHITE, M.Metal)
	local cabinetGlass = box(folder, "MedicineCabinetGlass", r.x1 - 1.3, FLOOR + 5.2, 30.2, r.x1 - 1.2, FLOOR + 8.8, 33.8, GLASS, M.Glass)
	cabinetGlass.Transparency = 0.5
	for index = 1, 4 do
		local bottle = box(folder, `Pill{index}`, r.x1 - 0.9, FLOOR + 5.2, 30.5 + index * 0.7, r.x1 - 0.5, FLOOR + 5.9, 30.9 + index * 0.7, Color3.fromRGB(170, 110, 50), M.Glass)
		bottle.Transparency = 0.3
	end
	box(folder, "DeskTop", -91, FLOOR + 2.5, 44, -86, FLOOR + 2.65, 47.5, WOOD, M.Wood)
	box(folder, "DeskSide", -91, FLOOR, 44, -90.6, FLOOR + 2.5, 47.5, WOOD, M.Wood)
	box(folder, "DeskSideB", -86.4, FLOOR, 44, -86, FLOOR + 2.5, 47.5, WOOD, M.Wood)
	looseChair(folder, "DeskChair", -88.5, 42.3, 90, true)
	box(folder, "ScalePlatform", -86, FLOOR, 36, -84.5, FLOOR + 0.3, 37.5, METAL, M.Metal)
	box(folder, "ScalePost", -85.4, FLOOR + 0.3, 37.2, -85.1, FLOOR + 6, 37.5, METAL, M.Metal)
	box(folder, "EyeChart", r.x0, FLOOR + 6, 37.8, r.x0 + 0.05, FLOOR + 9.5, 39.6, WHITE, M.SmoothPlastic)
	for row = 1, 5 do
		local half = 0.75 - row * 0.12
		box(folder, `EyeChartLine{row}`, r.x0 + 0.05, FLOOR + 9.3 - row * 0.6, 38.7 - half, r.x0 + 0.07, FLOOR + 9.5 - row * 0.6, 38.7 + half, BLACK, M.SmoothPlastic)
	end
	papers(folder, "Paper", 8, r.x0 + 1, r.z0 + 1, r.x1 - 1, r.z1 - 1.5)
	roomLights(folder, r, 10, 0.1)
	ceilingDamage(folder, r, 2)
end

--- Lobby: terrazzo floor with the school crest, trophy cases, benches and the broken front doors.
local function buildLobby(sections: Instance): ()
	local r = LOBBY
	local folder = newSection(sections, r.name, "The front lobby: a terrazzo floor with the school crest, dusty trophy cases, a torn welcome banner and the front doors, one ripped off.")
	box(folder, "Floor", r.x0, BASE, r.z0, r.x1, FLOOR, r.z1, TERRAZZO, M.Granite)
	box(folder, "CrestBorder", -67, FLOOR, 34, -59, FLOOR + 0.02, 42, Color3.fromRGB(90, 70, 50), M.Marble)
	box(folder, "Crest", -66.2, FLOOR + 0.02, 34.8, -59.8, FLOOR + 0.03, 41.2, Color3.fromRGB(150, 50, 44), M.Marble)
	piece(folder, "CrestStar", frame(-63, FLOOR + 0.03, 38, 45), -2, 0, -2, 2, 0.01, 2, GOLD, M.Marble)
	for side, x in { r.x0, r.x1 } do
		local dir = if side == 1 then 1 else -1
		local inner = x + dir * 2.5
		local x0, x1 = math.min(x, inner), math.max(x, inner)
		local name = `TrophyCase{side}`
		box(folder, `{name}Base`, x0, FLOOR, 30, x1, FLOOR + 3, 42, WOOD_DARK, M.Wood)
		box(folder, `{name}Top`, x0, FLOOR + 8, 30, x1, FLOOR + 8.3, 42, WOOD_DARK, M.Wood)
		local glassX = x + dir * 2.4
		local front = box(folder, `{name}Front`, math.min(glassX, inner), FLOOR + 3, 30, math.max(glassX, inner), FLOOR + 8, 42, GLASS, M.Glass)
		front.Transparency = if side == 1 then 0.6 else 1
		for index = 1, 4 do
			local z = 30.5 + index * 2.4
			local tx = x + dir * 1.25
			box(folder, `{name}Trophy{index}Base`, tx - 0.5, FLOOR + 3, z - 0.5, tx + 0.5, FLOOR + 3.4, z + 0.5, GOLD, M.Foil)
			box(folder, `{name}Trophy{index}Stem`, tx - 0.15, FLOOR + 3.4, z - 0.15, tx + 0.15, FLOOR + 4.2, z + 0.15, GOLD, M.Foil)
			box(folder, `{name}Trophy{index}Cup`, tx - 0.6, FLOOR + 4.2, z - 0.6, tx + 0.6, FLOOR + 5 + index * 0.3, z + 0.6, GOLD, M.Foil)
		end
		if side == 2 then
			shards(folder, "CaseGlass", x - 4, 36, 10)
		end
	end
	wallBoard(folder, "NoticeBoard", "Z", 43.5, 48.5, FLOOR + 5, FLOOR + 9, r.x0, 1, CORK, M.Fabric, 6)
	for index, x in { -80, -51 } do
		parkBench(folder, `Bench{index}`, x, FLOOR, 45.8)
	end
	-- Front doors: one hangs open on its hinge, the other lies on the floor.
	local left = frame(-67.85, FLOOR, 51, 70)
	piece(folder, "DoorLeft", left, 0, 0, -0.12, 4.7, 10.7, 0.12, tint(DOOR, 0.05), M.Wood)
	piece(folder, "DoorLeftGlass", left, 0.8, 5, -0.14, 3.9, 9.8, 0.14, GLASS, M.Glass).Transparency = 0.5
	piece(folder, "DoorRight", frame(-60.5, FLOOR, 44, 12), -2.4, 0, -5.3, 2.4, 0.25, 5.3, tint(DOOR, 0.05), M.Wood)
	shards(folder, "DoorGlass", -61, 46, 10)
	-- Welcome banner, one end torn down.
	beam(folder, "BannerWireA", Vector3.new(-75, CEILING, 30), Vector3.new(-75, 12.5, 30), 0.05, 0.05, BLACK, M.SmoothPlastic)
	piece(folder, "Banner", frame(-63, 12.5, 30, 0, 0, 22), -12.5, -2, -0.03, 0.5, 0, 0.03, Color3.fromRGB(150, 50, 44), M.Fabric)
	papers(folder, "Paper", 14, r.x0 + 3, r.z0 + 1, r.x1 - 3, r.z1 - 5)
	roomLights(folder, r, 10, 0.15)
	ceilingDamage(folder, r, 4)
end

--- Staff lounge: kitchenette, fridge, vending machine, sofa, table and the staff pigeonholes.
local function buildLounge(sections: Instance): ()
	local r = LOUNGE
	local folder = newSection(sections, r.name, "The staff lounge: a kitchenette with a fridge left open, a sagging sofa, a vending machine and the teachers' pigeonholes.")
	box(folder, "Floor", r.x0, BASE, r.z0, r.x1, FLOOR, r.z1, tint(VINYL, 0.05), M.CeramicTiles)
	local cx = r.x0 + 0.25
	box(folder, "Counter", cx, FLOOR, 32, cx + 2.2, FLOOR + 3, 44, WOOD, M.Wood)
	box(folder, "CounterTop", cx, FLOOR + 3, 32, cx + 2.4, FLOOR + 3.2, 44, BEIGE, M.Granite)
	box(folder, "Sink", cx + 0.5, FLOOR + 3.15, 37, cx + 1.9, FLOOR + 3.22, 39, STEEL, M.Metal)
	box(folder, "Microwave", cx + 0.2, FLOOR + 3.2, 40.5, cx + 1.9, FLOOR + 4.4, 42.8, WHITE, M.SmoothPlastic)
	box(folder, "CoffeeMaker", cx + 0.3, FLOOR + 3.2, 33, cx + 1.4, FLOOR + 4.6, 34, BLACK, M.SmoothPlastic)
	box(folder, "UpperCabinets", cx, FLOOR + 8, 32, cx + 1.4, FLOOR + 11, 44, WOOD, M.Wood)
	box(folder, "Fridge", cx, FLOOR, 44.5, cx + 2.5, FLOOR + 7, 47.5, WHITE, M.SmoothPlastic)
	piece(folder, "FridgeDoor", frame(cx + 2.5, FLOOR + 0.1, 47.5, 110), 0, 0, -0.1, 2.9, 6.8, 0.1, WHITE, M.SmoothPlastic)
	box(folder, "Vending", cx, FLOOR, 26, cx + 3, FLOOR + 7, 29.5, RED, M.Metal)
	local front = box(folder, "VendingGlass", cx + 3, FLOOR + 2.5, 26.3, cx + 3.05, FLOOR + 6.5, 28.3, GLASS, M.Glass)
	front.Transparency = 0.4
	box(folder, "SofaBase", -36, FLOOR, 45.5, -28, FLOOR + 1.8, 48.5, FABRIC_BROWN, M.Fabric)
	box(folder, "SofaBack", -36, FLOOR + 1.8, 47.6, -28, FLOOR + 4.2, 48.5, FABRIC_BROWN, M.Fabric)
	box(folder, "SofaArmA", -36, FLOOR + 1.8, 45.5, -35.2, FLOOR + 3, 47.6, FABRIC_BROWN, M.Fabric)
	box(folder, "SofaArmB", -28.8, FLOOR + 1.8, 45.5, -28, FLOOR + 3, 47.6, FABRIC_BROWN, M.Fabric)
	tableTop(folder, "CoffeeTable", frame(-32, FLOOR, 42.5, 4), 2.5, 1, 1.5, WOOD, M.Wood)
	tableTop(folder, "Table", frame(-31, FLOOR, 34, 0), 2.5, 2.5, 2.6, WOOD, M.Wood)
	looseChair(folder, "Chair1", -31, 30.8, 90, false)
	looseChair(folder, "Chair2", -31, 37.2, -90, true)
	looseChair(folder, "Chair3", -34.2, 34, 0, false)
	looseChair(folder, "Chair4", -27.8, 34, 180, false)
	box(folder, "Mug", -31.5, FLOOR + 2.6, 33.5, -31, FLOOR + 3.1, 34, WHITE, M.SmoothPlastic)
	for row = 1, 3 do
		for column = 1, 4 do
			local z0 = 36 + column * 1.6
			box(folder, `Pigeonhole{row}_{column}`, r.x1 - 1.2, FLOOR + 5 + row * 1.1, z0, r.x1, FLOOR + 5.1 + row * 1.1, z0 + 1.5, WOOD, M.Wood)
		end
	end
	box(folder, "PigeonholeBack", r.x1 - 0.1, FLOOR + 5.5, 37.5, r.x1, FLOOR + 8.6, 43.5, WOOD_DARK, M.Wood)
	papers(folder, "Paper", 10, r.x0 + 3, r.z0 + 1, r.x1 - 1.5, r.z1 - 5)
	roomLights(folder, r, 10, 0.15)
	ceilingDamage(folder, r, 2)
end

--- A toilet room: four stalls along the front wall, sinks and mirrors, urinals for the boys.
local function buildToilet(sections: Instance, r: Room, boys: boolean): ()
	local folder = newSection(sections, r.name, if boys
		then "Boys' toilets: stalls with broken doors, urinals, sinks with cracked mirrors and a flooded floor."
		else "Girls' toilets: stalls with doors hanging off, sinks with cracked mirrors and graffiti.")
	box(folder, "Floor", r.x0, BASE, r.z0, r.x1, FLOOR, r.z1, WHITE_TILE, M.CeramicTiles)
	local back = r.z1 - 0.25
	for stall = 1, 4 do
		local a = r.x0 + 0.5 + (stall - 1) * 3.6
		local name = `Stall{stall}`
		box(folder, `{name}Divider`, a + 3.5, FLOOR + 0.8, back - 5.3, a + 3.6, FLOOR + 7, back, STALL, M.Metal)
		box(folder, `{name}PostA`, a, FLOOR + 0.8, back - 5.4, a + 0.4, FLOOR + 7, back - 5.3, STALL, M.Metal)
		box(folder, `{name}PostB`, a + 3.1, FLOOR + 0.8, back - 5.4, a + 3.5, FLOOR + 7, back - 5.3, STALL, M.Metal)
		local roll = random()
		if roll < 0.3 then
			box(folder, `{name}Door`, a + 0.5, FLOOR, back - 10, a + 3, FLOOR + 0.15, back - 6, STALL, M.Metal) -- fallen off
		else
			local f = frame(a + 0.45, FLOOR + 0.8, back - 5.35, between(-80, -20))
			piece(folder, `{name}Door`, f, 0, 0, -0.05, 2.6, 5.7, 0.05, STALL, M.Metal)
			if roll > 0.75 then
				piece(folder, `{name}Graffiti`, f, 0.4, 2.5, -0.07, 2.2, 3.2, -0.05, pick(PAINT_COLORS), M.SmoothPlastic)
			end
		end
		box(folder, `{name}Bowl`, a + 1.05, FLOOR, back - 2.6, a + 2.45, FLOOR + 1.4, back - 0.5, PORCELAIN, M.SmoothPlastic)
		box(folder, `{name}Tank`, a + 0.95, FLOOR + 1.4, back - 0.8, a + 2.55, FLOOR + 3.2, back, PORCELAIN, M.SmoothPlastic)
	end
	local sx = r.x1 - 0.25
	for index = 1, 3 do
		local z = 29 + index * 3
		local name = `Sink{index}`
		box(folder, name, sx - 1.8, FLOOR + 2.6, z, sx, FLOOR + 3.4, z + 2.2, PORCELAIN, M.SmoothPlastic)
		box(folder, `{name}Stand`, sx - 0.6, FLOOR, z + 0.8, sx, FLOOR + 2.6, z + 1.4, PORCELAIN, M.SmoothPlastic)
		box(folder, `{name}Tap`, sx - 0.5, FLOOR + 3.4, z + 1, sx - 0.1, FLOOR + 3.9, z + 1.2, METAL, M.Metal)
		if index ~= 2 then
			local mirror = box(folder, `{name}Mirror`, sx - 0.1, FLOOR + 4.8, z - 0.2, sx, FLOOR + 8, z + 2.4, Color3.fromRGB(150, 158, 162), M.Glass)
			mirror.Reflectance = 0.35
		end
	end
	shards(folder, "MirrorGlass", sx - 2, 35, 6)
	box(folder, "HandDryer", sx - 0.8, FLOOR + 4, 41.5, sx, FLOOR + 5.2, 42.7, WHITE, M.Metal)
	trashCan(folder, "TrashCan", sx - 1.2, 40, true)
	if boys then
		for index = 1, 3 do
			local z = 30 + index * 2.8
			box(folder, `Urinal{index}`, r.x0 + 0.25, FLOOR + 1.8, z, r.x0 + 1.2, FLOOR + 4, z + 1.4, PORCELAIN, M.SmoothPlastic)
			if index < 3 then
				box(folder, `UrinalScreen{index}`, r.x0 + 0.25, FLOOR + 1.5, z + 1.9, r.x0 + 2, FLOOR + 5.5, z + 2, STALL, M.Metal)
			end
		end
		puddle(folder, "Puddle", r.x0 + 3, 31, r.x0 + 9, 37)
	else
		box(folder, "Bench", r.x0 + 0.25, FLOOR + 1.6, 31, r.x0 + 1.8, FLOOR + 1.9, 37, WOOD, M.Wood)
		box(folder, "BenchLeg", r.x0 + 0.25, FLOOR, 33.8, r.x0 + 1.6, FLOOR + 1.6, 34.2, METAL, M.Metal)
		puddle(folder, "Puddle", r.x0 + 5, 36, r.x0 + 10, 40)
		wallBoard(folder, "Graffiti", "Z", 31, 36, FLOOR + 6, FLOOR + 8, r.x0, 1, Color3.fromRGB(150, 40, 120), M.SmoothPlastic, 0)
	end
	roomLights(folder, r, 10, 0.1)
	ceilingDamage(folder, r, 2)
end

--- A hallway running along x between wall faces z0 (low) and z1 (high): tiled floor with a
--- border, lockers between the doors, exit signs, a toppled locker, puddles and debris.
local function buildHall(sections: Instance, name: string, description: string, z0: number, z1: number, low: { Opening }, high: { Opening }): ()
	local folder = newSection(sections, name, description)
	local x0, x1 = IX0, WING_X0
	box(folder, "Floor", x0, BASE, z0, x1, FLOOR, z1, tint(HALL_TILE, 0.04), M.CeramicTiles)
	box(folder, "BorderLow", x0, FLOOR, z0, x1, FLOOR + 0.02, z0 + 0.8, HALL_BORDER, M.CeramicTiles)
	box(folder, "BorderHigh", x0, FLOOR, z1 - 0.8, x1, FLOOR + 0.02, z1, HALL_BORDER, M.CeramicTiles)
	lineWall(folder, "Low", "X", x0 + 0.5, x1 - 3, z0, 1, low)
	lineWall(folder, "High", "X", x0 + 0.5, x1 - 3, z1, -1, high)
	local cz = (z0 + z1) / 2
	piece(folder, "FallenLocker", frame(between(-110, 60), FLOOR + 1.25, cz + between(-1, 1), between(-25, 25), 0, 90), -1.25, -3.5, -1, 1.25, 3.5, 1, LOCKER, M.CorrodedMetal)
	for index = 1, 2 do
		local px = between(-115, 65)
		puddle(folder, `Puddle{index}`, px, cz - between(1, 3), px + between(4, 8), cz + between(1, 3))
	end
	wetFloorSign(folder, "WetFloorSign", between(-100, 50), cz + between(-2, 2))
	for index = 1, 4 do
		local bx = between(-120, 70)
		beam(folder, `FallenBoard{index}`, Vector3.new(bx, FLOOR + 0.1, z0 + 2.5), Vector3.new(bx + between(-4, 4), FLOOR + 1.5, z1 - 2.5), 0.8, 0.15, tint(WOOD, 0.1), M.WoodPlanks)
	end
	rubble(folder, "Rubble", between(-90, 40), cz, 2, 6)
	papers(folder, "Paper", 30, x0 + 1, z0 + 2.5, x1 - 1, z1 - 2.5)
	local count = 0
	for x = x0 + 6, x1 - 4, 10 do
		count += 1
		ceilingLight(folder, `Light{count}`, x, cz, true, 0.18)
	end
	-- Exit signs at both ends, only one still lit.
	for index, x in { x0 + 2, x1 - 2 } do
		local sign = box(folder, `ExitSign{index}`, x - 0.12, 12.4, cz - 1.3, x + 0.12, 13.3, cz + 1.3, if index == 2 then RED else Color3.fromRGB(70, 30, 30), M.SmoothPlastic)
		if index == 2 then
			glow(sign, RED)
		end
		beam(folder, `ExitSign{index}Rod`, Vector3.new(x, 13.3, cz), Vector3.new(x, CEILING, cz), 0.06, 0.06, METAL, M.Metal)
	end
	ceilingDamage(folder, room(name, x0, x1, z0, z1), 5)
end










--- Gym: wooden floor with court lines, two hoops (one collapsed), bleachers, mats, a climbing
--- rope, banners, and rubble and a puddle under the hole in the roof.
local function buildGym(sections: Instance): ()
	local r = GYM
	local folder = newSection(sections, r.name, "The gym: faded court lines, bleachers, a collapsed basketball hoop, mats and a climbing rope, with rubble and rainwater under a hole in the roof.")
	box(folder, "Floor", r.x0, BASE, r.z0, r.x1, FLOOR, r.z1, GYM_FLOOR, M.WoodPlanks)
	local cx, mid = (r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2
	local lineColor = Color3.fromRGB(214, 208, 190)
	local count = 0
	local function line(x0: number, z0: number, x1: number, z1: number): ()
		count += 1
		box(folder, `CourtLine{count}`, x0, FLOOR, z0, x1, FLOOR + 0.02, z1, lineColor, M.SmoothPlastic)
	end
	local cx0, cx1, cz0, cz1 = cx - 11, cx + 11, r.z0 + 6, r.z1 - 6
	line(cx0, cz0, cx0 + 0.3, cz1)
	line(cx1 - 0.3, cz0, cx1, cz1)
	line(cx0 + 0.3, cz0, cx1 - 0.3, cz0 + 0.3)
	line(cx0 + 0.3, cz1 - 0.3, cx1 - 0.3, cz1)
	line(cx0 + 0.3, mid - 0.15, cx1 - 0.3, mid + 0.15)
	for _, endZ in { cz0 + 0.3, cz1 - 0.3 } do
		local dir = if endZ < mid then 1 else -1
		local keyFar = endZ + dir * 12
		line(cx - 4, math.min(endZ, keyFar), cx - 3.7, math.max(endZ, keyFar))
		line(cx + 3.7, math.min(endZ, keyFar), cx + 4, math.max(endZ, keyFar))
		line(cx - 3.7, math.min(keyFar, keyFar + dir * 0.3), cx + 3.7, math.max(keyFar, keyFar + dir * 0.3))
	end
	-- Pads on the end walls behind the hoops.
	for index = 1, 4 do
		local x = cx - 6 + (index - 1) * 3
		box(folder, `PadBack{index}`, x + 0.05, FLOOR, r.z0 + 0.25, x + 2.95, FLOOR + 6, r.z0 + 0.6, MAT_BLUE, M.Fabric)
		box(folder, `PadFront{index}`, x + 0.05, FLOOR, r.z1 - 0.6, x + 2.95, FLOOR + 6, r.z1 - 0.25, MAT_BLUE, M.Fabric)
	end
	-- Back hoop, still on the wall.
	box(folder, "HoopBackArm", cx - 0.5, FLOOR + 11, r.z0 + 0.25, cx + 0.5, FLOOR + 11.5, r.z0 + 2.5, METAL, M.Metal)
	box(folder, "HoopBackBoard", cx - 3, FLOOR + 9, r.z0 + 2.5, cx + 3, FLOOR + 13, r.z0 + 2.8, WHITE, M.SmoothPlastic)
	box(folder, "HoopBackSquare", cx - 1, FLOOR + 10.3, r.z0 + 2.8, cx + 1, FLOOR + 11.8, r.z0 + 2.82, RIM, M.SmoothPlastic)
	box(folder, "HoopBackRimBack", cx - 0.8, FLOOR + 10, r.z0 + 2.82, cx + 0.8, FLOOR + 10.15, r.z0 + 2.95, RIM, M.Metal)
	box(folder, "HoopBackRimFront", cx - 0.8, FLOOR + 10, r.z0 + 4.4, cx + 0.8, FLOOR + 10.15, r.z0 + 4.55, RIM, M.Metal)
	box(folder, "HoopBackRimLeft", cx - 0.8, FLOOR + 10, r.z0 + 2.95, cx - 0.65, FLOOR + 10.15, r.z0 + 4.4, RIM, M.Metal)
	box(folder, "HoopBackRimRight", cx + 0.65, FLOOR + 10, r.z0 + 2.95, cx + 0.8, FLOOR + 10.15, r.z0 + 4.4, RIM, M.Metal)
	-- Front hoop: the backboard has torn loose and hangs at an angle; the rim lies on the floor.
	box(folder, "HoopFrontArm", cx - 0.5, FLOOR + 11, r.z1 - 2.5, cx + 0.5, FLOOR + 11.5, r.z1 - 0.25, METAL, M.Metal)
	piece(folder, "HoopFrontBoard", frame(cx, FLOOR + 11, r.z1 - 2.8, 0, 25, 12), -3, -4, 0, 3, 0, 0.3, WHITE, M.SmoothPlastic)
	piece(folder, "HoopFrontRim", frame(cx - 2, FLOOR, r.z1 - 9, 30), -0.8, 0, -0.8, 0.8, 0.15, 0.8, RIM, M.Metal)
	-- Bleachers along the east wall.
	for tier = 1, 3 do
		box(folder, `Bleacher{tier}`, r.x1 - 2 * (4 - tier), FLOOR + (tier - 1) * 1.2, mid - 19, r.x1, FLOOR + tier * 1.2, mid + 19, tint(WOOD, 0.04), M.WoodPlanks)
	end
	box(folder, "MatStackLow", r.x0 + 1, FLOOR, r.z1 - 10, r.x0 + 7, FLOOR + 0.8, r.z1 - 4, MAT_BLUE, M.Fabric)
	box(folder, "MatStackHigh", r.x0 + 1, FLOOR + 0.8, r.z1 - 10, r.x0 + 7, FLOOR + 1.6, r.z1 - 4, MAT_RED, M.Fabric)
	piece(folder, "MatLoose", frame(r.x0 + 12, FLOOR, r.z1 - 18, 22), -3, 0, -2.5, 3, 0.8, 2.5, MAT_BLUE, M.Fabric)
	beam(folder, "ClimbingRope", Vector3.new(r.x0 + 8, CEILING - 1.4, -1), Vector3.new(r.x0 + 8.6, FLOOR + 1, -0.6), 0.3, 0.3, BEIGE, M.Fabric)
	box(folder, "Scoreboard", r.x0, FLOOR + 11, HALL_Z0 + 1, r.x0 + 0.4, FLOOR + 14, HALL_Z1 - 1, BLACK, M.SmoothPlastic)
	for index = 1, 4 do
		local z = HALL_Z0 + 0.5 + index * 1.6
		box(folder, `ScoreDigit{index}`, r.x0 + 0.4, FLOOR + 12, z, r.x0 + 0.45, FLOOR + 13.4, z + 1, Color3.fromRGB(90, 20, 20), M.SmoothPlastic)
	end
	for index, z in { 30, 38 } do
		box(folder, `Banner{index}`, r.x0, FLOOR + 9, z, r.x0 + 0.06, FLOOR + 14, z + 4, if index == 1 then MAT_RED else MAT_BLUE, M.Fabric)
	end
	-- Under the hole: rubble, a fallen truss, moss and a puddle of rainwater.
	local hole = HOLES[2]
	local hx, hz = (hole[1] + hole[2]) / 2, (hole[3] + hole[4]) / 2
	rubble(folder, "Rubble", hx, hz, 4, 22)
	puddle(folder, "Puddle", hx - 5, hz - 4, hx + 4, hz + 5)
	beam(folder, "FallenTruss", Vector3.new(hx - 6, FLOOR + 0.7, hz + 1), Vector3.new(hx + 5, FLOOR + 4, hz - 3), 0.6, 1.4, METAL, M.Metal)
	weeds(folder, "Moss", 10, hx - 4, hz - 4, hx + 4, hz + 4, FLOOR)
	highBays(folder, { cx - 12, cx + 12 }, { r.z0 + 12, r.z0 + 36, r.z0 + 60 }, 0.25)
	hangingLight(folder, "LooseLight", cx - 8, r.z0 + 50)
end

--- Cafeteria: a serving counter, four long tables with benches, vending machines and trash.
local function buildCafeteria(sections: Instance): ()
	local r = CAFETERIA
	local folder = newSection(sections, r.name, "A small cafeteria behind the gym: a serving counter, long tables with benches, dead vending machines and trays left behind.")
	box(folder, "Floor", r.x0, BASE, r.z0, r.x1, FLOOR, r.z1, tint(VINYL, 0.04), M.CeramicTiles)
	local cx = (r.x0 + r.x1) / 2
	local sx = r.x1 - 0.25
	box(folder, "Counter", sx - 3.5, FLOOR, r.z0 + 3, sx, FLOOR + 3.4, r.z0 + 15, STEEL, M.Metal)
	box(folder, "CounterTop", sx - 3.7, FLOOR + 3.4, r.z0 + 3, sx, FLOOR + 3.6, r.z0 + 15, STEEL, M.Metal)
	local guard = box(folder, "SneezeGuard", sx - 1.7, FLOOR + 5, r.z0 + 3.5, sx - 1.6, FLOOR + 6.4, r.z0 + 14.5, GLASS, M.Glass)
	guard.Transparency = 0.6
	box(folder, "MenuBoard", sx - 0.15, FLOOR + 8, r.z0 + 4, sx, FLOOR + 11, r.z0 + 12, BLACK, M.Slate)
	local count = 0
	for _, x in { cx - 9, cx + 7 } do
		for _, z in { r.z0 + 7, r.z0 + 18 } do
			count += 1
			local name = `Table{count}`
			local f = frame(x, FLOOR, z, if random() < 0.25 then between(-10, 10) else 0)
			piece(folder, `{name}Top`, f, -6, 2.5, -1.5, 6, 2.7, 1.5, tint(WOOD, 0.08), M.Wood)
			for leg, lx in { -5, 5 } do
				piece(folder, `{name}Leg{leg}`, f, lx - 0.3, 0, -1.2, lx + 0.3, 2.5, 1.2, METAL, M.Metal)
			end
			for bench, offset in { -2.8, 2.8 } do
				if random() < 0.15 then
					piece(folder, `{name}Bench{bench}`, frame(x, FLOOR + 0.4, z + offset * 1.25, between(-6, 6), 90), -5.5, -0.4, -0.4, 5.5, 0.4, 0.4, tint(WOOD, 0.08), M.Wood)
				else
					piece(folder, `{name}Bench{bench}Seat`, f, -5.5, 1.5, offset - 0.4, 5.5, 1.65, offset + 0.4, tint(WOOD, 0.08), M.Wood)
					for leg, lx in { -4.5, 4.5 } do
						piece(folder, `{name}Bench{bench}Leg{leg}`, f, lx - 0.2, 0, offset - 0.3, lx + 0.2, 1.5, offset + 0.3, METAL, M.Metal)
					end
				end
			end
			for tray = 1, 2 do
				local tf = child(f, between(-4.5, 4.5), 2.7, between(-0.6, 0.6), between(-20, 20))
				piece(folder, `{name}Tray{tray}`, tf, -0.8, 0, -0.6, 0.8, 0.08, 0.6, Color3.fromRGB(150, 120, 90), M.SmoothPlastic)
			end
		end
	end
	for index = 1, 2 do
		local z = r.z0 + 2 + (index - 1) * 4
		box(folder, `Vending{index}`, r.x0 + 0.25, FLOOR, z, r.x0 + 3.25, FLOOR + 7.5, z + 3.5, if index == 2 then Color3.fromRGB(40, 70, 130) else RED, M.Metal)
		local glass = box(folder, `Vending{index}Glass`, r.x0 + 3.25, FLOOR + 2.5, z + 0.3, r.x0 + 3.3, FLOOR + 7, z + 2.4, GLASS, M.Glass)
		glass.Transparency = if index == 2 then 1 else 0.4
	end
	shards(folder, "VendingGlass", r.x0 + 5, r.z0 + 8, 6)
	trashCan(folder, "TrashCan", cx, r.z1 - 3, true)
	papers(folder, "Napkin", 14, r.x0 + 5, r.z0 + 2, r.x1 - 5, r.z1 - 2)
	highBays(folder, { cx - 10, cx + 10 }, { r.z0 + 9, r.z0 + 17 }, 0.2)
end

-- Outside ------------------------------------------------------------------------------------

--- Ground: the overgrown lot.
local function buildGround(model: Instance): ()
	local folder = Instance.new("Folder")
	folder.Name = "Floor"
	folder.Parent = model
	box(folder, "Ground", LOT_MIN_X, -4, LOT_MIN_Z, LOT_MAX_X, 0, LOT_MAX_Z, GRASS, M.Grass)
end

--- The brick lot wall, sealed all the way round: no gate and no gaps. Behind the school it runs
--- right against the building; along the front yard it has pillars and ivy.
local function buildLotWalls(model: Instance): ()
	local folder = Instance.new("Folder")
	folder.Name = "Walls"
	folder.Parent = model
	local inner = LOT_WALL
	-- Back and the back part of the sides, against the school (caps hang over the outside only).
	box(folder, "WallBack", LOT_MIN_X, 0, LOT_MIN_Z, LOT_MAX_X, 6, LOT_MIN_Z + inner, BRICK, M.Brick)
	box(folder, "WallBackCap", LOT_MIN_X - 0.25, 6, LOT_MIN_Z - 0.25, LOT_MAX_X + 0.25, 6.4, LOT_MIN_Z + inner, CONCRETE, M.Concrete)
	box(folder, "WallWestBack", LOT_MIN_X, 0, LOT_MIN_Z + inner, LOT_MIN_X + inner, 6, BZ1, BRICK, M.Brick)
	box(folder, "WallWestBackCap", LOT_MIN_X - 0.25, 6, LOT_MIN_Z + inner, LOT_MIN_X + inner, 6.4, BZ1, CONCRETE, M.Concrete)
	box(folder, "WallEastBack", LOT_MAX_X - inner, 0, LOT_MIN_Z + inner, LOT_MAX_X, 6, BZ1, BRICK, M.Brick)
	box(folder, "WallEastBackCap", LOT_MAX_X - inner, 6, LOT_MIN_Z + inner, LOT_MAX_X + 0.25, 6.4, BZ1, CONCRETE, M.Concrete)

	local half = inner / 2
	local pillars, segments = 0, 0
	local function pillar(x: number, z: number): ()
		pillars += 1
		box(folder, `Pillar{pillars}`, x - 1.25, 0, z - 1.25, x + 1.25, 7.5, z + 1.25, BRICK_DARK, M.Brick)
		box(folder, `Pillar{pillars}Cap`, x - 1.5, 7.5, z - 1.5, x + 1.5, 8, z + 1.5, CONCRETE, M.Concrete)
	end
	local function segment(axis: "X" | "Z", line: number, from: number, to: number): ()
		segments += 1
		wallBox(folder, `Wall{segments}`, axis, from, to, 0, 6, line - half, line + half, BRICK, M.Brick)
		wallBox(folder, `Wall{segments}Cap`, axis, from, to, 6, 6.4, line - 1, line + 1, CONCRETE, M.Concrete)
	end
	local south, west, east = LOT_MAX_Z - half, LOT_MIN_X + half, LOT_MAX_X - half
	local southX = { west, -105, -80, -55, -30, -5, 20, 45, east }
	for index, x in southX do
		pillar(x, south)
		local nextX = southX[index + 1]
		if nextX then
			segment("X", south, x + 1.25, nextX - 1.25)
		end
	end
	for _, x in { west, east } do
		local zs = { BZ1, 68, south }
		for index, z in zs do
			if index > 1 and index < #zs then
				pillar(x, z)
			end
			local nextZ = zs[index + 1]
			if nextZ then
				segment("Z", x, if index == 1 then z else z + 1.25, nextZ - 1.25)
			end
		end
	end
end

--- Front of the school: canopy, rusty "OLD SCHOOL" letters (one has slipped), flag and ivy.
local function buildEntrance(sections: Instance): ()
	local folder = newSection(sections, "Entrance", "The school's front: rusty OLD SCHOOL letters with one slipped, a stained concrete canopy, a torn flag and ivy climbing the brick.")
	box(folder, "Landing", -74, 0, BZ1, -52, BASE, BZ1 + 5, CONCRETE, M.Concrete)
	box(folder, "Canopy", -74, 12, BZ1, -52, 12.5, BZ1 + 8, CONCRETE, M.Concrete)
	box(folder, "CanopyEdge", -74, 11.6, BZ1 + 7.6, -52, 12, BZ1 + 8, CONCRETE_DARK, M.Concrete)
	box(folder, "CanopyPostWest", -74, BASE, BZ1 + 6.8, -73.2, 11.6, BZ1 + 7.6, CONCRETE, M.Concrete)
	box(folder, "CanopyPostEast", -52.8, BASE, BZ1 + 6.8, -52, 11.6, BZ1 + 7.6, CONCRETE, M.Concrete)
	box(folder, "SignBoard", -76, 13, BZ1, -50, 16.6, BZ1 + 0.4, CONCRETE, M.Concrete)
	local text = "OLD SCHOOL"
	local unit = 0.6
	local x = -74.6
	for index = 1, #text do
		local letter = string.sub(text, index, index)
		local strokes = LETTERS[letter]
		if strokes then
			-- The last letter has slipped off its fixings and hangs crooked.
			local f = if index == #text then frame(x + 0.9, 13.3, BZ1 + 0.4, 0, 0, -28) else frame(x + 0.9, 13.3, BZ1 + 0.4, 0)
			for stroke, s in strokes do
				piece(folder, `Letter{index}Stroke{stroke}`, f, s[1] * unit - 0.9, s[2] * unit, 0, s[3] * unit - 0.9, s[4] * unit, 0.3, RUST, M.CorrodedMetal)
			end
			x += 2.5
		else
			x += 1.4
		end
	end
	box(folder, "FlagBase", -50, 0, 62, -46, 0.6, 66, CONCRETE, M.Concrete)
	box(folder, "FlagPole", -48.25, 0.6, 63.75, -47.75, 34, 64.25, METAL, M.Metal)
	box(folder, "FlagTop", -47.75, 21, 63.95, -43, 23.2, 64.05, FLAG, M.Fabric)
	box(folder, "FlagTorn", -47.75, 23.2, 63.95, -45, 24, 64.05, FLAG, M.Fabric)
	ivy(folder, "IvyWest", "X", BZ1, 1, BX0 + 1, BX0 + 9, 13, BASE)
	ivy(folder, "IvyMiddle", "X", BZ1, 1, -83, -76, 10, BASE)
	ivy(folder, "IvyCenter", "X", BZ1, 1, 8, 13, 12, BASE)
	ivy(folder, "IvyEast", "X", BZ1, 1, BX1 - 10, BX1 - 1, 14, BASE)
	for index, spot in { { -100, 54.5 }, { -86, 54 }, { -40, 54 }, { -20, 54 }, { 4, 54 }, { 60, 54 } } do
		local size = between(2.5, 4)
		piece(folder, `Bush{index}`, frame(spot[1], 0, spot[2], between(0, 40)), -size / 2, 0, -size / 2, size / 2, size * 0.8, size / 2, tint(LEAVES, 0.12), M.LeafyGrass)
	end
end

--- Front yard beside the walkway: cracked asphalt with old games painted on it, a basketball
--- hoop, a dumpster, a lamp and a dead tree.
local function buildSchoolyard(sections: Instance): ()
	local folder = newSection(sections, "Schoolyard", "The narrow front yard: a cracked walkway, weedy asphalt with faded games, a dumpster and a dead tree, sealed in by the lot wall.")
	box(folder, "Walkway", -68, 0, BZ1 + 5, -58, BASE, LOT_MAX_Z - 4, CONCRETE, M.Concrete)
	for index = 1, 3 do
		crack(folder, `WalkCrack{index}`, between(-66, -60), between(60, LOT_MAX_Z - 8), BASE, between(3, 5))
	end
	weeds(folder, "WalkWeed", 6, -68, 58, -58, LOT_MAX_Z - 5, BASE)
	local ax0, ax1, az0, az1 = -124, -76, 61, LOT_MAX_Z - 4
	box(folder, "Asphalt", ax0, 0, az0, ax1, 0.15, az1, ASPHALT, M.Asphalt)
	for index = 1, 6 do
		crack(folder, `Crack{index}`, between(ax0 + 4, ax1 - 4), between(az0 + 3, az1 - 3), 0.15, between(5, 10))
	end
	local paintColor = Color3.fromRGB(176, 172, 150)
	for index, spot in { { -90, 64 }, { -90, 67.6 }, { -86.4, 67.6 }, { -90, 71.2 } } do
		box(folder, `Hopscotch{index}`, spot[1], 0.15, spot[2], spot[1] + 3.4, 0.17, spot[2] + 3.4, paintColor, M.SmoothPlastic)
	end
	box(folder, "FourSquareA", -120, 0.15, 63, -106, 0.17, 63.3, paintColor, M.SmoothPlastic)
	box(folder, "FourSquareB", -120, 0.15, 70, -106, 0.17, 70.3, paintColor, M.SmoothPlastic)
	box(folder, "FourSquareC", -113.15, 0.15, 63, -112.85, 0.17, 77, paintColor, M.SmoothPlastic)
	box(folder, "FourSquareD", -120, 0.15, 77, -106, 0.17, 77.3, paintColor, M.SmoothPlastic)
	box(folder, "HoopPost", -97.3, 0, 79.2, -96.7, 12, 79.8, RUST, M.CorrodedMetal)
	box(folder, "HoopBoard", -100, 9, 78.8, -94, 13, 79.1, WHITE, M.SmoothPlastic)
	box(folder, "HoopRim", -97.8, 10, 77.2, -96.2, 10.15, 78.8, RIM, M.Metal)
	weeds(folder, "Weed", 16, ax0, az0, ax1, az1, 0.15)
	box(folder, "Dumpster", -124, 0, BZ1 + 1, -114, 5, BZ1 + 7, DUMPSTER, M.CorrodedMetal)
	piece(folder, "DumpsterLid", frame(-119, 5, BZ1 + 1, 0, -40), -5, 0, 0, 5, 0.2, 6.2, DUMPSTER, M.CorrodedMetal)
	for index = 1, 3 do
		local f = frame(between(-112, -107), 0.9, between(BZ1 + 2, BZ1 + 6), between(0, 360), between(-15, 15))
		piece(folder, `TrashBag{index}`, f, -1, -0.9, -0.9, 1, 0.9, 0.9, BLACK, M.Plastic)
	end
	parkBench(folder, "Bench", -56, 0, 77)
	for index, spot in { { -71, 64 }, { -55, 72 } } do
		local lx, lz = spot[1], spot[2]
		box(folder, `Lamp{index}Pole`, lx - 0.25, 0, lz - 0.25, lx + 0.25, 13.4, lz + 0.25, METAL, M.Metal)
		box(folder, `Lamp{index}Hood`, lx - 1, 13.4, lz - 1, lx + 1, 14, lz + 1, METAL, M.Metal)
		local bulb = box(folder, `Lamp{index}Bulb`, lx - 0.5, 13.2, lz - 0.5, lx + 0.5, 13.4, lz + 0.5, if index == 2 then LAMP_ON else TUBE_OFF, M.SmoothPlastic)
		if index == 2 then
			glow(bulb, LAMP_ON, 30, 1)
		end
	end
	deadTree(folder, "Tree1", 55, 70, between(15, 18))
	weeds(folder, "LawnWeed", 14, 42, 55, BX1 - 1, LOT_MAX_Z - 3, 0)
	ivy(folder, "IvyLotWall", "X", LOT_MAX_Z - LOT_WALL, -1, -124, -104, 5, 0)
end

--- A small football pitch in the front yard: patchy striped turf, faded lines, rusty goals with
--- torn nets and corner flags.
local function buildFootballField(sections: Instance): ()
	local folder = newSection(sections, "FootballField", "A small, overgrown football pitch in the front yard: faded lines, rusty goals with torn nets and a fallen corner flag.")
	local x0, x1, z0, z1 = PITCH_X0, PITCH_X1, PITCH_Z0, PITCH_Z1
	local cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
	local top = 0.05
	local stripes = 6
	local width = (x1 - x0 + 8) / stripes
	for index = 0, stripes - 1 do
		local a = x0 - 4 + index * width
		box(folder, `Turf{index + 1}`, a, 0, z0 - 2.5, a + width, top, z1 + 2, tint(if index % 2 == 0 then TURF else TURF_DARK, 0.03), M.Grass)
	end
	for index, spot in { { x0 + 2.5, cz, 2.5, 4 }, { x1 - 2.5, cz, 2.5, 4 }, { cx, cz, 2.5, 2.5 } } do
		box(folder, `BarePatch{index}`, spot[1] - spot[3], top, spot[2] - spot[4], spot[1] + spot[3], top + 0.008, spot[2] + spot[4], tint(DIRT, 0.06), M.Ground)
	end
	-- Faded lines, worn away in places.
	local lineColor = Color3.fromRGB(206, 204, 188)
	local y0, y1 = top + 0.01, top + 0.03
	local lines = 0
	local function line(xa: number, za: number, xb: number, zb: number): ()
		local alongX = math.abs(xb - xa) > math.abs(zb - za)
		local from = if alongX then math.min(xa, xb) else math.min(za, zb)
		local to = if alongX then math.max(xa, xb) else math.max(za, zb)
		local fixed = if alongX then za else xa
		local cursor = from
		while cursor < to - 0.01 do
			local stop = math.min(to, cursor + between(3, 6))
			if random() > 0.12 then
				lines += 1
				if alongX then
					box(folder, `Line{lines}`, cursor, y0, fixed - 0.2, stop, y1, fixed + 0.2, lineColor, M.SmoothPlastic)
				else
					box(folder, `Line{lines}`, fixed - 0.2, y0, cursor, fixed + 0.2, y1, stop, lineColor, M.SmoothPlastic)
				end
			end
			cursor = stop
		end
	end
	line(x0, z0, x1, z0)
	line(x0, z1, x1, z1)
	line(x0, z0, x0, z1)
	line(x1, z0, x1, z1)
	line(cx, z0, cx, z1)
	for _, gx in { x0, x1 } do
		local dir = if gx == x0 then 1 else -1
		local depth, half = 10, 8
		line(gx, cz - half, gx + dir * depth, cz - half)
		line(gx, cz + half, gx + dir * depth, cz + half)
		line(gx + dir * depth, cz - half, gx + dir * depth, cz + half)
		local spot = gx + dir * 7
		box(folder, `PenaltySpot{dir}`, spot - 0.35, y0, cz - 0.35, spot + 0.35, y1, cz + 0.35, lineColor, M.SmoothPlastic)
	end
	box(folder, "CentreSpot", cx - 0.35, y0, cz - 0.35, cx + 0.35, y1, cz + 0.35, lineColor, M.SmoothPlastic)
	local segments = 16
	for index = 0, segments - 1 do
		local a0, a1 = index / segments * math.pi * 2, (index + 1) / segments * math.pi * 2
		beam(folder, `CentreCircle{index + 1}`, Vector3.new(cx + math.cos(a0) * 5, y0 + 0.01, cz + math.sin(a0) * 5), Vector3.new(cx + math.cos(a1) * 5, y0 + 0.01, cz + math.sin(a1) * 5), 0.35, 0.02, lineColor, M.SmoothPlastic)
	end
	weeds(folder, "Weed", 16, x0 - 2, z0 - 2, x1 + 2, z1 + 1.5, top)

	-- Goals: posts and crossbar on the goal line, a frame and net behind (local -x).
	local post = Color3.fromRGB(196, 194, 184)
	local function goal(name: string, f: Frame, torn: boolean): ()
		piece(folder, `{name}PostA`, f, -0.2, 0, -5.2, 0.2, 6, -4.8, post, M.Metal)
		piece(folder, `{name}PostB`, f, -0.2, 0, 4.8, 0.2, 6, 5.2, post, M.Metal)
		piece(folder, `{name}Crossbar`, f, -0.2, 6, -5.2, 0.2, 6.4, 5.2, post, M.Metal)
		piece(folder, `{name}BackBar`, f, -3.2, 0, -5.2, -2.8, 0.3, 5.2, RUST, M.CorrodedMetal)
		for side, z in { -5, 5 } do
			beam(folder, `{name}Stay{side}`, pointIn(f, -0.2, 6.2, z), pointIn(f, -3, 0.3, z), 0.2, 0.2, RUST, M.CorrodedMetal)
		end
		local back = beam(folder, `{name}Net`, pointIn(f, -0.25, 6.1, 0), pointIn(f, -3, 0.3, 0), 9.8, 0.05, WHITE, M.Fabric)
		back.Transparency = if torn then 0.85 else 0.65
		back.CastShadow = false
	end
	goal("WestGoal", frame(x0, top, cz, 0), false)
	goal("EastGoal", frame(x1, top, cz, 180), true)

	-- Corner flags, one snapped and lying in the grass.
	for index, corner in { { x0, z0 }, { x1, z0 }, { x0, z1 }, { x1, z1 } } do
		local base = Vector3.new(corner[1], top, corner[2])
		if index == 4 then
			beam(folder, `CornerFlag{index}Pole`, base + Vector3.new(-0.3, 0.06, -0.3), base + Vector3.new(-3.2, 0.06, -1.6), 0.12, 0.12, YELLOW, M.Plastic)
		else
			beam(folder, `CornerFlag{index}Pole`, base, base + Vector3.new(0, 4, 0), 0.12, 0.12, YELLOW, M.Plastic)
			box(folder, `CornerFlag{index}Flag`, corner[1] + 0.06, top + 3.2, corner[2] - 0.03, corner[1] + 1.1, top + 3.9, corner[2] + 0.03, RED, M.Fabric)
		end
	end
end


--- Spawn point on the walkway, just inside the front lot wall.
local function buildSpawn(model: Instance): ()
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "SpawnLocation"
	spawn.Size = Vector3.new(6, 1, 6)
	spawn.CFrame = CFrame.new(-63, BASE + 0.5, LOT_MAX_Z - 8)
	spawn.Neutral = true
	style(spawn, CONCRETE_DARK, M.Concrete)
	spawn.Parent = model
end

-- Lighting and setup -----------------------------------------------------------------------

--- Copies lighting settings from a RealisticLighting script (attributes and child effects) into Lighting.
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

--- Adds the gloomy lighting as a Script inside the map (so it travels with the model) and applies it now.
local function buildLighting(model: Model): ()
	local controller = Instance.new("Script")
	controller.Name = "RealisticLighting"
	for name, value in LIGHTING_PROPERTIES do
		controller:SetAttribute(name, value)
	end
	local atmosphere = Instance.new("Atmosphere")
	atmosphere.Density = 0.42
	atmosphere.Offset = 0.1
	atmosphere.Color = Color3.fromRGB(160, 162, 168)
	atmosphere.Decay = Color3.fromRGB(95, 98, 105)
	atmosphere.Glare = 0
	atmosphere.Haze = 2.6
	atmosphere.Parent = controller
	local grading = Instance.new("ColorCorrectionEffect")
	grading.Brightness = -0.03
	grading.Contrast = 0.15
	grading.Saturation = -0.35
	grading.TintColor = Color3.fromRGB(225, 232, 240)
	grading.Parent = controller
	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.4
	bloom.Size = 20
	bloom.Threshold = 1.8
	bloom.Parent = controller
	local rays = Instance.new("SunRaysEffect")
	rays.Intensity = 0.04
	rays.Spread = 0.6
	rays.Parent = controller
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
	end
	local templateSpawn = Workspace:FindFirstChild("SpawnLocation")
	if templateSpawn and templateSpawn:IsA("SpawnLocation") then
		templateSpawn:Destroy()
	end
end

--- Respawns players who already have a character, so nobody is left floating.
local function respawnExistingCharacters(): ()
	if not (RunService:IsRunning() and RunService:IsServer()) then
		return
	end
	for _, player in Players:GetPlayers() do
		if player.Character then
			task.spawn(function(): ()
				local ok, err = pcall(player.LoadCharacterAsync, player)
				if not ok then
					warn(`[OldSchoolBuilder] Could not respawn {player.Name}: {err}`)
				end
			end)
		end
	end
end

-- // PUBLIC FUNCTIONS

--- Builds (or rebuilds) Old School in Workspace.
--- @return Model -- The map model
local function buildMap(): Model
	randomState = SEED
	workingLights = 0
	hallOpenings = {}
	local existing = Workspace:FindFirstChild(MODEL_NAME)
	if existing and existing:IsA("Model") then
		existing:Destroy()
	end
	if REMOVE_TEMPLATE_PARTS then
		removeTemplateParts()
	end

	local model = Instance.new("Model")
	model.Name = MODEL_NAME
	buildGround(model)
	buildLotWalls(model)
	buildShell(model)
	buildRoof(model)
	buildSpawn(model)

	local sections = Instance.new("Folder")
	sections.Name = "Sections"
	sections.Parent = model
	buildSchoolyard(sections)
	buildEntrance(sections)
	buildFootballField(sections)
	buildLobby(sections)
	buildOffice(sections)
	buildNurse(sections)
	buildLounge(sections)
	buildToilet(sections, BOYS, true)
	buildToilet(sections, GIRLS, false)
	buildHall(sections, "FrontHallway", "The front hallway behind the lobby, lined with rusty lockers, puddles from the leaking roof and one exit sign still glowing.", HALL_Z0, HALL_Z1, hallOpenings.FrontLow, hallOpenings.FrontHigh)
	local descriptions = {
		"Classroom A: desks still in rows and the last lesson left on the chalkboard.",
		"Classroom B: desks knocked over below a smashed window.",
		"Classroom C: the roof has caved in, with rubble, moss and overturned desks below the hole.",
		"Classroom D: scattered chairs, a bookshelf and torn posters.",
		"Classroom E: the corner room by the gym, chairs piled over and papers everywhere.",
	}
	local messes = { 0.25, 0.6, 0.9, 0.5, 0.7 }
	for index, r in ROW1_ROOMS do
		local folder = buildClassroom(sections, r, descriptions[index], messes[index], index % 2 == 0)
		if r.name == "ClassroomC" then
			local hole = HOLES[1]
			local hx, hz = (hole[1] + hole[2]) / 2, (hole[3] + hole[4]) / 2
			rubble(folder, "Rubble", hx, hz, 3.5, 20)
			puddle(folder, "Puddle", hx - 4, hz - 3, hx + 3, hz + 4)
			weeds(folder, "Moss", 8, hx - 3, hz - 3, hx + 3, hz + 3, FLOOR)
			hangingLight(folder, "LooseLight", hole[2] + 4, hz)
		end
	end
	buildHall(sections, "BackHallway", "The back hallway between the classrooms and the labs, dim and cluttered with fallen ceiling tiles.", MID_HALL_Z0, MID_HALL_Z1, hallOpenings.MidLow, hallOpenings.MidHigh)
	buildClassroom(sections, ROW2_ROOMS[1], "Classroom F: a quiet room under a thick layer of dust.", 0.35, true)
	buildScienceLab(sections)
	buildComputerLab(sections)
	buildClassroom(sections, ROW2_ROOMS[4], "Classroom G: the big back classroom, its chairs scattered as if everyone ran out at once.", 0.75, false)
	buildGym(sections)
	buildCafeteria(sections)
	if APPLY_LIGHTING then
		buildLighting(model)
	end

	local partCount = 0
	for _, descendant in model:GetDescendants() do
		if descendant:IsA("BasePart") then
			partCount += 1
		end
	end
	-- Centre the lot on the origin.
	local offset = Vector3.new(-(LOT_MIN_X + LOT_MAX_X) / 2, 0, -(LOT_MIN_Z + LOT_MAX_Z) / 2)
	for _, descendant in model:GetDescendants() do
		if descendant:IsA("BasePart") then
			descendant.CFrame += offset
		end
	end
	model.WorldPivot = CFrame.new(0, 0, 0)
	model.Parent = Workspace
	print(`[OldSchoolBuilder] Built {MODEL_NAME}: {#sections:GetChildren()} areas, {partCount} parts`)
	return model
end

-- // CONNECTIONS
-- None: the map is static once built.

-- // INIT
buildMap()
respawnExistingCharacters()
