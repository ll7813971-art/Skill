--[[
	CACHARRO OXIDADO · coche funcional creado 100 % por código (Roblox Studio / Luau)

	Uso:
	  1. Abre un Baseplate vacío.
	  2. En ServerScriptService (o en Workspace) inserta un Script (NO LocalScript) y pega todo esto.
	  3. Pulsa Play. El coche aparece delante del SpawnLocation.
	  4. Acércate a la puerta del conductor y pulsa E (o siéntate tocando el asiento).

	Controles: W/S acelerar, frenar y marcha atrás · A/D girar · Espacio bajarse.
	También funciona con mando y en móvil (controles estándar de VehicleSeat).

	Incluye: suspensión con muelles, dirección, tracción trasera, frenos, faro que
	parpadea, luces de freno, humo del escape, tirones y petardazos del motor,
	velocímetro, asiento de copiloto, se endereza solo si vuelca y reaparece si se
	cae del mapa.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local PhysicsService = game:GetService("PhysicsService")

--------------------------------------------------------------------------
-- AJUSTES
--------------------------------------------------------------------------
local CONFIG = {
	MAX_SPEED = 60, -- velocidad máxima hacia delante (studs/s; en pantalla ≈ km/h)
	REVERSE_SPEED = 20, -- velocidad máxima marcha atrás
	ACCELERATION = 30, -- studs/s²
	BRAKE_DECEL = 65, -- frenada
	COAST_DECEL = 5, -- freno motor al soltar el gas
	MAX_STEER = 32, -- grados de giro de las ruedas delanteras
	STEER_SPEED = 3.5, -- rapidez del volante (rad/s)
	SUSPENSION_SAG = 0.5, -- cuánto se hunde el coche en reposo (studs)
	SUSPENSION_TRAVEL = 0.6, -- recorrido de la suspensión hacia arriba y hacia abajo
	DAMPING_RATIO = 0.4, -- amortiguación: más bajo = más rebote
	TIRE_FRICTION = 1.1,
	SPUTTER_CHANCE = 0.12, -- tirones del motor por segundo acelerando (0 = nunca)
	SPAWN_OFFSET = Vector3.new(0, 0, -24), -- posición respecto al SpawnLocation
	SPAWN_YAW = 90, -- orientación en grados
	RESPAWN_DELAY = 3, -- segundos para reaparecer si se cae del mapa
	ENGINE_SOUND_ID = "", -- opcional: "rbxassetid://..." de un sonido de motor en bucle
	SEED = 1987, -- cambia el número para otra distribución del óxido
}

-- Medidas (coordenadas del coche: suelo en Y = 0, el morro mira hacia -Z)
local WHEEL_RADIUS = 1.4
local WHEEL_WIDTH = 1.1
local TRACK = 3 -- distancia del centro a cada rueda (eje X)
local AXLE_FRONT = -4.4
local AXLE_REAR = 4.4
local CHASSIS_Y = 1.7
local SPRING_LENGTH = 2
local SPAWN_LIFT = 1.2 -- nace en el aire para calibrar con las ruedas colgando
local DRIVER_MASS = 15
local GLASS_RISE, GLASS_RUN = 2.4, 1.2 -- inclinación del parabrisas y de la luneta
local GLASS_LENGTH = math.sqrt(GLASS_RISE ^ 2 + GLASS_RUN ^ 2)
local GLASS_TILT = math.atan2(GLASS_RUN, GLASS_RISE)

local BODY_GROUP = "RustyCarBody"
local WHEEL_GROUP = "RustyCarWheels"

-- Colores
local PAINT = Color3.fromRGB(78, 112, 120)
local PAINT_FADED = Color3.fromRGB(106, 134, 136)
local PRIMER = Color3.fromRGB(128, 124, 116)
local RUST = {
	Color3.fromRGB(122, 60, 28),
	Color3.fromRGB(150, 78, 34),
	Color3.fromRGB(98, 48, 26),
	Color3.fromRGB(170, 98, 48),
}
local HOLE = Color3.fromRGB(28, 20, 16)
local DARK_METAL = Color3.fromRGB(45, 40, 36)
local CHROME_RUST = Color3.fromRGB(125, 108, 88)
local TIRE_COLOR = Color3.fromRGB(28, 28, 28)
local GLASS_COLOR = Color3.fromRGB(150, 165, 150)
local SEAT_COLOR = Color3.fromRGB(110, 80, 55)
local HEADLIGHT_ON = Color3.fromRGB(255, 226, 160)
local HEADLIGHT_OFF = Color3.fromRGB(170, 160, 130)
local TAIL_OFF = Color3.fromRGB(90, 14, 14)
local TAIL_DIM = Color3.fromRGB(160, 28, 22)
local TAIL_BRAKE = Color3.fromRGB(255, 45, 30)

--------------------------------------------------------------------------
-- UTILIDADES
--------------------------------------------------------------------------
local function newPart(props)
	local part = Instance.new(props.ClassName or "Part")
	if props.Shape then
		part.Shape = props.Shape
	end
	part.Anchored = false
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Material = Enum.Material.CorrodedMetal
	part.CollisionGroup = BODY_GROUP
	for key, value in pairs(props) do
		if key ~= "ClassName" and key ~= "Shape" and key ~= "Parent" then
			part[key] = value
		end
	end
	part.Parent = props.Parent
	return part
end

local function weld(part0, part1)
	local w = Instance.new("WeldConstraint")
	w.Part0 = part0
	w.Part1 = part1
	w.Parent = part1
	return w
end

local function attachment(parent, name, cframe)
	local a = Instance.new("Attachment")
	a.Name = name
	a.CFrame = cframe
	a.Parent = parent
	return a
end

local function setIfChanged(object, property, value)
	if object[property] ~= value then
		object[property] = value
	end
end

local function flat(vector)
	local v = Vector3.new(vector.X, 0, vector.Z)
	return if v.Magnitude > 0.05 then v.Unit else Vector3.new(0, 0, -1)
end

local function setupCollisionGroups()
	for _, name in ipairs({ BODY_GROUP, WHEEL_GROUP }) do
		if not PhysicsService:IsCollisionGroupRegistered(name) then
			PhysicsService:RegisterCollisionGroup(name)
		end
	end
	-- las ruedas atraviesan la carrocería (así pueden girar y subir dentro de los pasos de rueda)
	PhysicsService:CollisionGroupSetCollidable(BODY_GROUP, WHEEL_GROUP, false)
end

--------------------------------------------------------------------------
-- CONSTRUCCIÓN DEL COCHE
--------------------------------------------------------------------------
local function buildCar(origin)
	local rng = Random.new(CONFIG.SEED)
	local model = Instance.new("Model")
	model.Name = "RustyCar"

	local chassis = newPart({
		Name = "Chassis",
		Size = Vector3.new(4.4, 0.6, 12.4),
		CFrame = origin * CFrame.new(0, CHASSIS_Y, 0),
		Color = RUST[3],
		Anchored = true, -- se suelta después de calibrar
		CustomPhysicalProperties = PhysicalProperties.new(3, 0.3, 0, 1, 1),
		Parent = model,
	})
	model.PrimaryPart = chassis

	-- Pieza de carrocería soldada al chasis. cf va en coordenadas del coche.
	-- Sin masa: todo el peso queda abajo, en el chasis, y el coche no vuelca.
	local function body(name, size, cf, color, material, extra)
		local props = {
			Name = name,
			Size = size,
			CFrame = origin * cf,
			Color = color,
			Material = material or Enum.Material.CorrodedMetal,
			Massless = true,
			Parent = model,
		}
		for key, value in pairs(extra or {}) do
			props[key] = value
		end
		local part = newPart(props)
		weld(chassis, part)
		return part
	end

	-- Igual, pero decorativa: no choca con nada.
	local function detail(name, size, cf, color, material, extra)
		extra = extra or {}
		extra.CanCollide = false
		extra.CanTouch = false
		extra.CanQuery = false
		return body(name, size, cf, color, material, extra)
	end

	-- Posición relativa a otra pieza, pasada a coordenadas del coche.
	local function on(part, offset)
		return origin:ToObjectSpace(part.CFrame * offset)
	end

	-- Manchas de óxido y agujeros sobre una cara de una pieza.
	-- axis: eje local de la cara ("X", "Y" o "Z"); sign: 1 o -1.
	local function rust(target, axis, sign, count)
		local s = target.Size
		for _ = 1, count do
			local hole = rng:NextNumber() < 0.15
			local a = rng:NextNumber(0.3, if hole then 0.45 else 1.4)
			local b = rng:NextNumber(0.3, if hole then 0.35 else 1)
			local size, offset
			if axis == "Y" then
				a, b = math.min(a, s.X * 0.8), math.min(b, s.Z * 0.8)
				size = Vector3.new(a, 0.04, b)
				offset = Vector3.new(rng:NextNumber(-1, 1) * (s.X - a) / 2, sign * (s.Y / 2 + 0.01), rng:NextNumber(-1, 1) * (s.Z - b) / 2)
			elseif axis == "X" then
				a, b = math.min(a, s.Z * 0.8), math.min(b, s.Y * 0.8)
				size = Vector3.new(0.04, b, a)
				offset = Vector3.new(sign * (s.X / 2 + 0.01), rng:NextNumber(-1, 1) * (s.Y - b) / 2, rng:NextNumber(-1, 1) * (s.Z - a) / 2)
			else
				a, b = math.min(a, s.X * 0.8), math.min(b, s.Y * 0.8)
				size = Vector3.new(a, b, 0.04)
				offset = Vector3.new(rng:NextNumber(-1, 1) * (s.X - a) / 2, rng:NextNumber(-1, 1) * (s.Y - b) / 2, sign * (s.Z / 2 + 0.01))
			end
			local patch = newPart({
				Name = if hole then "RustHole" else "Rust",
				Size = size,
				CFrame = target.CFrame * CFrame.new(offset),
				Color = if hole then HOLE else RUST[rng:NextInteger(1, #RUST)],
				Material = if hole then Enum.Material.Slate else Enum.Material.CorrodedMetal,
				CanCollide = false,
				CanTouch = false,
				CanQuery = false,
				CastShadow = false,
				Massless = true,
				Parent = model,
			})
			weld(chassis, patch)
		end
	end

	-- Suelo, motor, maletero y paneles grandes
	body("Floor", Vector3.new(6.4, 0.2, 5.6), CFrame.new(0, 2.1, 0), RUST[3])
	body("Firewall", Vector3.new(6, 1.2, 0.2), CFrame.new(0, 2.8, -2.8), DARK_METAL)
	body("EngineBlock", Vector3.new(3.2, 1.2, 3.2), CFrame.new(0, 2.7, -4.4), DARK_METAL, Enum.Material.DiamondPlate)
	body("TrunkTub", Vector3.new(3.2, 1.2, 3.2), CFrame.new(0, 2.7, 4.4), RUST[3])
	local frontPanel = body("FrontPanel", Vector3.new(6.4, 1.3, 0.9), CFrame.new(0, 2.75, -6.45), PAINT)
	local rearPanel = body("RearPanel", Vector3.new(6.4, 1.3, 1), CFrame.new(0, 2.75, 6.4), PAINT)
	-- capó mal cerrado: el borde delantero queda levantado
	local hood = body("Hood", Vector3.new(6.4, 0.25, 4.2), CFrame.new(0, 3.5, -4.8) * CFrame.Angles(math.rad(3), 0, 0), PAINT)
	local trunk = body("Trunk", Vector3.new(6.4, 0.25, 3.3), CFrame.new(0, 3.5, 5.25), PAINT_FADED)
	local roof = body("Roof", Vector3.new(6.2, 0.25, 3.9), CFrame.new(0, 6.1, 0.45), PAINT)
	body("Dashboard", Vector3.new(6, 0.7, 0.8), CFrame.new(0, 3.5, -2.4), Color3.fromRGB(60, 45, 35), Enum.Material.SmoothPlastic)

	-- Parabrisas rajado y luneta
	local windshield = body("Windshield", Vector3.new(5.9, GLASS_LENGTH, 0.12), CFrame.new(0, 4.8, -2.1) * CFrame.Angles(GLASS_TILT, 0, 0), GLASS_COLOR, Enum.Material.Glass, { Transparency = 0.55 })
	body("RearWindow", Vector3.new(5.9, GLASS_LENGTH, 0.12), CFrame.new(0, 4.8, 3) * CFrame.Angles(-GLASS_TILT, 0, 0), GLASS_COLOR, Enum.Material.Glass, { Transparency = 0.6 })
	for _ = 1, 6 do
		local length = rng:NextNumber(0.4, 1)
		local crack = CFrame.new(1.4, 0.2, -0.07) * CFrame.Angles(0, 0, rng:NextNumber(0, math.pi * 2)) * CFrame.new(length / 2, 0, 0)
		detail("Crack", Vector3.new(length, 0.035, 0.02), on(windshield, crack), Color3.fromRGB(235, 240, 235), Enum.Material.SmoothPlastic)
	end

	-- Laterales (izquierda = conductor)
	for _, side in ipairs({ -1, 1 }) do
		local isDriver = side < 0
		local rocker = body("Rocker", Vector3.new(0.3, 0.45, 5.6), CFrame.new(side * 3.15, 1.95, 0), RUST[1])
		-- la puerta del conductor es de desguace: sin pintar, solo imprimación
		local door = body(if isDriver then "DriverDoor" else "PassengerDoor", Vector3.new(0.25, 1.35, 3.4), CFrame.new(side * 3.2, 2.85, -1.1),
			if isDriver then PRIMER else PAINT, if isDriver then Enum.Material.SmoothPlastic else Enum.Material.CorrodedMetal)
		local quarter = body("RearQuarter", Vector3.new(0.25, 1.35, 2.2), CFrame.new(side * 3.2, 2.85, 1.7), PAINT)
		local fenderFront = body("FenderFront", Vector3.new(0.45, 0.22, 3), CFrame.new(side * 3.25, 3.45, AXLE_FRONT), PAINT)
		local fenderRear = body("FenderRear", Vector3.new(0.45, 0.22, 3), CFrame.new(side * 3.25, 3.45, AXLE_REAR), PAINT_FADED)
		body("PillarA", Vector3.new(0.22, GLASS_LENGTH, 0.22), CFrame.new(side * 3.05, 4.8, -2.1) * CFrame.Angles(GLASS_TILT, 0, 0), PAINT)
		body("PillarB", Vector3.new(0.2, 2.5, 0.25), CFrame.new(side * 3.15, 4.75, 0.6), PAINT)
		body("PillarC", Vector3.new(0.22, GLASS_LENGTH, 0.22), CFrame.new(side * 3.05, 4.8, 3) * CFrame.Angles(-GLASS_TILT, 0, 0), PAINT)
		detail("DoorHandle", Vector3.new(0.08, 0.14, 0.5), CFrame.new(side * 3.36, 3.25, -0.2), DARK_METAL, Enum.Material.Metal)
		detail("DoorSeam", Vector3.new(0.03, 1.3, 0.05), CFrame.new(side * 3.33, 2.85, 0.6), HOLE, Enum.Material.SmoothPlastic)

		-- ventanillas traseras: cristal a la derecha, cartón con cinta a la izquierda
		body("RearQuarterGlass", Vector3.new(0.08, 2.4, 1.2), CFrame.new(side * 3.15, 4.8, 3) * CFrame.Angles(0, math.pi, 0), GLASS_COLOR, Enum.Material.Glass, { ClassName = "WedgePart", Transparency = 0.55 })
		if isDriver then
			body("Cardboard", Vector3.new(0.08, 2.4, 1.8), CFrame.new(side * 3.15, 4.8, 1.5), Color3.fromRGB(168, 136, 92), Enum.Material.SmoothPlastic)
			detail("Tape", Vector3.new(0.1, 0.14, 2.1), CFrame.new(side * 3.2, 5.5, 1.5) * CFrame.Angles(math.rad(18), 0, 0), Color3.fromRGB(200, 200, 190), Enum.Material.SmoothPlastic)
			detail("Tape", Vector3.new(0.1, 0.14, 2.1), CFrame.new(side * 3.2, 4.1, 1.5) * CFrame.Angles(math.rad(-14), 0, 0), Color3.fromRGB(200, 200, 190), Enum.Material.SmoothPlastic)
		else
			body("RearSideGlass", Vector3.new(0.08, 2.4, 1.8), CFrame.new(side * 3.15, 4.8, 1.5), GLASS_COLOR, Enum.Material.Glass, { Transparency = 0.55 })
		end

		-- ventanillas delanteras: la del conductor está rota y quedan trozos
		if isDriver then
			detail("GlassShard", Vector3.new(0.06, 0.45, 0.4), CFrame.new(side * 3.15, 3.82, -0.9), GLASS_COLOR, Enum.Material.Glass, { ClassName = "WedgePart", Transparency = 0.4 })
			detail("GlassShard", Vector3.new(0.06, 0.3, 0.6), CFrame.new(side * 3.15, 3.75, 0.1) * CFrame.Angles(0, math.pi, 0), GLASS_COLOR, Enum.Material.Glass, { ClassName = "WedgePart", Transparency = 0.4 })
		else
			body("FrontQuarterGlass", Vector3.new(0.08, 2.4, 1.2), CFrame.new(side * 3.15, 4.8, -2.1), GLASS_COLOR, Enum.Material.Glass, { ClassName = "WedgePart", Transparency = 0.55 })
			body("SideGlass", Vector3.new(0.08, 2.4, 2.1), CFrame.new(side * 3.15, 4.8, -0.45), GLASS_COLOR, Enum.Material.Glass, { Transparency = 0.55 })
		end

		rust(door, "X", side, if isDriver then 2 else 4)
		rust(quarter, "X", side, 3)
		rust(rocker, "X", side, 2)
		rust(fenderFront, "Y", 1, 1)
		rust(fenderRear, "Y", 1, 2)
	end

	-- Interior
	local driveSeat = body("DriverSeat", Vector3.new(1.8, 0.4, 1.8), CFrame.new(-1.3, 2.45, 0.4), SEAT_COLOR, Enum.Material.Fabric, {
		ClassName = "VehicleSeat",
		MaxSpeed = CONFIG.MAX_SPEED,
		HeadsUpDisplay = false,
	})
	local passengerSeat = body("PassengerSeat", Vector3.new(1.8, 0.4, 1.8), CFrame.new(1.3, 2.45, 0.4), SEAT_COLOR, Enum.Material.Fabric, { ClassName = "Seat" })
	local backrest = body("Backrest", Vector3.new(5.6, 2, 0.4), CFrame.new(0, 3.55, 1.45) * CFrame.Angles(math.rad(10), 0, 0), Color3.fromRGB(100, 72, 50), Enum.Material.Fabric)
	detail("TornFoam", Vector3.new(0.9, 0.6, 0.05), on(backrest, CFrame.new(-1.2, 0.3, -0.21)), Color3.fromRGB(214, 190, 120), Enum.Material.Fabric)
	detail("SteeringColumn", Vector3.new(0.15, 0.15, 1.1), CFrame.new(-1.3, 3.72, -1.95) * CFrame.Angles(math.rad(-25), 0, 0), DARK_METAL, Enum.Material.Metal)
	detail("SteeringWheel", Vector3.new(0.12, 1.3, 1.3), CFrame.new(-1.3, 3.95, -1.45) * CFrame.Angles(math.rad(-25), 0, 0) * CFrame.Angles(0, math.pi / 2, 0),
		Color3.fromRGB(35, 30, 28), Enum.Material.SmoothPlastic, { Shape = Enum.PartType.Cylinder })

	-- Frontal: rejilla, faros (uno funciona y parpadea, el otro está roto) y parachoques descolgado
	body("Grille", Vector3.new(3, 0.8, 0.08), CFrame.new(0, 2.85, -6.93), DARK_METAL, Enum.Material.Metal)
	for i = -1, 1 do
		detail("GrilleBar", Vector3.new(3, 0.08, 0.06), CFrame.new(0, 2.85 + i * 0.25, -6.99), CHROME_RUST, Enum.Material.Metal)
	end
	local headlightHousing = body("HeadlightHousing", Vector3.new(1.1, 0.9, 0.12), CFrame.new(-2.35, 2.95, -6.94), DARK_METAL, Enum.Material.Metal)
	body("HeadlightHousing", Vector3.new(1.1, 0.9, 0.12), CFrame.new(2.35, 2.95, -6.94), DARK_METAL, Enum.Material.Metal)
	local headLens = detail("Headlight", Vector3.new(0.12, 0.75, 0.75), CFrame.new(-2.35, 2.95, -7) * CFrame.Angles(0, math.pi / 2, 0),
		HEADLIGHT_OFF, Enum.Material.Glass, { Shape = Enum.PartType.Cylinder })
	detail("BrokenHeadlight", Vector3.new(0.12, 0.75, 0.75), CFrame.new(2.35, 2.95, -7) * CFrame.Angles(0, math.pi / 2, 0),
		Color3.fromRGB(55, 55, 50), Enum.Material.Glass, { Shape = Enum.PartType.Cylinder, Transparency = 0.25 })
	detail("TurnSignal", Vector3.new(0.5, 0.22, 0.1), CFrame.new(-2.35, 2.35, -6.95), Color3.fromRGB(210, 120, 40), Enum.Material.SmoothPlastic)
	local headLight = Instance.new("SpotLight")
	headLight.Face = Enum.NormalId.Front
	headLight.Color = HEADLIGHT_ON
	headLight.Brightness = 3
	headLight.Range = 45
	headLight.Angle = 60
	headLight.Shadows = true
	headLight.Enabled = false
	headLight.Parent = headlightHousing
	local frontBumper = body("FrontBumper", Vector3.new(7, 0.42, 0.45), CFrame.new(0, 2, -7.15) * CFrame.Angles(0, math.rad(2), math.rad(4)), CHROME_RUST)

	-- Trasera: pilotos, matrícula, parachoques y escape
	local rearBumper = body("RearBumper", Vector3.new(7, 0.42, 0.45), CFrame.new(0, 2, 7.15) * CFrame.Angles(0, 0, math.rad(-3)), CHROME_RUST)
	local tailLights = {
		detail("Taillight", Vector3.new(0.9, 0.45, 0.1), CFrame.new(-2.4, 3, 6.94), TAIL_OFF, Enum.Material.Neon),
		detail("Taillight", Vector3.new(0.9, 0.45, 0.1), CFrame.new(2.4, 3, 6.94), TAIL_OFF, Enum.Material.Neon),
	}
	local plate = detail("Plate", Vector3.new(1.6, 0.55, 0.06), CFrame.new(0, 2.75, 6.93), Color3.fromRGB(205, 195, 160), Enum.Material.SmoothPlastic)
	local plateGui = Instance.new("SurfaceGui")
	plateGui.Face = Enum.NormalId.Back
	plateGui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	plateGui.PixelsPerStud = 100
	plateGui.Parent = plate
	local plateText = Instance.new("TextLabel")
	plateText.Size = UDim2.fromScale(1, 1)
	plateText.BackgroundTransparency = 1
	plateText.Font = Enum.Font.GothamBold
	plateText.TextScaled = true
	plateText.TextColor3 = Color3.fromRGB(40, 30, 25)
	plateText.Text = "OX-1D0"
	plateText.Parent = plateGui
	detail("Exhaust", Vector3.new(1.5, 0.3, 0.3), CFrame.new(1.6, 1.45, 6.6) * CFrame.Angles(0, math.pi / 2, 0),
		Color3.fromRGB(90, 60, 40), Enum.Material.CorrodedMetal, { Shape = Enum.PartType.Cylinder })
	local exhaustTip = detail("ExhaustTip", Vector3.new(0.2, 0.2, 0.2), CFrame.new(1.6, 1.45, 7.4), HOLE, Enum.Material.SmoothPlastic, { Transparency = 1 })
	local smoke = Instance.new("Smoke")
	smoke.Color = Color3.fromRGB(70, 70, 70)
	smoke.Opacity = 0.1
	smoke.RiseVelocity = 2
	smoke.Size = 0.6
	smoke.Enabled = false
	smoke.Parent = exhaustTip
	local backfireLight = Instance.new("PointLight")
	backfireLight.Color = Color3.fromRGB(255, 140, 40)
	backfireLight.Range = 10
	backfireLight.Brightness = 5
	backfireLight.Enabled = false
	backfireLight.Parent = exhaustTip

	-- Baca con rueda de repuesto, retrovisor superviviente y antena doblada
	for _, side in ipairs({ -1, 1 }) do
		detail("RoofRail", Vector3.new(0.15, 0.15, 3.4), CFrame.new(side * 2.6, 6.33, 0.45), DARK_METAL, Enum.Material.Metal)
	end
	for _, z in ipairs({ -0.8, 1.7 }) do
		detail("RoofBar", Vector3.new(5.4, 0.12, 0.15), CFrame.new(0, 6.42, z), RUST[1])
	end
	detail("SpareTire", Vector3.new(0.7, 2.4, 2.4), CFrame.new(0.4, 6.83, 0.5) * CFrame.Angles(0, 0, math.pi / 2), TIRE_COLOR, Enum.Material.SmoothPlastic, { Shape = Enum.PartType.Cylinder })
	detail("SpareRim", Vector3.new(0.74, 1.3, 1.3), CFrame.new(0.4, 6.83, 0.5) * CFrame.Angles(0, 0, math.pi / 2), RUST[2], Enum.Material.CorrodedMetal, { Shape = Enum.PartType.Cylinder })
	detail("MirrorArm", Vector3.new(0.35, 0.08, 0.08), CFrame.new(-3.35, 3.95, -2.3), DARK_METAL, Enum.Material.Metal)
	detail("Mirror", Vector3.new(0.12, 0.38, 0.55), CFrame.new(-3.55, 4, -2.3), PAINT)
	detail("Antenna", Vector3.new(0.05, 2.2, 0.05), CFrame.new(2.9, 4.6, -2.9) * CFrame.Angles(0, 0, math.rad(-18)), DARK_METAL, Enum.Material.Metal)

	rust(hood, "Y", 1, 7)
	rust(trunk, "Y", 1, 5)
	rust(roof, "Y", 1, 5)
	rust(frontPanel, "Z", -1, 3)
	rust(rearPanel, "Z", 1, 3)
	rust(frontBumper, "Z", -1, 3)
	rust(rearBumper, "Z", 1, 2)

	-- Ruedas: chasis -(suspensión + dirección)-> mangueta -(motor)-> rueda
	local wheels = {}
	local UP_AXIS = CFrame.fromMatrix(Vector3.zero, Vector3.yAxis, Vector3.xAxis) -- eje principal hacia arriba
	local LEFT_AXIS = CFrame.fromMatrix(Vector3.zero, -Vector3.xAxis, Vector3.yAxis) -- eje principal hacia la izquierda

	local function makeWheel(name, x, z, isFront, rimColor)
		local center = origin * CFrame.new(x, WHEEL_RADIUS, z)
		local tire = newPart({
			Name = name,
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(WHEEL_WIDTH, WHEEL_RADIUS * 2, WHEEL_RADIUS * 2),
			CFrame = center,
			Color = TIRE_COLOR,
			Material = Enum.Material.SmoothPlastic,
			CollisionGroup = WHEEL_GROUP,
			CustomPhysicalProperties = PhysicalProperties.new(1.5, CONFIG.TIRE_FRICTION, 0.05, 100, 1),
			Parent = model,
		})
		local function wheelPart(partName, size, color, shape, material)
			weld(tire, newPart({
				Name = partName,
				Shape = shape,
				Size = size,
				CFrame = center,
				Color = color,
				Material = material or Enum.Material.CorrodedMetal,
				CanCollide = false,
				CanTouch = false,
				CanQuery = false,
				Massless = true,
				Parent = model,
			}))
		end
		wheelPart("Rim", Vector3.new(WHEEL_WIDTH + 0.06, 1.7, 1.7), rimColor, Enum.PartType.Cylinder)
		wheelPart("Hub", Vector3.new(WHEEL_WIDTH + 0.14, 0.55, 0.55), DARK_METAL, Enum.PartType.Cylinder, Enum.Material.Metal)
		-- radios en cruz para que se vea girar la rueda
		wheelPart("Spoke", Vector3.new(WHEEL_WIDTH + 0.1, 0.22, 1.5), DARK_METAL)
		wheelPart("Spoke", Vector3.new(WHEEL_WIDTH + 0.1, 1.5, 0.22), DARK_METAL)

		local knuckle = newPart({
			Name = name .. "Knuckle",
			Size = Vector3.new(0.8, 0.8, 0.8),
			CFrame = center,
			Transparency = 1,
			CanCollide = false,
			CanTouch = false,
			CanQuery = false,
			CustomPhysicalProperties = PhysicalProperties.new(10, 0.3, 0, 1, 1),
			Parent = model,
		})

		local localCenter = chassis.CFrame:ToObjectSpace(center)
		local mount = attachment(chassis, name .. "Mount", localCenter * UP_AXIS)
		local springTop = attachment(chassis, name .. "SpringTop", (localCenter + Vector3.new(0, SPRING_LENGTH, 0)) * UP_AXIS)
		local knuckleUp = attachment(knuckle, "Suspension", UP_AXIS)

		-- delante: cilíndrica (sube/baja y gira para la dirección); detrás: prismática (solo sube/baja)
		local slide
		if isFront then
			slide = Instance.new("CylindricalConstraint")
			slide.AngularActuatorType = Enum.ActuatorType.Servo
			slide.AngularSpeed = CONFIG.STEER_SPEED
			slide.AngularLimitsEnabled = true
			slide.LowerAngle = -45
			slide.UpperAngle = 45
		else
			slide = Instance.new("PrismaticConstraint")
		end
		slide.Name = "SuspensionSlide"
		slide.LimitsEnabled = true
		slide.LowerLimit = -CONFIG.SUSPENSION_TRAVEL
		slide.UpperLimit = CONFIG.SUSPENSION_TRAVEL
		slide.Attachment0 = mount
		slide.Attachment1 = knuckleUp
		slide.Parent = knuckle

		local spring = Instance.new("SpringConstraint")
		spring.Name = "Spring"
		spring.Attachment0 = springTop
		spring.Attachment1 = knuckleUp
		spring.Visible = true
		spring.Coils = 7
		spring.Radius = 0.32
		spring.Thickness = 0.1
		spring.Color = BrickColor.new("Rust")
		spring.Parent = knuckle

		local motor = Instance.new("HingeConstraint")
		motor.Name = "Motor"
		motor.ActuatorType = Enum.ActuatorType.Motor
		motor.Attachment0 = attachment(knuckle, "Axle", LEFT_AXIS)
		motor.Attachment1 = attachment(tire, "Axle", LEFT_AXIS)
		motor.Parent = tire

		table.insert(wheels, {
			tire = tire,
			knuckle = knuckle,
			motor = motor,
			spring = spring,
			steer = if isFront then slide else nil,
			isFront = isFront,
			sign = 1, -- sentido del motor; lo confirma calibrate()
		})
	end

	makeWheel("WheelFL", -TRACK, AXLE_FRONT, true, RUST[2])
	makeWheel("WheelFR", TRACK, AXLE_FRONT, true, RUST[2])
	makeWheel("WheelRL", -TRACK, AXLE_REAR, false, Color3.fromRGB(150, 150, 145)) -- llanta de otro coche
	makeWheel("WheelRR", TRACK, AXLE_REAR, false, RUST[2])

	-- Muelles, amortiguadores y fuerzas calculados a partir de las masas reales
	local gravity = workspace.Gravity
	local sprungMass = chassis:GetMass() + DRIVER_MASS
	local wheelMass = wheels[1].tire:GetMass() + wheels[1].knuckle:GetMass()
	local totalMass = sprungMass + wheelMass * 4
	local stiffness = sprungMass * gravity / 4 / CONFIG.SUSPENSION_SAG
	local damping = CONFIG.DAMPING_RATIO * 2 * math.sqrt(stiffness * sprungMass / 4)
	for _, wheel in ipairs(wheels) do
		wheel.spring.Stiffness = stiffness
		wheel.spring.Damping = damping
		wheel.spring.FreeLength = SPRING_LENGTH + CONFIG.SUSPENSION_SAG
		if wheel.steer then
			wheel.steer.ServoMaxTorque = totalMass * gravity * WHEEL_RADIUS
		end
	end

	local engineSound
	if CONFIG.ENGINE_SOUND_ID ~= "" then
		engineSound = Instance.new("Sound")
		engineSound.Name = "Engine"
		engineSound.SoundId = CONFIG.ENGINE_SOUND_ID
		engineSound.Looped = true
		engineSound.Volume = 0.6
		engineSound.RollOffMaxDistance = 120
		engineSound.Parent = chassis
	end

	model.Parent = workspace

	return {
		model = model,
		chassis = chassis,
		wheels = wheels,
		driveSeat = driveSeat,
		passengerSeat = passengerSeat,
		driverPrompt = attachment(chassis, "DriverPrompt", CFrame.new(-3.8, 1.3, -0.4)),
		passengerPrompt = attachment(chassis, "PassengerPrompt", CFrame.new(3.8, 1.3, -0.4)),
		headLight = headLight,
		headLens = headLens,
		tailLights = tailLights,
		smoke = smoke,
		backfireLight = backfireLight,
		engineSound = engineSound,
		driveTorque = totalMass * CONFIG.ACCELERATION * WHEEL_RADIUS / 2, -- 2 ruedas motrices
		brakeTorque = totalMass * CONFIG.BRAKE_DECEL * WHEEL_RADIUS / 4,
		coastTorque = totalMass * CONFIG.COAST_DECEL * WHEEL_RADIUS / 4,
		steerSign = -1, -- sentido de la dirección; lo confirma calibrate()
		rng = rng,
	}
end

--------------------------------------------------------------------------
-- CALIBRACIÓN
-- Con el chasis anclado y las ruedas colgando, mueve un momento motores y
-- dirección y mide hacia dónde giran de verdad. Así W siempre es adelante y
-- D siempre es derecha, sin depender del convenio de signos de las restricciones.
--------------------------------------------------------------------------
local function calibrate(car)
	for _, wheel in ipairs(car.wheels) do
		pcall(function()
			wheel.tire:SetNetworkOwner(nil)
			wheel.knuckle:SetNetworkOwner(nil)
		end)
		wheel.motor.MotorMaxTorque = car.brakeTorque
		wheel.motor.AngularVelocity = 10
	end
	task.wait(0.4)

	local left = -car.chassis.CFrame.RightVector
	for _, wheel in ipairs(car.wheels) do
		local spin = wheel.tire.AssemblyAngularVelocity:Dot(left)
		if math.abs(spin) > 2 then
			wheel.sign = if spin > 0 then 1 else -1
		end
		wheel.motor.AngularVelocity = 0
	end

	local front = {}
	for _, wheel in ipairs(car.wheels) do
		if wheel.steer then
			wheel.steer.TargetAngle = 25
			table.insert(front, wheel)
		end
	end
	task.wait(0.4)
	local turned = car.chassis.CFrame:VectorToObjectSpace(front[1].knuckle.CFrame.LookVector).X
	if math.abs(turned) > 0.15 then
		car.steerSign = if turned > 0 then 1 else -1
	end
	for _, wheel in ipairs(front) do
		wheel.steer.TargetAngle = 0
	end
	task.wait(0.3)
end

--------------------------------------------------------------------------
-- LÓGICA DE CONDUCCIÓN
--------------------------------------------------------------------------
local spawnCar

local function runCar(car)
	local chassis, seat, rng = car.chassis, car.driveSeat, car.rng
	local connections = {}
	local alive = true
	local lightsOn = false
	local hud, hudSpeed
	local sputterUntil = 0
	local effectTimer, flipTime = 0, 0

	local physicsParts = { chassis }
	for _, wheel in ipairs(car.wheels) do
		table.insert(physicsParts, wheel.tire)
		table.insert(physicsParts, wheel.knuckle)
	end

	-- El conductor simula la física en su equipo: el coche responde sin retraso.
	local function setOwner(player)
		for _, part in ipairs(physicsParts) do
			pcall(function()
				if player then
					part:SetNetworkOwner(player)
				else
					part:SetNetworkOwnershipAuto()
				end
			end)
		end
	end

	local function setHeadlight(on)
		car.headLight.Enabled = on
		car.headLens.Material = if on then Enum.Material.Neon else Enum.Material.Glass
		car.headLens.Color = if on then HEADLIGHT_ON else HEADLIGHT_OFF
	end

	local function updateTailLights(braking)
		local color = if braking then TAIL_BRAKE elseif lightsOn then TAIL_DIM else TAIL_OFF
		for _, light in ipairs(car.tailLights) do
			setIfChanged(light, "Color", color)
		end
	end

	local function removeHud()
		if hud then
			hud:Destroy()
		end
		hud, hudSpeed = nil, nil
	end

	local function makeHud(player)
		removeHud()
		local playerGui = player:FindFirstChildOfClass("PlayerGui")
		if not playerGui then
			return
		end
		local gui = Instance.new("ScreenGui")
		gui.Name = "RustyCarHUD"
		gui.ResetOnSpawn = false

		local frame = Instance.new("Frame")
		frame.AnchorPoint = Vector2.new(1, 1)
		frame.Position = UDim2.new(1, -20, 1, -20)
		frame.Size = UDim2.fromOffset(240, 92)
		frame.BackgroundColor3 = Color3.fromRGB(45, 30, 22)
		frame.BackgroundTransparency = 0.2
		frame.Parent = gui
		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, 12)
		corner.Parent = frame
		local stroke = Instance.new("UIStroke")
		stroke.Color = RUST[4]
		stroke.Thickness = 2
		stroke.Parent = frame

		local speedLabel = Instance.new("TextLabel")
		speedLabel.BackgroundTransparency = 1
		speedLabel.Position = UDim2.fromOffset(10, 6)
		speedLabel.Size = UDim2.new(1, -20, 0, 50)
		speedLabel.Font = Enum.Font.GothamBold
		speedLabel.TextScaled = true
		speedLabel.TextColor3 = Color3.fromRGB(255, 196, 130)
		speedLabel.Text = "0 km/h"
		speedLabel.Parent = frame

		local help = Instance.new("TextLabel")
		help.BackgroundTransparency = 1
		help.Position = UDim2.fromOffset(10, 58)
		help.Size = UDim2.new(1, -20, 0, 26)
		help.Font = Enum.Font.Gotham
		help.TextScaled = true
		help.TextColor3 = Color3.fromRGB(225, 205, 185)
		help.Text = "W/S gas y freno · A/D girar · Espacio bajar"
		help.Parent = frame

		gui.Parent = playerGui
		hud, hudSpeed = gui, speedLabel
	end

	local function onDriverChanged(humanoid)
		if humanoid then
			local player = Players:GetPlayerFromCharacter(humanoid.Parent)
			if player then
				setOwner(player)
				makeHud(player)
			end
			lightsOn = true
			setHeadlight(true)
			if car.engineSound then
				car.engineSound:Play()
			end
		else
			setOwner(nil)
			removeHud()
			lightsOn = false
			setHeadlight(false)
			if car.engineSound then
				car.engineSound:Stop()
			end
		end
	end

	-- Asiento con aviso "pulsa E" junto a la puerta; al bajarse te deja fuera del coche.
	local function setupSeat(seatPart, promptAttachment, actionText, side, onChanged)
		local prompt = Instance.new("ProximityPrompt")
		prompt.ActionText = actionText
		prompt.ObjectText = "Cacharro oxidado"
		prompt.HoldDuration = 0
		prompt.MaxActivationDistance = 9
		prompt.RequiresLineOfSight = false
		prompt.Parent = promptAttachment

		table.insert(connections, prompt.Triggered:Connect(function(player)
			local character = player.Character
			local humanoid = character and character:FindFirstChildOfClass("Humanoid")
			if humanoid and humanoid.Health > 0 and not humanoid.SeatPart and not seatPart.Occupant then
				seatPart:Sit(humanoid)
			end
		end))

		local current
		table.insert(connections, seatPart:GetPropertyChangedSignal("Occupant"):Connect(function()
			local occupant = seatPart.Occupant
			local previous = current
			current = occupant
			prompt.Enabled = occupant == nil
			if onChanged then
				onChanged(occupant)
			end
			if previous and not occupant then
				task.spawn(function()
					task.wait() -- deja que se rompa la soldadura del asiento
					local character = previous.Parent
					if not (alive and character and previous.Health > 0 and not previous.SeatPart) then
						return
					end
					local position = chassis.CFrame:PointToWorldSpace(Vector3.new(side * 5.5, 0, -0.4)) + Vector3.new(0, 3, 0)
					character:PivotTo(CFrame.lookAt(position, position + flat(chassis.CFrame.LookVector)))
				end)
			end
		end))
	end

	local function backfire()
		car.backfireLight.Enabled = true
		car.smoke.Opacity = 0.7
		car.smoke.Size = 1.8
		task.delay(0.1, function()
			if alive then
				car.backfireLight.Enabled = false
			end
		end)
	end

	local function upright()
		local position = chassis.Position + Vector3.new(0, 4, 0)
		car.model:PivotTo(CFrame.lookAt(position, position + flat(chassis.CFrame.LookVector)))
		for _, part in ipairs(physicsParts) do
			part.AssemblyLinearVelocity = Vector3.zero
			part.AssemblyAngularVelocity = Vector3.zero
		end
	end

	local function destroy()
		if not alive then
			return
		end
		alive = false
		for _, connection in ipairs(connections) do
			connection:Disconnect()
		end
		removeHud()
		car.model:Destroy()
		task.delay(CONFIG.RESPAWN_DELAY, spawnCar)
	end

	setupSeat(seat, car.driverPrompt, "Conducir", -1, onDriverChanged)
	setupSeat(car.passengerSeat, car.passengerPrompt, "Subir de copiloto", 1)
	setOwner(nil)
	setHeadlight(false)
	updateTailLights(false)

	table.insert(connections, RunService.Heartbeat:Connect(function(dt)
		if not chassis:IsDescendantOf(workspace) or chassis.Position.Y < workspace.FallenPartsDestroyHeight + 50 then
			destroy()
			return
		end

		local cf = chassis.CFrame
		local velocity = chassis.AssemblyLinearVelocity
		local forwardSpeed = velocity:Dot(cf.LookVector)
		local speed = math.abs(forwardSpeed)
		local driving = seat.Occupant ~= nil
		local throttle = if driving then seat.ThrottleFloat else 0
		local steer = if driving then seat.SteerFloat else 0
		local now = os.clock()

		-- Motor y frenos (tracción trasera; frenan las cuatro ruedas)
		local braking = (throttle > 0.1 and forwardSpeed < -2) or (throttle < -0.1 and forwardSpeed > 2)
		local wheelSpeed, rearTorque, frontTorque = 0, car.coastTorque, car.coastTorque * 0.5
		if not driving or braking then
			rearTorque, frontTorque = car.brakeTorque, car.brakeTorque -- sin conductor: freno de mano
		elseif math.abs(throttle) > 0.1 then
			local topSpeed = if throttle > 0 then CONFIG.MAX_SPEED else CONFIG.REVERSE_SPEED
			wheelSpeed = throttle * topSpeed / WHEEL_RADIUS
			rearTorque, frontTorque = car.driveTorque, 0
			if now < sputterUntil then
				rearTorque *= 0.1 -- el motor tose
			elseif throttle > 0.1 and rng:NextNumber() < dt * CONFIG.SPUTTER_CHANCE then
				sputterUntil = now + rng:NextNumber(0.15, 0.35)
				backfire()
			end
		end
		for _, wheel in ipairs(car.wheels) do
			if wheel.isFront then
				setIfChanged(wheel.motor, "AngularVelocity", 0)
				setIfChanged(wheel.motor, "MotorMaxTorque", frontTorque)
			else
				setIfChanged(wheel.motor, "AngularVelocity", wheelSpeed * wheel.sign)
				setIfChanged(wheel.motor, "MotorMaxTorque", rearTorque)
			end
		end

		-- Dirección: gira menos cuanto más rápido vas
		local steerAngle = steer * CONFIG.MAX_STEER * (1 - 0.55 * math.min(speed / CONFIG.MAX_SPEED, 1)) * car.steerSign
		for _, wheel in ipairs(car.wheels) do
			if wheel.steer then
				setIfChanged(wheel.steer, "TargetAngle", steerAngle)
			end
		end

		-- Efectos, velocímetro y vuelcos (10 veces por segundo)
		effectTimer += dt
		if effectTimer < 0.1 then
			return
		end
		effectTimer = 0

		updateTailLights(driving and braking)
		local load = if not driving then 0 elseif math.abs(throttle) > 0.1 then 1 else 0.3
		setIfChanged(car.smoke, "Enabled", driving)
		if now >= sputterUntil then
			setIfChanged(car.smoke, "Opacity", 0.06 + 0.2 * load)
			setIfChanged(car.smoke, "Size", 0.5 + 0.9 * load)
		end
		if hudSpeed then
			hudSpeed.Text = string.format("%d km/h", math.floor(speed + 0.5))
		end
		if car.engineSound then
			car.engineSound.PlaybackSpeed = 0.7 + 0.9 * math.min(speed / CONFIG.MAX_SPEED, 1) + 0.15 * math.abs(throttle)
		end

		if cf.UpVector.Y < 0.3 and velocity.Magnitude < 10 then
			flipTime += 0.1
			if flipTime > 2.5 then
				flipTime = 0
				upright()
			end
		else
			flipTime = 0
		end
	end))

	-- El faro bueno hace falso contacto de vez en cuando
	task.spawn(function()
		while alive do
			task.wait(rng:NextNumber(1.5, 5))
			if alive and lightsOn then
				for _ = 1, rng:NextInteger(2, 5) do
					setHeadlight(false)
					task.wait(rng:NextNumber(0.03, 0.12))
					if not (alive and lightsOn) then
						break
					end
					setHeadlight(true)
					task.wait(rng:NextNumber(0.03, 0.15))
					if not (alive and lightsOn) then
						break
					end
				end
			end
		end
	end)
end

--------------------------------------------------------------------------
-- APARICIÓN
--------------------------------------------------------------------------
local function findSpawnCFrame()
	local spawnLocation = workspace:FindFirstChildWhichIsA("SpawnLocation", true)
	local base = if spawnLocation then spawnLocation.Position else Vector3.zero
	local position = base + CONFIG.SPAWN_OFFSET

	local ignore = {}
	for _, player in ipairs(Players:GetPlayers()) do
		if player.Character then
			table.insert(ignore, player.Character)
		end
	end
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = ignore
	local hit = workspace:Raycast(position + Vector3.new(0, 100, 0), Vector3.new(0, -1000, 0), params)
	local groundY = if hit then hit.Position.Y else 0

	return CFrame.new(position.X, groundY, position.Z) * CFrame.Angles(0, math.rad(CONFIG.SPAWN_YAW), 0)
end

spawnCar = function()
	local car = buildCar(findSpawnCFrame() * CFrame.new(0, SPAWN_LIFT, 0))
	calibrate(car)
	car.chassis.Anchored = false
	runCar(car)
end

setupCollisionGroups()
spawnCar()
