--!strict
--[[
	OldSchoolBuilder
	Builds "Old School": a realistic, abandoned one-floor school on its own walled lot. A brick
	building with a hallway of lockers, four classrooms, an office, lobby, toilets, cafeteria and
	gym, plus a cracked schoolyard, a rusty playground and a back lot. Everything is ordinary
	anchored parts with realistic Roblox materials, sized for normal Roblox characters (doors
	8 studs tall, ceilings 16). A RealisticLighting script inside the model sets a gloomy, foggy
	dusk every time the game starts.

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

-- A rectangular gap in a wall: `from`/`to` along the wall, `bottom`/`top` above the foundation.
type Opening = {
	from: number,
	to: number,
	bottom: number,
	top: number,
	glass: boolean?, -- true: window pane, false: broken window, nil: doorway
}

-- // CONSTANTS
local MODEL_NAME = "OldSchool"
local REMOVE_TEMPLATE_PARTS = true
local SEED = 1987

local M = Enum.Material
local LOT_MIN_X, LOT_MAX_X, LOT_MIN_Z, LOT_MAX_Z = -130, 130, -100, 100
local BASE = 0.2 -- top of the building's concrete foundation
local FLOOR = 0.3 -- top of the room floors; furniture stands here
local CEILING = 16 -- top of every wall, underside of the ceiling

-- Weathered, realistic colours.
local BRICK = Color3.fromRGB(128, 62, 45)
local BRICK_DARK = Color3.fromRGB(96, 50, 40)
local CONCRETE = Color3.fromRGB(150, 148, 140)
local CONCRETE_DARK = Color3.fromRGB(112, 110, 104)
local PLASTER = Color3.fromRGB(196, 188, 166)
local CEILING_COLOR = Color3.fromRGB(176, 170, 155)
local ROOF_COLOR = Color3.fromRGB(58, 58, 60)
local WOOD_FLOOR = Color3.fromRGB(126, 90, 58)
local GYM_FLOOR = Color3.fromRGB(170, 126, 80)
local WOOD = Color3.fromRGB(140, 102, 66)
local WOOD_DARK = Color3.fromRGB(82, 56, 38)
local HALL_TILE = Color3.fromRGB(150, 140, 120)
local WHITE_TILE = Color3.fromRGB(205, 205, 198)
local CARPET = Color3.fromRGB(88, 70, 64)
local METAL = Color3.fromRGB(122, 126, 130)
local RUST = Color3.fromRGB(122, 70, 40)
local LOCKER = Color3.fromRGB(78, 104, 92)
local CHALKBOARD = Color3.fromRGB(38, 56, 44)
local CHALK = Color3.fromRGB(222, 222, 214)
local GRASS = Color3.fromRGB(92, 102, 58)
local DIRT = Color3.fromRGB(104, 84, 62)
local SAND = Color3.fromRGB(178, 160, 120)
local ASPHALT = Color3.fromRGB(58, 58, 60)
local CRACK = Color3.fromRGB(30, 30, 30)
local LEAVES = Color3.fromRGB(62, 84, 46)
local DEAD_WOOD = Color3.fromRGB(78, 64, 52)
local GLASS = Color3.fromRGB(160, 180, 190)
local PAPER = Color3.fromRGB(222, 216, 196)
local SEAT = Color3.fromRGB(110, 80, 52)
local PORCELAIN = Color3.fromRGB(220, 220, 214)
local STALL = Color3.fromRGB(110, 130, 140)
local MAT_BLUE = Color3.fromRGB(52, 72, 110)
local MAT_RED = Color3.fromRGB(120, 44, 40)
local FLAG = Color3.fromRGB(110, 30, 30)
local BLACK = Color3.fromRGB(24, 24, 26)
local WHITE = Color3.fromRGB(230, 230, 224)
local BEIGE = Color3.fromRGB(196, 186, 160)
local GOLD = Color3.fromRGB(196, 150, 60)
local DUMPSTER = Color3.fromRGB(56, 78, 58)
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

-- "OLD SCHOOL" sign letters as strokes on a 3 x 5 grid: { x0, y0, x1, y1 }.
local LETTERS: { [string]: { { number } } } = {
	O = { { 0, 0, 1, 5 }, { 2, 0, 3, 5 }, { 1, 4, 2, 5 }, { 1, 0, 2, 1 } },
	L = { { 0, 0, 1, 5 }, { 1, 0, 3, 1 } },
	D = { { 0, 0, 1, 5 }, { 1, 4, 2, 5 }, { 1, 0, 2, 1 }, { 2, 1, 3, 4 } },
	S = { { 0, 4, 3, 5 }, { 0, 3, 1, 4 }, { 0, 2, 3, 3 }, { 2, 1, 3, 2 }, { 0, 0, 3, 1 } },
	C = { { 0, 4, 3, 5 }, { 0, 1, 1, 4 }, { 0, 0, 3, 1 } },
	H = { { 0, 0, 1, 5 }, { 2, 0, 3, 5 }, { 1, 2, 2, 3 } },
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

-- // STATE
local randomState = SEED

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
	local cx, cy, cz = (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2
	local part = Instance.new("Part")
	part.Name = name
	part.Size = Vector3.new(x1 - x0, y1 - y0, z1 - z0)
	part.CFrame = CFrame.new(
		f.origin.X + r[1] * cx + r[2] * cy + r[3] * cz,
		f.origin.Y + r[4] * cx + r[5] * cy + r[6] * cz,
		f.origin.Z + r[7] * cx + r[8] * cy + r[9] * cz,
		r[1],
		r[2],
		r[3],
		r[4],
		r[5],
		r[6],
		r[7],
		r[8],
		r[9]
	)
	style(part, color, material)
	part.Parent = parent
	return part
end

--- Creates a long block running from `p0` to `p1` (branches, poles, chains, cracks).
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

--- Builds a straight wall from the foundation to the ceiling, split around its openings.
--- Window openings with `glass = true` get a pane; `glass = false` leaves the window smashed.
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
	material: Enum.Material
): ()
	local count, panes = 0, 0
	local function slab(along0: number, along1: number, bottom: number, top: number): ()
		if along1 <= along0 or top <= bottom then
			return
		end
		count += 1
		if axis == "X" then
			box(parent, `{name}{count}`, along0, BASE + bottom, side0, along1, BASE + top, side1, color, material)
		else
			box(parent, `{name}{count}`, side0, BASE + bottom, along0, side1, BASE + top, along1, color, material)
		end
	end
	local height = CEILING - BASE
	local cursor = from
	for _, opening in openings do
		slab(cursor, opening.from, 0, height)
		slab(opening.from, opening.to, 0, opening.bottom)
		slab(opening.from, opening.to, opening.top, height)
		if opening.glass then
			panes += 1
			local middle = (side0 + side1) / 2
			local pane = if axis == "X"
				then box(parent, `{name}Glass{panes}`, opening.from, BASE + opening.bottom, middle - 0.1, opening.to, BASE + opening.top, middle + 0.1, GLASS, M.Glass)
				else box(parent, `{name}Glass{panes}`, middle - 0.1, BASE + opening.bottom, opening.from, middle + 0.1, BASE + opening.top, opening.to, GLASS, M.Glass)
			pane.Transparency = 0.55
			pane.CastShadow = false
		end
		cursor = opening.to
	end
	slab(cursor, to, 0, height)
end

--- Scatters loose sheets of paper over a floor area.
local function papers(parent: Instance, name: string, count: number, x0: number, z0: number, x1: number, z1: number): ()
	for index = 1, count do
		local f = frame(between(x0, x1), FLOOR, between(z0, z1), between(0, 180))
		piece(parent, `{name}{index}`, f, -0.5, 0, -0.7, 0.5, 0.03, 0.7, PAPER, M.SmoothPlastic)
	end
end

--- Scatters broken glass below a smashed window.
local function shards(parent: Instance, name: string, x: number, z: number, count: number): ()
	for index = 1, count do
		local f = frame(x + between(-2.5, 2.5), FLOOR + 0.02, z + between(-1.5, 1.5), between(0, 180), between(-6, 6))
		local size = between(0.3, 0.9)
		piece(parent, `{name}{index}`, f, -size / 2, 0, -size / 3, size / 2, 0.04, size / 3, GLASS, M.Glass).Transparency = 0.3
	end
end

--- Piles rubble chunks (and plaster from the ceiling) around a point.
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

--- Builds a fluorescent ceiling light at (x, z): a housing and a tube that glows only if `working`.
local function ceilingLight(parent: Instance, name: string, x: number, z: number, alongX: boolean, working: boolean): ()
	local f = frame(x, CEILING, z, if alongX then 90 else 0)
	piece(parent, `{name}Housing`, f, -0.5, -0.35, -2, 0.5, 0, 2, METAL, M.Metal)
	local tube = piece(parent, `{name}Tube`, f, -0.2, -0.45, -1.8, 0.2, -0.35, 1.8, if working then TUBE_ON else TUBE_OFF, M.SmoothPlastic)
	if working then
		glow(tube, TUBE_ON, 22, 0.6)
	end
end

--- Builds a light fixture that has come loose and hangs at an angle from one end.
local function hangingLight(parent: Instance, name: string, x: number, z: number): ()
	local f = frame(x, CEILING - 0.2, z, 15, 35)
	piece(parent, `{name}Housing`, f, -0.5, -0.35, -4, 0.5, 0, 0, METAL, M.Metal)
	piece(parent, `{name}Tube`, f, -0.2, -0.45, -3.8, 0.2, -0.35, -0.2, TUBE_OFF, M.SmoothPlastic)
	beam(parent, `{name}Wire`, Vector3.new(x, CEILING, z), Vector3.new(x, CEILING - 0.3, z), 0.05, 0.05, BLACK, M.SmoothPlastic)
end

--- Builds a school desk (top, book rack, four metal legs) facing -X in its frame.
local function desk(parent: Instance, name: string, f: Frame): ()
	piece(parent, `{name}Top`, f, -1, 2.5, -1.5, 1, 2.65, 1.5, WOOD, M.Wood)
	piece(parent, `{name}Rack`, f, -0.7, 2, -1.3, 0.6, 2.08, 1.3, METAL, M.Metal)
	for index, corner in { { -0.85, -1.35 }, { 0.85, -1.35 }, { -0.85, 1.35 }, { 0.85, 1.35 } } do
		piece(parent, `{name}Leg{index}`, f, corner[1] - 0.075, 0, corner[2] - 0.075, corner[1] + 0.075, 2.5, corner[2] + 0.075, METAL, M.Metal)
	end
end

--- Builds a school chair (seat, backrest, four legs) facing -X in its frame.
local function chair(parent: Instance, name: string, f: Frame): ()
	piece(parent, `{name}Seat`, f, -0.8, 1.5, -0.8, 0.8, 1.65, 0.8, SEAT, M.Wood)
	piece(parent, `{name}Back`, f, 0.7, 1.65, -0.8, 0.85, 3.6, 0.8, SEAT, M.Wood)
	for index, corner in { { -0.65, -0.65 }, { 0.65, -0.65 }, { -0.65, 0.65 }, { 0.65, 0.65 } } do
		piece(parent, `{name}Leg{index}`, f, corner[1] - 0.06, 0, corner[2] - 0.06, corner[1] + 0.06, 1.5, corner[2] + 0.06, METAL, M.Metal)
	end
end

--- Builds a bookshelf whose back stands against a wall at `x1`, filled with random books.
local function bookshelf(parent: Instance, name: string, x0: number, x1: number, z0: number, z1: number, height: number): ()
	box(parent, `{name}Back`, x1 - 0.1, FLOOR, z0, x1, FLOOR + height, z1, WOOD_DARK, M.Wood)
	box(parent, `{name}SideA`, x0, FLOOR, z0, x1 - 0.1, FLOOR + height, z0 + 0.15, WOOD_DARK, M.Wood)
	box(parent, `{name}SideB`, x0, FLOOR, z1 - 0.15, x1 - 0.1, FLOOR + height, z1, WOOD_DARK, M.Wood)
	local levels = { 0, 2.3, 4.6, height - 0.15 }
	for index, level in levels do
		box(parent, `{name}Shelf{index}`, x0, FLOOR + level, z0 + 0.15, x1 - 0.1, FLOOR + level + 0.15, z1 - 0.15, WOOD_DARK, M.Wood)
	end
	local books = 0
	for shelf = 1, 3 do
		local z = z0 + 0.3
		local bottom = FLOOR + levels[shelf] + 0.15
		while z < z1 - 0.8 do
			local thickness = between(0.2, 0.4)
			if random() < 0.8 then
				books += 1
				box(
					parent,
					`{name}Book{books}`,
					x0 + 0.2,
					bottom,
					z,
					x1 - 0.3,
					bottom + between(1.2, 1.9),
					z + thickness,
					BOOK_COLORS[math.floor(random() * #BOOK_COLORS) + 1],
					M.Fabric
				)
			end
			z += thickness + 0.05
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
		piece(parent, `{name}{index}`, f, -size / 2, 0, -size / 2, size / 2, size * between(0.6, 1.2), size / 2, LEAVES, M.LeafyGrass)
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
local function ivy(parent: Instance, name: string, axis: "X" | "Z", face: number, out: number, from: number, to: number, height: number): ()
	local count = 0
	local cursor = from
	while cursor < to - 0.5 do
		local width = math.min(between(1, 2.5), to - cursor)
		local top = BASE + height * between(0.4, 1)
		count += 1
		local near, far = if out > 0 then face else face - 0.12, if out > 0 then face + 0.12 else face
		if axis == "X" then
			box(parent, `{name}{count}`, cursor, BASE, near, cursor + width, top, far, LEAVES, M.LeafyGrass)
		else
			box(parent, `{name}{count}`, near, BASE, cursor, far, top, cursor + width, LEAVES, M.LeafyGrass)
		end
		cursor += width
	end
end

-- Building ---------------------------------------------------------------------------------

--- The school building: foundation, outside brick walls with windows (some smashed) and inside walls.
local function buildShell(model: Instance): ()
	local folder = Instance.new("Folder")
	folder.Name = "Building"
	folder.Parent = model
	box(folder, "Foundation", -80, 0, -60, 80, BASE, 10, CONCRETE, M.Concrete)

	local function window(from: number, to: number, glass: boolean): Opening
		return { from = from, to = to, bottom = 4, top = 11, glass = glass }
	end
	local function high(from: number, to: number, glass: boolean): Opening
		return { from = from, to = to, bottom = 10, top = 14, glass = glass }
	end
	local function small(from: number, to: number, glass: boolean): Opening
		return { from = from, to = to, bottom = 9, top = 12, glass = glass }
	end
	local function door(from: number, to: number, top: number): Opening
		return { from = from, to = to, bottom = 0, top = top }
	end

	wall(folder, "NorthWall", "X", -80, 80, -60, -58, {
		window(-74, -69, true), window(-66, -61, true), window(-58, -53, true),
		window(-45, -40, true), window(-37, -32, false), window(-29, -24, true),
		window(-15, -10, false), window(-7, -2, true), window(1, 6, false),
		window(15, 20, true), window(23, 28, false), window(30, 35, true),
		high(44, 52, true), high(56, 64, false), high(68, 76, true),
	}, BRICK, M.Brick)
	wall(folder, "SouthWall", "X", -80, 80, 8, 10, {
		window(-74, -69, false), window(-62, -57, true), window(-49, -45, true), door(-43, -34, 10),
		window(-32, -28, true), small(-22, -16, true), small(-8, -3, false),
		window(6, 12, true), window(18, 24, false), window(28, 34, true),
		high(44, 52, true), door(56, 62, 8), high(66, 74, true),
	}, BRICK, M.Brick)
	wall(folder, "WestWall", "Z", -58, 8, -80, -78, {
		window(-52, -47, true), window(-42, -37, true), door(-28, -22, 8), window(-10, -5, true), window(0, 4, true),
	}, BRICK, M.Brick)
	wall(folder, "EastWall", "Z", -58, 8, 78, 80, {
		high(-52, -44, true), high(-38, -30, false), high(-24, -16, true), high(-10, -2, true),
	}, BRICK, M.Brick)

	-- Hallway walls with classroom and room doors.
	wall(folder, "HallNorth", "X", -78, 38, -31, -30, { door(-67, -62, 8), door(-37, -32, 8), door(-7, -2, 8), door(22, 27, 8) }, PLASTER, M.Plaster)
	wall(folder, "HallSouth", "X", -78, 38, -20, -19, {
		door(-68, -63, 8), door(-45, -32, 10), door(-21, -17, 8), door(-8, -4, 8), door(16, 24, 9),
	}, PLASTER, M.Plaster)
	wall(folder, "GymWall", "Z", -58, 8, 38, 40, { door(-29, -21, 10) }, PLASTER, M.Plaster)
	for index, x in { -50, -20, 10 } do
		wall(folder, `ClassroomWall{index}`, "Z", -58, -31, x, x + 1, {}, PLASTER, M.Plaster)
	end
	for index, x in { -52, -26, -12, 1 } do
		wall(folder, `RoomWall{index}`, "Z", -19, 8, x, x + 1, {}, PLASTER, M.Plaster)
	end
end

--- Ceiling, flat roof and parapet. Kept in their own folder so the viewer can hide them.
local function buildRoof(model: Instance): ()
	local folder = Instance.new("Folder")
	folder.Name = "Roof"
	folder.Parent = model
	-- The ceiling has caved in over Classroom C (x -6..0, z -50..-44).
	box(folder, "CeilingWest", -80, CEILING, -60, -6, CEILING + 0.5, 10, CEILING_COLOR, M.Plaster)
	box(folder, "CeilingEast", 0, CEILING, -60, 80, CEILING + 0.5, 10, CEILING_COLOR, M.Plaster)
	box(folder, "CeilingNorth", -6, CEILING, -60, 0, CEILING + 0.5, -50, CEILING_COLOR, M.Plaster)
	box(folder, "CeilingSouth", -6, CEILING, -44, 0, CEILING + 0.5, 10, CEILING_COLOR, M.Plaster)
	box(folder, "RoofSlab", -80, CEILING + 0.5, -60, 80, CEILING + 1.3, 10, ROOF_COLOR, M.Asphalt)
	local top = CEILING + 1.3
	box(folder, "ParapetNorth", -80, top, -60, 80, top + 1.5, -59, BRICK, M.Brick)
	box(folder, "ParapetSouth", -80, top, 9, 80, top + 1.5, 10, BRICK, M.Brick)
	box(folder, "ParapetWest", -80, top, -59, -79, top + 1.5, 9, BRICK, M.Brick)
	box(folder, "ParapetEast", 79, top, -59, 80, top + 1.5, 9, BRICK, M.Brick)
	box(folder, "AirConditioner", 20, top, -40, 26, top + 2, -34, RUST, M.CorrodedMetal)
end

-- Rooms ------------------------------------------------------------------------------------

--- A classroom between x0..x1 and z0..z1 (inside faces): chalkboard on the west wall, desks in rows.
--- `mess` (0..1) sets how much is knocked over; `hole` marks desks under the caved-in ceiling.
local function buildClassroom(
	sections: Instance,
	name: string,
	description: string,
	x0: number,
	x1: number,
	mess: number,
	withShelf: boolean,
	hole: { number }?
): Folder
	local z0, z1 = -58, -31
	local cz = (z0 + z1) / 2
	local folder = newSection(sections, name, description)
	box(folder, "Floor", x0, BASE, z0, x1, FLOOR, z1, WOOD_FLOOR, M.WoodPlanks)

	-- Chalkboard with a wooden frame, chalk tray and the last lesson still on it.
	box(folder, "BoardFrame", x0, FLOOR + 3.6, cz - 8.4, x0 + 0.3, FLOOR + 10.4, cz + 8.4, WOOD_DARK, M.Wood)
	box(folder, "Chalkboard", x0 + 0.3, FLOOR + 4, cz - 8, x0 + 0.45, FLOOR + 10, cz + 8, CHALKBOARD, M.Slate)
	box(folder, "ChalkTray", x0 + 0.3, FLOOR + 3.7, cz - 8, x0 + 0.9, FLOOR + 3.85, cz + 8, WOOD_DARK, M.Wood)
	for index, y in { 8.6, 7.7, 6.8, 5.9 } do
		local length = between(6, 13)
		box(folder, `Chalk{index}`, x0 + 0.45, FLOOR + y, cz - 7, x0 + 0.5, FLOOR + y + 0.12, cz - 7 + length, CHALK, M.SmoothPlastic)
	end
	box(folder, "Clock", x0, FLOOR + 11, cz - 0.75, x0 + 0.2, FLOOR + 12.5, cz + 0.75, WHITE, M.SmoothPlastic)
	box(folder, "ClockHand", x0 + 0.2, FLOOR + 11.7, cz - 0.05, x0 + 0.25, FLOOR + 12.3, cz + 0.05, BLACK, M.SmoothPlastic)

	-- Teacher's desk and chair.
	box(folder, "TeacherDeskTop", x0 + 3, FLOOR + 2.6, cz + 3.5, x0 + 6, FLOOR + 2.75, cz + 8.5, WOOD_DARK, M.Wood)
	box(folder, "TeacherDeskLeft", x0 + 3, FLOOR, cz + 3.5, x0 + 6, FLOOR + 2.6, cz + 5, WOOD_DARK, M.Wood)
	box(folder, "TeacherDeskRight", x0 + 3, FLOOR, cz + 7, x0 + 6, FLOOR + 2.6, cz + 8.5, WOOD_DARK, M.Wood)
	chair(folder, "TeacherChair", frame(x0 + 2.1, FLOOR, cz + 6, 180))

	-- Twelve student desks in four rows, some knocked over.
	for row = 1, 4 do
		for column = 1, 3 do
			local x, z = x0 + 6 + row * 4, cz - 14 + column * 7
			local label = `{row}_{column}`
			local underHole = hole ~= nil and x > hole[1] - 1 and x < hole[2] + 1 and z > hole[3] - 1.5 and z < hole[4] + 1.5
			if underHole or random() < mess * 0.4 then
				desk(folder, `Desk{label}`, frame(x, FLOOR + 1, z, between(-40, 40), 0, 90))
			else
				desk(folder, `Desk{label}`, frame(x, FLOOR, z, 0))
			end
			if random() < mess * 0.5 then
				chair(folder, `Chair{label}`, frame(x + 2.4, FLOOR + 0.8, z + between(-0.5, 0.5), between(0, 360), 90))
			else
				chair(folder, `Chair{label}`, frame(x + 2.1, FLOOR, z, between(-15, 15)))
			end
		end
	end

	if withShelf then
		bookshelf(folder, "Bookshelf", x1 - 1.5, x1, cz - 5, cz + 5, 7)
	end
	papers(folder, "Paper", math.floor(8 + mess * 14), x0 + 2, z0 + 2, x1 - 2, z1 - 2)
	for index = 1, 4 do
		local lx, lz = x0 + 8 + 11 * ((index - 1) % 2), cz + (if index <= 2 then -5 else 5)
		ceilingLight(folder, `Light{index}`, lx, lz, false, random() < 0.25)
	end
	return folder
end

--- Hallway: tiled floor, rusty lockers, a toppled locker, a puddle and flickering lights.
local function buildHallway(sections: Instance): ()
	local folder = newSection(sections, "Hallway", "The main hallway, lined with rusty lockers, one knocked over, and a puddle from the leaking roof.")
	box(folder, "Floor", -78, BASE, -30, 38, FLOOR, -20, HALL_TILE, M.CeramicTiles)
	local lockers = 0
	for _, group in { { -60, 5 }, { -30, 5 }, { 0, 5 }, { 29, 3 } } do
		for index = 0, group[2] - 1 do
			lockers += 1
			local x = group[1] + index * 2.5
			local name = `Locker{lockers}`
			box(folder, name, x, FLOOR, -30, x + 2.5, FLOOR + 7, -28, LOCKER, M.CorrodedMetal)
			box(folder, `{name}VentA`, x + 0.6, FLOOR + 5.9, -28, x + 1.9, FLOOR + 6.05, -27.95, BLACK, M.SmoothPlastic)
			box(folder, `{name}VentB`, x + 0.6, FLOOR + 6.3, -28, x + 1.9, FLOOR + 6.45, -27.95, BLACK, M.SmoothPlastic)
			box(folder, `{name}Handle`, x + 2, FLOOR + 3, -28, x + 2.15, FLOOR + 3.8, -27.8, METAL, M.Metal)
		end
	end
	piece(folder, "FallenLocker", frame(-42, FLOOR + 1.25, -23, 4, 0, 90), -1.25, -3.5, -1, 1.25, 3.5, 1, LOCKER, M.CorrodedMetal)
	box(folder, "Puddle", -15, FLOOR, -27, -9, FLOOR + 0.03, -22, Color3.fromRGB(40, 44, 48), M.Glass).Transparency = 0.2
	for index = 1, 3 do
		beam(folder, `FallenBoard{index}`, Vector3.new(-62 + index * 22, FLOOR + 0.1, -29), Vector3.new(-58 + index * 22, FLOOR + 1.6, -21.5), 0.8, 0.15, WOOD, M.WoodPlanks)
	end
	papers(folder, "Paper", 14, -76, -29.5, 36, -20.5)
	for index, x in { -70, -55, -40, -25, -10, 5, 20, 33 } do
		ceilingLight(folder, `Light{index}`, x, -25, true, index == 3 or index == 7)
	end
end

--- Lobby: trophy case, notice board, benches and the ripped-off front door.
local function buildLobby(sections: Instance): ()
	local folder = newSection(sections, "Lobby", "The front lobby with a dusty trophy case, a notice board and the front doors, one ripped off.")
	box(folder, "Floor", -51, BASE, -19, -26, FLOOR, 8, HALL_TILE, M.CeramicTiles)
	-- Trophy case against the west wall.
	box(folder, "CaseBase", -51, FLOOR, -14, -48.5, FLOOR + 3, -4, WOOD_DARK, M.Wood)
	box(folder, "CaseTop", -51, FLOOR + 8, -14, -48.5, FLOOR + 8.3, -4, WOOD_DARK, M.Wood)
	local front = box(folder, "CaseFront", -48.6, FLOOR + 3, -14, -48.5, FLOOR + 8, -4, GLASS, M.Glass)
	front.Transparency = 0.6
	for index, z in { -11.5, -9, -6.5 } do
		box(folder, `Trophy{index}Base`, -50.2, FLOOR + 3, z - 0.5, -49.2, FLOOR + 3.4, z + 0.5, GOLD, M.Foil)
		box(folder, `Trophy{index}Stem`, -49.85, FLOOR + 3.4, z - 0.15, -49.55, FLOOR + 4.2, z + 0.15, GOLD, M.Foil)
		box(folder, `Trophy{index}Cup`, -50.3, FLOOR + 4.2, z - 0.6, -49.1, FLOOR + 5.2 + index * 0.3, z + 0.6, GOLD, M.Foil)
	end
	-- Notice board with a few curling notices.
	box(folder, "NoticeBoard", -26.3, FLOOR + 4, -14, -26, FLOOR + 9, -4, Color3.fromRGB(150, 116, 76), M.Fabric)
	for index = 1, 5 do
		local z, y = -13 + index * 1.7, FLOOR + between(5, 8)
		box(folder, `Notice{index}`, -26.35, y - 0.6, z - 0.6, -26.3, y + 0.6, z + 0.6, if index % 2 == 0 then PAPER else Color3.fromRGB(200, 190, 120), M.SmoothPlastic)
	end
	-- Benches either side of the entrance.
	for index, x in { -50, -32 } do
		box(folder, `Bench{index}Seat`, x, FLOOR + 1.6, 5.5, x + 5, FLOOR + 1.8, 7.5, WOOD, M.WoodPlanks)
		box(folder, `Bench{index}LegA`, x + 0.3, FLOOR, 5.8, x + 0.6, FLOOR + 1.6, 7.2, METAL, M.Metal)
		box(folder, `Bench{index}LegB`, x + 4.4, FLOOR, 5.8, x + 4.7, FLOOR + 1.6, 7.2, METAL, M.Metal)
	end
	-- Front doors: one hangs open on its hinge, the other lies on the floor.
	piece(folder, "DoorLeft", frame(-43, FLOOR, 8, 75), 0, 0, -0.25, 4.5, 9.6, 0, WOOD_DARK, M.Wood)
	box(folder, "DoorRight", -38.5, FLOOR, -2.5, -34, FLOOR + 0.25, 7.3, WOOD_DARK, M.Wood)
	papers(folder, "Paper", 10, -49, -18, -28, 4)
	ceilingLight(folder, "Light1", -38, -10, false, false)
	ceilingLight(folder, "Light2", -38, 0, false, true)
end

--- Office: ransacked desk, old computer, filing cabinets and a bookshelf.
local function buildOffice(sections: Instance): ()
	local folder = newSection(sections, "Office", "The principal's office, ransacked: papers everywhere, an old computer and a pulled-out filing drawer.")
	box(folder, "Floor", -78, BASE, -19, -52, FLOOR, 8, CARPET, M.Carpet)
	box(folder, "DeskTop", -70, FLOOR + 2.5, -6, -63, FLOOR + 2.65, -2, WOOD_DARK, M.Wood)
	box(folder, "DeskLeft", -70, FLOOR, -6, -68.5, FLOOR + 2.5, -2, WOOD_DARK, M.Wood)
	box(folder, "DeskRight", -64.5, FLOOR, -6, -63, FLOOR + 2.5, -2, WOOD_DARK, M.Wood)
	box(folder, "Monitor", -68, FLOOR + 2.65, -5.5, -65.5, FLOOR + 4.9, -3.3, BEIGE, M.SmoothPlastic)
	box(folder, "Screen", -67.7, FLOOR + 3, -3.3, -65.8, FLOOR + 4.6, -3.25, BLACK, M.Glass)
	box(folder, "Keyboard", -68, FLOOR + 2.65, -3, -65.5, FLOOR + 2.8, -2.2, BEIGE, M.SmoothPlastic)
	-- Office chair lying on its side.
	local seat = frame(-66, FLOOR + 1, 1.5, 30, 0, 80)
	piece(folder, "ChairSeat", seat, -1, 1.6, -1, 1, 1.9, 1, BLACK, M.Fabric)
	piece(folder, "ChairBack", seat, 0.8, 1.9, -1, 1.1, 4.2, 1, BLACK, M.Fabric)
	piece(folder, "ChairPole", seat, -0.15, 0.3, -0.15, 0.15, 1.6, 0.15, METAL, M.Metal)
	piece(folder, "ChairFoot", seat, -1.1, 0, -0.15, 1.1, 0.3, 0.15, METAL, M.Metal)
	-- Filing cabinets against the west wall, one drawer pulled out.
	for index, z in { -16, -13.5 } do
		local name = `FilingCabinet{index}`
		box(folder, name, -78, FLOOR, z, -76, FLOOR + 5, z + 2, METAL, M.Metal)
		for drawer = 1, 3 do
			box(folder, `{name}Line{drawer}`, -76, FLOOR + drawer * 1.6, z + 0.2, -75.95, FLOOR + drawer * 1.6 + 0.08, z + 1.8, BLACK, M.SmoothPlastic)
		end
	end
	box(folder, "OpenDrawer", -76, FLOOR + 3.3, -13.3, -74.4, FLOOR + 4.6, -11.7, METAL, M.Metal)
	bookshelf(folder, "Bookshelf", -53.5, -52, -10, 0, 7)
	papers(folder, "Paper", 26, -77, -18, -54, 7)
	shards(folder, "Glass", -71.5, 7, 7)
	ceilingLight(folder, "Light1", -65, -10, true, false)
	ceilingLight(folder, "Light2", -65, 2, true, false)
end

--- Toilets: boys' and girls' rooms with stalls, toilets, sinks and mirrors.
local function buildToilets(sections: Instance): ()
	local folder = newSection(sections, "Toilets", "Boys' and girls' toilets: stalls with broken doors, sinks and cracked mirrors.")
	for side, room in { { name = "Boys", x0 = -25, x1 = -12, sinks = { -24.5, -16 } }, { name = "Girls", x0 = -11, x1 = 1, sinks = { -10.5, -3 } } } do
		local prefix = room.name
		box(folder, `{prefix}Floor`, room.x0, BASE, -19, room.x1, FLOOR, 8, WHITE_TILE, M.CeramicTiles)
		for stall = 1, 3 do
			local a = room.x0 + (stall - 1) * 3.5
			local name = `{prefix}Stall{stall}`
			box(folder, `{name}Divider`, a + 3.425, FLOOR + 0.8, 3, a + 3.575, FLOOR + 7, 8, STALL, M.Metal)
			box(folder, `{name}PostA`, a, FLOOR + 0.8, 2.85, a + 0.45, FLOOR + 7, 3, STALL, M.Metal)
			box(folder, `{name}PostB`, a + 3.05, FLOOR + 0.8, 2.85, a + 3.425, FLOOR + 7, 3, STALL, M.Metal)
			if (stall + side) % 3 == 0 then
				box(folder, `{name}Door`, a + 0.5, FLOOR, -1.5, a + 3, FLOOR + 0.15, 2.4, STALL, M.Metal) -- fallen off
			else
				piece(folder, `{name}Door`, frame(a + 0.45, FLOOR + 0.8, 2.9, between(-80, -20)), 0, 0, -0.05, 2.6, 5.7, 0.05, STALL, M.Metal)
			end
			box(folder, `{name}Bowl`, a + 1.05, FLOOR, 5.5, a + 2.45, FLOOR + 1.4, 7.6, PORCELAIN, M.SmoothPlastic)
			box(folder, `{name}Tank`, a + 0.95, FLOOR + 1.4, 7.2, a + 2.55, FLOOR + 3.2, 8, PORCELAIN, M.SmoothPlastic)
		end
		for index, s in room.sinks do
			local name = `{prefix}Sink{index}`
			box(folder, name, s, FLOOR + 2.6, -19, s + 2.2, FLOOR + 3.4, -17.4, PORCELAIN, M.SmoothPlastic)
			box(folder, `{name}Stand`, s + 0.8, FLOOR, -19, s + 1.4, FLOOR + 2.6, -18.4, PORCELAIN, M.SmoothPlastic)
			box(folder, `{name}Tap`, s + 1, FLOOR + 3.4, -19, s + 1.2, FLOOR + 3.9, -18.6, METAL, M.Metal)
			local mirror = box(folder, `{name}Mirror`, s - 0.2, FLOOR + 4.5, -19, s + 2.4, FLOOR + 8, -18.9, Color3.fromRGB(150, 158, 162), M.Glass)
			mirror.Transparency = if index == 2 then 0.4 else 0
		end
		ceilingLight(folder, `{prefix}Light`, (room.x0 + room.x1) / 2, -8, false, false)
	end
	box(folder, "Puddle", -23, FLOOR, -6, -17, FLOOR + 0.03, -1, Color3.fromRGB(40, 44, 48), M.Glass).Transparency = 0.2
	shards(folder, "Glass", -5.5, 7, 5)
end

--- Cafeteria: long tables and benches, a serving counter and abandoned trays.
local function buildCafeteria(sections: Instance): ()
	local folder = newSection(sections, "Cafeteria", "Long lunch tables and benches, a serving counter and trays left behind.")
	box(folder, "Floor", 2, BASE, -19, 38, FLOOR, 8, HALL_TILE, M.CeramicTiles)
	box(folder, "Counter", 34, FLOOR, -14, 38, FLOOR + 3.4, 2, METAL, M.Metal)
	box(folder, "CounterTop", 33.6, FLOOR + 3.4, -14, 38, FLOOR + 3.6, 2, METAL, M.Metal)
	local guard = box(folder, "SneezeGuard", 34.4, FLOOR + 4.6, -13, 34.6, FLOOR + 6, 1, GLASS, M.Glass)
	guard.Transparency = 0.6
	box(folder, "GuardPostA", 34.4, FLOOR + 3.6, -13.6, 34.6, FLOOR + 6, -13, METAL, M.Metal)
	box(folder, "GuardPostB", 34.4, FLOOR + 3.6, 1, 34.6, FLOOR + 6, 1.6, METAL, M.Metal)
	for index, z in { -12, -4, 4 } do
		local name = `Table{index}`
		local f = frame(17, FLOOR, z, if index == 2 then 8 else 0)
		piece(folder, `{name}Top`, f, -11, 2.5, -1.5, 11, 2.7, 1.5, WOOD, M.Wood)
		for leg, x in { -10, 10 } do
			piece(folder, `{name}Leg{leg}`, f, x - 0.3, 0, -1.2, x + 0.3, 2.5, 1.2, METAL, M.Metal)
		end
		for bench, offset in { -2.8, 2.8 } do
			local benchName = `{name}Bench{bench}`
			if index == 3 and bench == 2 then
				piece(folder, benchName, frame(17, FLOOR + 0.4, z + 3.4, 3, 90), -10, -0.4, -0.4, 10, 0.4, 0.4, WOOD, M.Wood)
			else
				piece(folder, `{benchName}Seat`, f, -10, 1.5, offset - 0.4, 10, 1.65, offset + 0.4, WOOD, M.Wood)
				for leg, x in { -9, 9 } do
					piece(folder, `{benchName}Leg{leg}`, f, x - 0.2, 0, offset - 0.3, x + 0.2, 1.5, offset + 0.3, METAL, M.Metal)
				end
			end
		end
		for tray = 1, 3 do
			-- Trays sit in the table's own frame so they stay on the turned table too.
			local yaw = if index == 2 then 8 else 0
			local lx, lz = between(-9, 9), between(-0.6, 0.6)
			local cy, sy = math.cos(math.rad(yaw)), math.sin(math.rad(yaw))
			local tf = frame(17 + cy * lx + sy * lz, FLOOR + 2.7, z - sy * lx + cy * lz, yaw + between(-20, 20))
			piece(folder, `{name}Tray{tray}`, tf, -0.8, 0, -0.6, 0.8, 0.08, 0.6, Color3.fromRGB(150, 120, 90), M.SmoothPlastic)
		end
	end
	shards(folder, "Glass", 21, 7, 6)
	papers(folder, "Paper", 8, 4, -18, 32, 7)
	for index, x in { 8, 20, 30 } do
		ceilingLight(folder, `Light{index}`, x, -5, true, index == 2)
	end
end

--- Gym: wooden floor with court lines, basketball hoops (one collapsed), bleachers and mats.
local function buildGym(sections: Instance): ()
	local folder = newSection(sections, "Gym", "A wooden-floor gym with faded court lines, bleachers, mats and a collapsed basketball hoop.")
	box(folder, "Floor", 40, BASE, -58, 78, FLOOR, 8, GYM_FLOOR, M.WoodPlanks)
	local lineColor = Color3.fromRGB(214, 208, 190)
	local function line(name: string, x0: number, z0: number, x1: number, z1: number): ()
		box(folder, name, x0, FLOOR, z0, x1, FLOOR + 0.02, z1, lineColor, M.SmoothPlastic)
	end
	line("LineWest", 44, -54, 44.3, 4)
	line("LineEast", 73.7, -54, 74, 4)
	line("LineNorth", 44.3, -54, 73.7, -53.7)
	line("LineSouth", 44.3, 3.7, 73.7, 4)
	line("LineCenter", 44.3, -25.15, 73.7, -24.85)
	line("CenterBoxWest", 55, -29, 55.3, -25.15)
	line("CenterBoxEast", 62.7, -29, 63, -25.15)
	line("CenterBoxNorth", 55, -29.3, 63, -29)
	-- North hoop, still on the wall.
	box(folder, "HoopNorthArm", 58.5, FLOOR + 11, -58, 59.5, FLOOR + 11.5, -55.5, METAL, M.Metal)
	box(folder, "HoopNorthBoard", 56, FLOOR + 9, -55.5, 62, FLOOR + 13, -55.2, WHITE, M.SmoothPlastic)
	box(folder, "HoopNorthRimBack", 58.2, FLOOR + 10, -55.2, 59.8, FLOOR + 10.15, -55.05, RIM, M.Metal)
	box(folder, "HoopNorthRimFront", 58.2, FLOOR + 10, -53.6, 59.8, FLOOR + 10.15, -53.45, RIM, M.Metal)
	box(folder, "HoopNorthRimLeft", 58.2, FLOOR + 10, -55.05, 58.35, FLOOR + 10.15, -53.6, RIM, M.Metal)
	box(folder, "HoopNorthRimRight", 59.65, FLOOR + 10, -55.05, 59.8, FLOOR + 10.15, -53.6, RIM, M.Metal)
	-- South hoop: the backboard has torn loose and hangs at an angle; the rim lies on the floor.
	box(folder, "HoopSouthArm", 58.5, FLOOR + 11, 5.5, 59.5, FLOOR + 11.5, 8, METAL, M.Metal)
	piece(folder, "HoopSouthBoard", frame(59, FLOOR + 11, 5.2, 0, -25, 12), -3, -4, -0.3, 3, 0, 0, WHITE, M.SmoothPlastic)
	piece(folder, "HoopSouthRim", frame(57, FLOOR, -2, 30), -0.8, 0, -0.8, 0.8, 0.15, 0.8, RIM, M.Metal)
	-- Bleachers along the east wall.
	box(folder, "BleacherLow", 70, FLOOR, -40, 78, FLOOR + 1.5, -10, WOOD, M.WoodPlanks)
	box(folder, "BleacherMiddle", 72.5, FLOOR + 1.5, -40, 78, FLOOR + 3, -10, WOOD, M.WoodPlanks)
	box(folder, "BleacherHigh", 75, FLOOR + 3, -40, 78, FLOOR + 4.5, -10, WOOD, M.WoodPlanks)
	-- Stacked mats in the corner, and one dragged out.
	box(folder, "MatStackLow", 41, FLOOR, -57, 47, FLOOR + 0.8, -52, MAT_BLUE, M.Fabric)
	box(folder, "MatStackHigh", 41, FLOOR + 0.8, -57, 47, FLOOR + 1.6, -52, MAT_RED, M.Fabric)
	piece(folder, "MatLoose", frame(50, FLOOR, -46, 22), -3, 0, -2.5, 3, 0.8, 2.5, MAT_BLUE, M.Fabric)
	-- Dead scoreboard above the hallway doors.
	box(folder, "Scoreboard", 40, FLOOR + 11, -29, 40.4, FLOOR + 14, -21, BLACK, M.SmoothPlastic)
	for index = 1, 4 do
		box(folder, `ScoreDigit{index}`, 40.4, FLOOR + 12, -28.5 + index * 1.6, 40.45, FLOOR + 13.4, -27.5 + index * 1.6, Color3.fromRGB(90, 20, 20), M.SmoothPlastic)
	end
	rubble(folder, "Debris", 64, -14, 2.5, 6)
	shards(folder, "Glass", 79 - 1.2, -34, 4)
	for index = 1, 6 do
		local x, z = if index <= 3 then 50 else 68, -46 + ((index - 1) % 3) * 22
		ceilingLight(folder, `Light{index}`, x, z, false, index == 5)
	end
	hangingLight(folder, "LooseLight", 59, -36)
end

-- Outside ------------------------------------------------------------------------------------

--- Ground: the overgrown lot.
local function buildGround(model: Instance): ()
	local folder = Instance.new("Folder")
	folder.Name = "Floor"
	folder.Parent = model
	box(folder, "Ground", LOT_MIN_X, -4, LOT_MIN_Z, LOT_MAX_X, 0, LOT_MAX_Z, GRASS, M.Grass)
end

--- The brick wall around the lot, with pillars, a broken stretch and the front gate gap.
local function buildLotWalls(model: Instance): ()
	local folder = Instance.new("Folder")
	folder.Name = "Walls"
	folder.Parent = model
	local half = 0.75
	local pillars = 0
	local function pillar(x: number, z: number): ()
		pillars += 1
		box(folder, `Pillar{pillars}`, x - 1.25, 0, z - 1.25, x + 1.25, 7.5, z + 1.25, BRICK_DARK, M.Brick)
		box(folder, `Pillar{pillars}Cap`, x - 1.5, 7.5, z - 1.5, x + 1.5, 8, z + 1.5, CONCRETE, M.Concrete)
	end
	local segments = 0
	local function segment(axis: "X" | "Z", line: number, from: number, to: number): ()
		segments += 1
		if axis == "X" then
			box(folder, `Wall{segments}`, from, 0, line - half, to, 6, line + half, BRICK, M.Brick)
			box(folder, `Wall{segments}Cap`, from, 6, line - 1, to, 6.4, line + 1, CONCRETE, M.Concrete)
		else
			box(folder, `Wall{segments}`, line - half, 0, from, line + half, 6, to, BRICK, M.Brick)
			box(folder, `Wall{segments}Cap`, line - 1, 6, from, line + 1, 6.4, to, CONCRETE, M.Concrete)
		end
	end
	local south, north, west, east = LOT_MAX_Z - 0.75, LOT_MIN_Z + 0.75, LOT_MIN_X + 0.75, LOT_MAX_X - 0.75
	-- South (front): gate gap between the two pillars at -47.25 and -28.75, broken stretch 46..71.
	local southX = { west, -104, -79, -54, -47.25, -28.75, -4, 21, 46, 71, 96, east }
	for index, x in southX do
		pillar(x, south)
		local nextX = southX[index + 1]
		if nextX and not (x == -47.25 or x == 46) then
			segment("X", south, x + 1.25, nextX - 1.25)
		end
	end
	local northX = { west, -103, -77, -51, -25, 0, 25, 51, 77, 103, east }
	for index, x in northX do
		pillar(x, north)
		local nextX = northX[index + 1]
		if nextX then
			segment("X", north, x + 1.25, nextX - 1.25)
		end
	end
	for _, x in { west, east } do
		local zs = { north, -66, -33, 0, 33, 66, south }
		for index, z in zs do
			if index > 1 and index < #zs then
				pillar(x, z)
			end
			local nextZ = zs[index + 1]
			if nextZ then
				segment("Z", x, z + 1.25, nextZ - 1.25)
			end
		end
	end
	-- Fallen bricks where the front wall has collapsed.
	for index = 1, 10 do
		local f = frame(between(49, 68), between(0.3, 0.6), south + between(-3, 1), between(0, 180), between(-20, 20), between(-20, 20))
		piece(folder, `FallenBrick{index}`, f, -1, -0.3, -0.5, 1, 0.3, 0.5, BRICK, M.Brick)
	end
	box(folder, "BrokenStub", 47.5, 0, south - half, 50, 2.5, south + half, BRICK, M.Brick)
end

--- Front of the school: canopy, rusty "OLD SCHOOL" letters (one has slipped), flagpole and ivy.
local function buildEntrance(sections: Instance): ()
	local folder = newSection(sections, "Entrance", "The school's front: rusty OLD SCHOOL letters with one slipped, a concrete canopy and a flag at half-mast.")
	box(folder, "Landing", -46, 0, 10, -31, BASE, 14, CONCRETE, M.Concrete)
	box(folder, "Canopy", -46, 10.6, 10, -31, 11.1, 15, CONCRETE, M.Concrete)
	box(folder, "CanopyPostWest", -46, BASE, 14, -45.2, 10.6, 14.8, CONCRETE, M.Concrete)
	box(folder, "CanopyPostEast", -31.8, BASE, 14, -31, 10.6, 14.8, CONCRETE, M.Concrete)
	box(folder, "SignBoard", -50, 11.6, 10, -27, 14.8, 10.4, CONCRETE, M.Concrete)
	local text = "OLD SCHOOL"
	local unit = 0.5
	local x = -49
	for index = 1, #text do
		local letter = string.sub(text, index, index)
		local strokes = LETTERS[letter]
		if strokes then
			-- The last letter has slipped off its fixings and hangs crooked.
			local f = if index == #text then frame(x + 0.75, 11.95, 10.4, 0, 0, -28) else frame(x + 0.75, 11.95, 10.4, 0)
			for stroke, s in strokes do
				piece(folder, `Letter{index}Stroke{stroke}`, f, s[1] * unit - 0.75, s[2] * unit, 0, s[3] * unit - 0.75, s[4] * unit, 0.3, RUST, M.CorrodedMetal)
			end
			x += 2.1
		else
			x += 1.2
		end
	end
	box(folder, "FlagBase", -61, 0, 16, -57, 0.6, 20, CONCRETE, M.Concrete)
	box(folder, "FlagPole", -59.25, 0.6, 17.75, -58.75, 34, 18.25, METAL, M.Metal)
	box(folder, "FlagTop", -58.75, 21, 17.95, -54, 23.2, 18.05, FLAG, M.Fabric)
	box(folder, "FlagTorn", -58.75, 23.2, 17.95, -56, 24, 18.05, FLAG, M.Fabric)
	ivy(folder, "IvyFront", "X", 10, 1, -80, -75, 13)
	ivy(folder, "IvyMiddle", "X", 10, 1, -56.5, -50, 9)
	ivy(folder, "IvyEast", "X", 10, 1, 75, 80, 14)
	ivy(folder, "IvyWestSide", "Z", -80, -1, -60, -53, 12)
	for index, spot in { { -76, 12 }, { -66, 12.5 }, { -24, 12 }, { 2, 12.5 }, { 40, 12 }, { 76, 12 } } do
		local size = between(2.5, 4)
		piece(folder, `Bush{index}`, frame(spot[1], 0, spot[2], between(0, 40)), -size / 2, 0, -size / 2, size / 2, size * 0.8, size / 2, LEAVES, M.LeafyGrass)
	end
end

--- Schoolyard: cracked asphalt, the walkway to the entrance, the broken gate, a lamp and dead trees.
local function buildSchoolyard(sections: Instance): ()
	local folder = newSection(sections, "Schoolyard", "The cracked, weedy asphalt yard and the walkway from the broken front gate.")
	box(folder, "Walkway", -44, 0, 14, -33, BASE, 98, CONCRETE, M.Concrete)
	box(folder, "Asphalt", -110, 0, 20, -50, 0.15, 85, ASPHALT, M.Asphalt)
	for index = 1, 9 do
		crack(folder, `Crack{index}`, between(-105, -55), between(25, 80), 0.15, between(5, 12))
	end
	for index = 1, 4 do
		crack(folder, `WalkCrack{index}`, between(-42, -35), between(20, 92), BASE, between(3, 5))
	end
	for index, spot in { { -80, 42 }, { -80, 46 }, { -76, 46 }, { -80, 50 } } do
		box(folder, `Hopscotch{index}`, spot[1], 0.15, spot[2], spot[1] + 3.6, 0.17, spot[2] + 3.6, Color3.fromRGB(150, 150, 140), M.SmoothPlastic)
	end
	weeds(folder, "Weed", 26, -110, 20, -50, 85, 0.15)
	weeds(folder, "WalkWeed", 8, -44, 16, -33, 96, BASE)
	-- Gate: one leaf swung open, the other knocked flat.
	local hinge = frame(-46, 0, LOT_MAX_Z - 0.75, 70)
	local function gateLeaf(prefix: string, f: Frame): ()
		piece(folder, `{prefix}Top`, f, 0, 6.6, -0.1, 8, 7, 0.1, RUST, M.CorrodedMetal)
		piece(folder, `{prefix}Bottom`, f, 0, 0.5, -0.1, 8, 0.9, 0.1, RUST, M.CorrodedMetal)
		piece(folder, `{prefix}Hinge`, f, 0, 0.9, -0.1, 0.4, 6.6, 0.1, RUST, M.CorrodedMetal)
		piece(folder, `{prefix}Latch`, f, 7.6, 0.9, -0.1, 8, 6.6, 0.1, RUST, M.CorrodedMetal)
		for bar, offset in { 1.6, 3.2, 4.8, 6.4 } do
			piece(folder, `{prefix}Bar{bar}`, f, offset - 0.12, 0.9, -0.08, offset + 0.12, 6.6, 0.08, RUST, M.CorrodedMetal)
		end
	end
	gateLeaf("GateOpen", hinge)
	gateLeaf("GateFallen", frame(-41, BASE + 0.1, 89.5, 8, 90))
	-- Street lamp by the gate, still faintly lit.
	box(folder, "LampPole", -50.25, 0, 93.75, -49.75, 14, 94.25, METAL, M.Metal)
	box(folder, "LampArm", -50.25, 13.6, 92, -49.75, 14, 93.75, METAL, M.Metal)
	box(folder, "LampHood", -51, 13, 90.6, -49, 13.6, 92.6, METAL, M.Metal)
	glow(box(folder, "LampBulb", -50.5, 12.8, 91.1, -49.5, 13, 92.1, LAMP_ON, M.SmoothPlastic), LAMP_ON, 26, 1)
	for index, spot in { { -122, 40 }, { -92, 92 }, { -18, 70 }, { 122, 92 } } do
		deadTree(folder, `Tree{index}`, spot[1], spot[2], between(15, 20))
	end
	for index, x in { -76, -70 } do
		box(folder, `Bench{index}Seat`, x, 1.6, 16, x + 6, 1.8, 18, WOOD, M.WoodPlanks)
		box(folder, `Bench{index}Back`, x, 1.8, 17.8, x + 6, 3.6, 18, WOOD, M.WoodPlanks)
		box(folder, `Bench{index}LegA`, x + 0.3, 0, 16.2, x + 0.6, 1.6, 17.8, METAL, M.Metal)
		box(folder, `Bench{index}LegB`, x + 5.4, 0, 16.2, x + 5.7, 1.6, 17.8, METAL, M.Metal)
	end
end

--- Playground: rusty swing set with a broken swing, a slide and an old sandbox on a dirt patch.
local function buildPlayground(sections: Instance): ()
	local folder = newSection(sections, "Playground", "A rusty swing set with a broken swing, a slide and an old sandbox.")
	box(folder, "Dirt", 30, 0, 24, 115, 0.12, 88, DIRT, M.Ground)
	local top = 12
	for index, x in { 52, 68 } do
		beam(folder, `SwingLeg{index}A`, Vector3.new(x, top, 50), Vector3.new(x, 0.12, 46.6), 0.4, 0.4, RUST, M.CorrodedMetal)
		beam(folder, `SwingLeg{index}B`, Vector3.new(x, top, 50), Vector3.new(x, 0.12, 53.4), 0.4, 0.4, RUST, M.CorrodedMetal)
	end
	beam(folder, "SwingBar", Vector3.new(51.8, top, 50), Vector3.new(68.2, top, 50), 0.4, 0.4, RUST, M.CorrodedMetal)
	for index, x in { 56, 63 } do
		local name = `Swing{index}`
		beam(folder, `{name}ChainA`, Vector3.new(x - 0.8, top - 0.2, 50), Vector3.new(x - 0.8, 4.5, 50), 0.08, 0.08, METAL, M.Metal)
		if index == 1 then
			beam(folder, `{name}ChainB`, Vector3.new(x + 0.8, top - 0.2, 50), Vector3.new(x + 0.8, 4.5, 50), 0.08, 0.08, METAL, M.Metal)
			box(folder, `{name}Seat`, x - 1, 4.3, 49.6, x + 1, 4.5, 50.4, SEAT, M.Wood)
		else
			-- Broken: one chain snapped, the seat dangling.
			piece(folder, `{name}Seat`, frame(x - 0.8, 4.5, 50, 0, 0, -70), 0, -0.2, -0.4, 2, 0, 0.4, SEAT, M.Wood)
			beam(folder, `{name}ChainStub`, Vector3.new(x + 0.8, top - 0.2, 50), Vector3.new(x + 0.8, 9, 50), 0.08, 0.08, METAL, M.Metal)
		end
	end
	-- Slide.
	for index, corner in { { 86, 42 }, { 88.7, 42 }, { 86, 45.7 }, { 88.7, 45.7 } } do
		box(folder, `SlidePost{index}`, corner[1], 0.12, corner[2], corner[1] + 0.3, 6.8, corner[2] + 0.3, RUST, M.CorrodedMetal)
	end
	box(folder, "SlidePlatform", 86, 6.8, 42, 89, 7.1, 46, WOOD, M.WoodPlanks)
	for index, z in { 42.4, 45.6 } do
		beam(folder, `LadderRail{index}`, Vector3.new(83.5, 0.12, z), Vector3.new(86, 7.1, z), 0.2, 0.2, RUST, M.CorrodedMetal)
	end
	for rung = 1, 5 do
		local t = rung / 6
		box(folder, `LadderRung{rung}`, 83.5 + 2.5 * t - 0.1, 0.12 + 7 * t - 0.1, 42.5, 83.5 + 2.5 * t + 0.1, 0.12 + 7 * t + 0.1, 45.5, RUST, M.CorrodedMetal)
	end
	beam(folder, "SlideChute", Vector3.new(89, 7, 44), Vector3.new(99, 0.6, 44), 2.4, 0.15, Color3.fromRGB(170, 170, 160), M.Metal)
	beam(folder, "SlideRailA", Vector3.new(89, 7.5, 42.75), Vector3.new(99, 1.1, 42.75), 0.15, 0.4, RUST, M.CorrodedMetal)
	beam(folder, "SlideRailB", Vector3.new(89, 7.5, 45.25), Vector3.new(99, 1.1, 45.25), 0.15, 0.4, RUST, M.CorrodedMetal)
	-- Sandbox.
	box(folder, "Sand", 101, 0.12, 61, 109, 0.5, 69, SAND, M.Sand)
	box(folder, "SandboxNorth", 100, 0.12, 60, 110, 1, 61, WOOD, M.Wood)
	box(folder, "SandboxSouth", 100, 0.12, 69, 110, 1, 70, WOOD, M.Wood)
	box(folder, "SandboxWest", 100, 0.12, 61, 101, 1, 69, WOOD, M.Wood)
	box(folder, "SandboxEast", 109, 0.12, 61, 110, 1, 69, WOOD, M.Wood)
	weeds(folder, "Weed", 18, 30, 24, 115, 88, 0.12)
	deadTree(folder, "Tree1", 112, 30, 18)
end

--- Back lot: dumpster with trash bags, tall weeds, a pile of dumped desks and dead trees.
local function buildBackLot(sections: Instance): ()
	local folder = newSection(sections, "BackLot", "Behind the school: a dumpster, trash bags, tall weeds and old desks dumped in a pile.")
	box(folder, "Dumpster", -10, 0, -72, 0, 5, -66, DUMPSTER, M.CorrodedMetal)
	piece(folder, "DumpsterLid", frame(-5, 5, -72, 0, -40), -5, 0, 0, 5, 0.2, 6.2, DUMPSTER, M.CorrodedMetal)
	for index = 1, 5 do
		local f = frame(between(-14, 4), 0.9, between(-78, -74), between(0, 360), between(-15, 15))
		piece(folder, `TrashBag{index}`, f, -1, -0.9, -0.9, 1, 0.9, 0.9, BLACK, M.Plastic)
	end
	for index = 1, 6 do
		local x, z = 42 + between(-5, 5), -80 + between(-5, 5)
		if index % 2 == 0 then
			desk(folder, `OldDesk{index}`, frame(x, 1, z, between(0, 360), 0, 90))
		else
			chair(folder, `OldChair{index}`, frame(x, 0.8, z, between(0, 360), 90))
		end
	end
	weeds(folder, "Weed", 40, -125, -95, 125, -64, 0)
	deadTree(folder, "Tree1", -115, -82, 19)
	deadTree(folder, "Tree2", 108, -78, 16)
	box(folder, "DirtPatch", -30, 0, -90, 20, 0.1, -64, DIRT, M.Ground)
end

--- Spawn point just inside the gate, on the walkway.
local function buildSpawn(model: Instance): ()
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "SpawnLocation"
	spawn.Size = Vector3.new(6, 1, 6)
	spawn.CFrame = CFrame.new(-38.5, BASE + 0.5, 80)
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
	buildLobby(sections)
	buildOffice(sections)
	buildHallway(sections)
	buildClassroom(sections, "ClassroomA", "Classroom A: desks still in rows and the last lesson left on the chalkboard.", -78, -50, 0.25, true, nil)
	local classroomB = buildClassroom(sections, "ClassroomB", "Classroom B: desks knocked over below a smashed window.", -49, -20, 0.6, false, nil)
	shards(classroomB, "Glass", -34.5, -57, 7)
	local classroomC = buildClassroom(sections, "ClassroomC", "Classroom C: the ceiling has caved in, with rubble and overturned desks below.", -19, 10, 0.9, false, { -6, 0, -50, -44 })
	rubble(classroomC, "Rubble", -3, -47, 3.5, 16)
	hangingLight(classroomC, "LooseLight", 2, -40)
	shards(classroomC, "Glass", -12.5, -57, 6)
	shards(classroomC, "Glass", 3.5, -57, 5)
	local classroomD = buildClassroom(sections, "ClassroomD", "Classroom D: scattered chairs, a bookshelf and a smashed window.", 11, 38, 0.5, true, nil)
	shards(classroomD, "Glass", 25.5, -57, 6)
	buildToilets(sections)
	buildCafeteria(sections)
	buildGym(sections)
	buildPlayground(sections)
	buildBackLot(sections)
	if APPLY_LIGHTING then
		buildLighting(model)
	end

	local partCount = 0
	for _, descendant in model:GetDescendants() do
		if descendant:IsA("BasePart") then
			partCount += 1
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
