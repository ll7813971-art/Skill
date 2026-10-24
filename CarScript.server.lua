-- Carro deportivo descapotable en un solo Script (ServerScriptService)
--  * Acércate al carro y pulsa el botón "Conducir" (tecla E, clic o toque).
--  * W/S acelerar y reversa, A/D girar. Botón "Bajar" (tecla F) o Espacio para salir.
--  * Incluye faros, luces de freno, humo de escape, velocímetro y sonidos.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

-- Configuración
local SPAWN_POSITION = Vector3.new(0, 6, 0)
local MAX_SPEED = 80       -- studs/s
local TORQUE = 40000
local TURN_ANGLE = 40      -- grados máximos de giro
local TURN_ASSIST = 120    -- ayuda para girar (más = gira más rápido)
local MAX_YAW_RATE = 2.5   -- rad/s, velocidad máxima de giro del carro
local WHEEL_RADIUS = 1.5
local WHEEL_WIDTH = 1
local BODY_COLOR = Color3.fromRGB(200, 30, 30)

-- Si el carro va hacia atrás con W, cambia DRIVE_SIGN a -1.
-- Si las ruedas giran al lado contrario de la tecla, cambia STEER_SIGN a -1.
local DRIVE_SIGN = -1
local STEER_SIGN = 1

-- Sonidos. Son sonidos incluidos en Roblox y sirven de base: para un motor
-- realista reemplaza Engine por el ID de un sonido de motor (Toolbox > Audio).
-- Deja un ID vacío ("") para desactivar ese sonido.
local SOUND_IDS = {
	Engine = "rbxasset://sounds/bass.wav",
	Ignition = "rbxasset://sounds/switch.wav",
	Door = "rbxasset://sounds/button.wav",
	Crash = "rbxasset://sounds/impact_explosion_03.mp3",
}
local ENGINE_MIN_PITCH = 0.6
local ENGINE_MAX_PITCH = 1.8
local CRASH_SPEED_DROP = 25 -- pérdida de velocidad brusca que cuenta como choque

local DARK_COLOR = Color3.fromRGB(25, 25, 28)
local CHROME_COLOR = Color3.fromRGB(205, 208, 215)

local function makePart(props)
	local p = Instance.new("Part")
	p.Anchored = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in pairs(props) do
		p[k] = v
	end
	return p
end

local function weld(a, b)
	local w = Instance.new("WeldConstraint")
	w.Part0 = a
	w.Part1 = b
	w.Parent = a
end

-- Suelo (solo si no existe uno)
if not Workspace:FindFirstChild("CarGround") then
	makePart({
		Name = "CarGround",
		Size = Vector3.new(1000, 2, 1000),
		Position = Vector3.new(0, -1, 0),
		Anchored = true,
		Material = Enum.Material.Asphalt,
		Color = Color3.fromRGB(60, 60, 60),
		Parent = Workspace,
	})
end

local car = Instance.new("Model")
car.Name = "Carro"

-- Chasis (toda la masa del carro está aquí: centro de gravedad bajo)
local chassis = makePart({
	Name = "Chasis",
	Size = Vector3.new(8, 1, 15),
	Color = DARK_COLOR,
	Material = Enum.Material.Metal,
	CustomPhysicalProperties = PhysicalProperties.new(3, 0.3, 0, 1, 1),
	CFrame = CFrame.new(SPAWN_POSITION),
	Parent = car,
})

-- Pieza de carrocería soldada al chasis (sin masa; CanCollide solo si se pide)
local function addBodyPart(name, size, localCFrame, extra)
	local p = makePart({
		Name = name,
		Size = size,
		CFrame = chassis.CFrame * localCFrame,
		CanCollide = false,
		Massless = true,
		Color = BODY_COLOR,
		Material = Enum.Material.SmoothPlastic,
		Parent = car,
	})
	for k, v in pairs(extra or {}) do
		p[k] = v
	end
	weld(chassis, p)
	return p
end

-- Panel alargado entre dos puntos (para parabrisas, pilares, etc.)
local function beam(name, width, thickness, a, b, extra)
	return addBodyPart(
		name,
		Vector3.new(width, thickness, (b - a).Magnitude),
		CFrame.lookAt((a + b) / 2, b),
		extra
	)
end

local darkProps = { Color = DARK_COLOR, Material = Enum.Material.Metal }
local chromeProps = { Color = CHROME_COLOR, Material = Enum.Material.Metal }
local glassProps = {
	Color = Color3.fromRGB(150, 200, 255),
	Transparency = 0.5,
	Material = Enum.Material.Glass,
}

-- Carrocería
for _, side in ipairs({ -1, 1 }) do
	addBodyPart("Lateral", Vector3.new(0.4, 1.4, 15), CFrame.new(side * 3.8, 1.2, 0), { CanCollide = true })
	addBodyPart("Espejo", Vector3.new(0.9, 0.55, 0.35), CFrame.new(side * 4.2, 3.0, -1.6))
	beam("Pilar", 0.25, 0.25, Vector3.new(side * 3.7, 1.9, -2.3), Vector3.new(side * 3.7, 4.1, -0.9), chromeProps)
end
addBodyPart("Frente", Vector3.new(8, 1.4, 5.2), CFrame.new(0, 1.2, -4.9), { CanCollide = true })
addBodyPart("Maletero", Vector3.new(8, 1.4, 3.8), CFrame.new(0, 1.2, 5.6), { CanCollide = true })
addBodyPart("Cofre", Vector3.new(7.8, 0.3, 5), CFrame.new(0, 2.05, -4.9))
addBodyPart("TapaMaletero", Vector3.new(7.8, 0.3, 3.8), CFrame.new(0, 2.05, 5.6))

-- Franjas de carreras
local stripeProps = { Color = Color3.fromRGB(245, 245, 245) }
addBodyPart("Franja", Vector3.new(1.2, 0.04, 5), CFrame.new(0, 2.22, -4.9), stripeProps)
addBodyPart("Franja", Vector3.new(1.2, 0.04, 3.8), CFrame.new(0, 2.22, 5.6), stripeProps)

-- Interior y parabrisas
addBodyPart("Tablero", Vector3.new(7.2, 0.9, 1), CFrame.new(0, 2.0, -1.9), darkProps)
addBodyPart("CubiertaTrasera", Vector3.new(7.2, 0.4, 1.6), CFrame.new(0, 1.9, 2.9), darkProps)
addBodyPart("Respaldo", Vector3.new(2, 1.6, 0.4), CFrame.new(0, 2.3, 1.9), darkProps)
beam("Parabrisas", 7.2, 0.15, Vector3.new(0, 2.4, -2.3), Vector3.new(0, 4.1, -0.9), glassProps)
addBodyPart("MarcoParabrisas", Vector3.new(7.6, 0.2, 0.3), CFrame.new(0, 4.15, -0.9), chromeProps)

-- Volante (disco inclinado hacia el conductor)
addBodyPart(
	"Volante",
	Vector3.new(0.2, 1.4, 1.4),
	CFrame.new(0, 2.9, -0.7) * CFrame.Angles(math.rad(-30), math.rad(90), 0),
	{ Shape = Enum.PartType.Cylinder, Color = DARK_COLOR, Material = Enum.Material.Leather }
)

-- Barra antivuelco
for _, side in ipairs({ -1, 1 }) do
	beam("BarraAntivuelco", 0.25, 0.25, Vector3.new(side * 1.6, 2.1, 2.9), Vector3.new(side * 1.6, 4.0, 3.2), chromeProps)
end
addBodyPart("BarraAntivuelco", Vector3.new(3.6, 0.25, 0.25), CFrame.new(0, 4.0, 3.2), chromeProps)

-- Parachoques, rejilla y alerón
addBodyPart("ParachoquesDelantero", Vector3.new(8.6, 0.7, 0.6), CFrame.new(0, 0.6, -7.6), {
	Color = DARK_COLOR, Material = Enum.Material.Metal, CanCollide = true,
})
local rearBumper = addBodyPart("ParachoquesTrasero", Vector3.new(8.6, 0.7, 0.6), CFrame.new(0, 0.6, 7.6), {
	Color = DARK_COLOR, Material = Enum.Material.Metal, CanCollide = true,
})
addBodyPart("Rejilla", Vector3.new(3.6, 0.9, 0.2), CFrame.new(0, 1.3, -7.55), darkProps)

for _, side in ipairs({ -1, 1 }) do
	addBodyPart("SoporteAleron", Vector3.new(0.3, 1.2, 0.3), CFrame.new(side * 2.5, 2.7, 6.9), darkProps)
	addBodyPart("PlacaAleron", Vector3.new(0.15, 0.7, 1.4), CFrame.new(side * 3.8, 3.5, 6.9), darkProps)
end
addBodyPart("Aleron", Vector3.new(7.6, 0.2, 1.4), CFrame.new(0, 3.35, 6.9), darkProps)

-- Escapes con humo
local exhaustEmitters = {}
for _, side in ipairs({ -1, 1 }) do
	addBodyPart(
		"Escape",
		Vector3.new(1.2, 0.5, 0.5),
		CFrame.new(side * 2, 0.45, 7.9) * CFrame.Angles(0, math.rad(90), 0),
		{ Shape = Enum.PartType.Cylinder, Color = CHROME_COLOR, Material = Enum.Material.Metal }
	)

	local att = Instance.new("Attachment")
	att.Position = Vector3.new(side * 2, -0.15, 0.9)
	att.Parent = rearBumper

	local smoke = Instance.new("ParticleEmitter")
	smoke.Rate = 25
	smoke.Lifetime = NumberRange.new(0.5, 1)
	smoke.Speed = NumberRange.new(4, 7)
	smoke.SpreadAngle = Vector2.new(10, 10)
	smoke.EmissionDirection = Enum.NormalId.Back
	smoke.Color = ColorSequence.new(Color3.fromRGB(150, 150, 150))
	smoke.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.3), NumberSequenceKeypoint.new(1, 1.2) })
	smoke.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.6), NumberSequenceKeypoint.new(1, 1) })
	smoke.Enabled = false
	smoke.Parent = att
	table.insert(exhaustEmitters, smoke)
end

-- Faros (con luz real) y luces traseras (con luz de freno)
local headlights = {}
local taillights = {}
for _, side in ipairs({ -1, 1 }) do
	local head = addBodyPart("Faro", Vector3.new(1.5, 0.7, 0.3), CFrame.new(side * 2.8, 1.5, -7.45), {
		Color = Color3.fromRGB(255, 255, 215),
		Material = Enum.Material.SmoothPlastic,
	})
	local spot = Instance.new("SpotLight")
	spot.Face = Enum.NormalId.Front
	spot.Brightness = 4
	spot.Range = 70
	spot.Angle = 60
	spot.Enabled = false
	spot.Parent = head
	table.insert(headlights, { part = head, light = spot })

	local tail = addBodyPart("LuzTrasera", Vector3.new(1.8, 0.6, 0.3), CFrame.new(side * 2.8, 1.5, 7.45), {
		Material = Enum.Material.Neon,
	})
	table.insert(taillights, tail)
end

local function setHeadlights(on)
	for _, h in ipairs(headlights) do
		h.light.Enabled = on
		h.part.Material = on and Enum.Material.Neon or Enum.Material.SmoothPlastic
	end
end

-- level 1 = apagadas, 2 = encendidas, 3 = freno
local TAIL_COLORS = {
	Color3.fromRGB(90, 0, 0),
	Color3.fromRGB(190, 0, 0),
	Color3.fromRGB(255, 60, 60),
}
local function setTailLights(level)
	for _, t in ipairs(taillights) do
		t.Color = TAIL_COLORS[level]
	end
end

-- Asiento (el frente del VehicleSeat mira hacia -Z, igual que el cofre)
local seat = Instance.new("VehicleSeat")
seat.Name = "Asiento"
seat.Size = Vector3.new(2, 1, 2)
seat.Color = Color3.fromRGB(30, 30, 30)
seat.Material = Enum.Material.Leather
seat.TopSurface = Enum.SurfaceType.Smooth
seat.BottomSurface = Enum.SurfaceType.Smooth
seat.CFrame = chassis.CFrame * CFrame.new(0, 1, 1)
seat.Parent = car
weld(chassis, seat)

-- Ruedas: { x, z, ¿delantera? }
local wheelDefs = {
	{ -4.6, -4.8, true },
	{ 4.6, -4.8, true },
	{ -4.6, 4.8, false },
	{ 4.6, 4.8, false },
}

local motors = {}
local steers = {}

for i, def in ipairs(wheelDefs) do
	local x, z, isFront = def[1], def[2], def[3]
	local side = x < 0 and -1 or 1
	local wheelCFrame = chassis.CFrame * CFrame.new(x, -0.5, z)

	-- Guardabarros
	addBodyPart("Guardabarros", Vector3.new(1.7, 0.3, 3.8), CFrame.new(x, 1.35, z))
	addBodyPart("BordeGuardabarros", Vector3.new(0.2, 0.8, 3.8), CFrame.new(side * 5.45, 1.1, z))

	-- Un Cylinder de Roblox tiene su eje a lo largo de X
	local wheel = makePart({
		Name = "Rueda" .. i,
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(WHEEL_WIDTH, WHEEL_RADIUS * 2, WHEEL_RADIUS * 2),
		Color = Color3.fromRGB(20, 20, 20),
		Material = Enum.Material.Rubber,
		CustomPhysicalProperties = PhysicalProperties.new(1, 2, 0, 1, 1),
		CFrame = wheelCFrame,
		Parent = car,
	})

	-- Llanta con radios y tapa central (giran con la rueda)
	local function addWheelDetail(size, offsetCF, props)
		local p = makePart({
			Size = size,
			CFrame = wheelCFrame * offsetCF,
			CanCollide = false,
			Massless = true,
			Parent = car,
		})
		for k, v in pairs(props) do
			p[k] = v
		end
		weld(wheel, p)
	end
	addWheelDetail(Vector3.new(0.15, 1.9, 1.9), CFrame.new(side * 0.52, 0, 0), {
		Name = "Llanta", Shape = Enum.PartType.Cylinder, Color = Color3.fromRGB(60, 60, 65), Material = Enum.Material.Metal,
	})
	for k = 1, 5 do
		addWheelDetail(
			Vector3.new(0.1, 0.15, 1.7),
			CFrame.new(side * 0.6, 0, 0) * CFrame.Angles(k * math.rad(36), 0, 0),
			{ Name = "Radio", Color = CHROME_COLOR, Material = Enum.Material.Metal }
		)
	end
	addWheelDetail(Vector3.new(0.25, 0.7, 0.7), CFrame.new(side * 0.6, 0, 0), {
		Name = "TapaRueda", Shape = Enum.PartType.Cylinder, Color = DARK_COLOR, Material = Enum.Material.Metal,
	})

	-- Soporte invisible entre chasis y rueda (permite girar la dirección)
	local hub = makePart({
		Name = "Soporte" .. i,
		Size = Vector3.new(0.5, 0.5, 0.5),
		Transparency = 1,
		CanCollide = false,
		CFrame = wheelCFrame,
		Parent = car,
	})

	-- Motor: eje X de la rueda
	local wheelAtt = Instance.new("Attachment")
	wheelAtt.Parent = wheel
	local hubAtt = Instance.new("Attachment")
	hubAtt.Parent = hub

	local motor = Instance.new("HingeConstraint")
	motor.Name = "Motor"
	-- Tracción trasera: las ruedas delanteras ruedan libres para que el carro gire sin patinar
	motor.ActuatorType = isFront and Enum.ActuatorType.None or Enum.ActuatorType.Motor
	motor.MotorMaxTorque = TORQUE
	motor.MotorMaxAcceleration = 200
	motor.AngularVelocity = 0
	motor.Attachment0 = wheelAtt
	motor.Attachment1 = hubAtt
	motor.Parent = wheel
	if not isFront then
		table.insert(motors, motor)
	end

	if isFront then
		-- Dirección: bisagra de eje vertical (Y) entre chasis y soporte
		local chassisAtt = Instance.new("Attachment")
		chassisAtt.CFrame = CFrame.new(x, -0.5, z) * CFrame.Angles(0, 0, math.rad(90))
		chassisAtt.Parent = chassis

		local hubSteerAtt = Instance.new("Attachment")
		hubSteerAtt.CFrame = CFrame.Angles(0, 0, math.rad(90))
		hubSteerAtt.Parent = hub

		local steer = Instance.new("HingeConstraint")
		steer.Name = "Direccion"
		steer.ActuatorType = Enum.ActuatorType.Servo
		steer.ServoMaxTorque = 100000
		steer.AngularSpeed = 8
		steer.TargetAngle = 0
		steer.LimitsEnabled = true
		steer.LowerAngle = -TURN_ANGLE
		steer.UpperAngle = TURN_ANGLE
		steer.Attachment0 = chassisAtt
		steer.Attachment1 = hubSteerAtt
		steer.Parent = hub
		table.insert(steers, steer)
	else
		weld(chassis, hub)
	end
end

car.PrimaryPart = chassis
car.Parent = Workspace

-- Sonidos (3D, salen del carro)
local function makeSound(name, props)
	local s = Instance.new("Sound")
	s.Name = name
	s.SoundId = SOUND_IDS[name] or ""
	s.RollOffMode = Enum.RollOffMode.InverseTapered
	s.RollOffMinDistance = 10
	s.RollOffMaxDistance = 150
	for k, v in pairs(props or {}) do
		s[k] = v
	end
	s.Parent = chassis
	return s
end

local engineSound = makeSound("Engine", { Looped = true, Volume = 0, PlaybackSpeed = ENGINE_MIN_PITCH })
local ignitionSound = makeSound("Ignition", { Volume = 0.8 })
local doorSound = makeSound("Door", { Volume = 0.8 })
local crashSound = makeSound("Crash", { Volume = 0.6 })

-- Botones de interacción (ProximityPrompt = botón en pantalla, tecla o toque)
local enterPrompt = Instance.new("ProximityPrompt")
enterPrompt.ObjectText = "Carro"
enterPrompt.ActionText = "Conducir"
enterPrompt.KeyboardKeyCode = Enum.KeyCode.E
enterPrompt.GamepadKeyCode = Enum.KeyCode.ButtonX
enterPrompt.HoldDuration = 0
enterPrompt.MaxActivationDistance = 14
enterPrompt.RequiresLineOfSight = false
enterPrompt.Parent = chassis

local exitPrompt = Instance.new("ProximityPrompt")
exitPrompt.ObjectText = "Carro"
exitPrompt.ActionText = "Bajar"
exitPrompt.KeyboardKeyCode = Enum.KeyCode.F
exitPrompt.GamepadKeyCode = Enum.KeyCode.ButtonY
exitPrompt.HoldDuration = 0
exitPrompt.MaxActivationDistance = 14
exitPrompt.RequiresLineOfSight = false
exitPrompt.Enabled = false
exitPrompt.Parent = chassis

enterPrompt.Triggered:Connect(function(player)
	local humanoid = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	if humanoid and humanoid.Health > 0 and not seat.Occupant then
		seat:Sit(humanoid)
	end
end)

exitPrompt.Triggered:Connect(function(player)
	local occupant = seat.Occupant
	-- Solo el conductor puede bajarse con este botón
	if occupant and occupant.Parent == player.Character then
		occupant.Sit = false
		occupant.Jump = true
	end
end)

-- Velocímetro (solo para el conductor)
local speedGui, speedLabel
local function createSpeedometer(player)
	local playerGui = player:FindFirstChildOfClass("PlayerGui")
	if not playerGui then
		return
	end

	speedGui = Instance.new("ScreenGui")
	speedGui.Name = "VelocimetroCarro"
	speedGui.ResetOnSpawn = false

	local frame = Instance.new("Frame")
	frame.AnchorPoint = Vector2.new(0.5, 1)
	frame.Position = UDim2.new(0.5, 0, 1, -30)
	frame.Size = UDim2.fromOffset(170, 56)
	frame.BackgroundColor3 = Color3.fromRGB(15, 15, 18)
	frame.BackgroundTransparency = 0.25
	frame.Parent = speedGui

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 12)
	corner.Parent = frame

	speedLabel = Instance.new("TextLabel")
	speedLabel.Size = UDim2.fromScale(1, 1)
	speedLabel.BackgroundTransparency = 1
	speedLabel.Font = Enum.Font.GothamBold
	speedLabel.TextSize = 28
	speedLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
	speedLabel.Text = "0 km/h"
	speedLabel.Parent = frame

	speedGui.Parent = playerGui
end

local function destroySpeedometer()
	if speedGui then
		speedGui:Destroy()
	end
	speedGui, speedLabel = nil, nil
end

-- Ayuda de giro: torque vertical según la dirección y la velocidad (invierte en reversa)
local yawAttachment = Instance.new("Attachment")
yawAttachment.Parent = chassis
local yawAssist = Instance.new("Torque")
yawAssist.Attachment0 = yawAttachment
yawAssist.RelativeTo = Enum.ActuatorRelativeTo.Attachment0
yawAssist.Torque = Vector3.zero
yawAssist.Parent = chassis

local driver = nil
local lastSpeed = 0
local lastCrash = 0
local smoothPitch = ENGINE_MIN_PITCH

-- Controles: VehicleSeat entrega ThrottleFloat / SteerFloat entre -1 y 1
local function applyControls()
	local throttle = seat.ThrottleFloat
	local steerInput = seat.SteerFloat
	local occupied = seat.Occupant ~= nil

	for _, s in ipairs(steers) do
		s.TargetAngle = -steerInput * TURN_ANGLE * STEER_SIGN
	end

	local angularSpeed = -throttle * (MAX_SPEED / WHEEL_RADIUS) * DRIVE_SIGN
	for _, m in ipairs(motors) do
		m.AngularVelocity = angularSpeed
		m.MotorMaxTorque = (throttle == 0) and TORQUE * 0.1 or TORQUE
	end

	-- Luces de freno, humo y volumen del motor
	setTailLights(occupied and (throttle == 0 and 3 or 2) or 1)
	for _, e in ipairs(exhaustEmitters) do
		e.Enabled = occupied and throttle ~= 0
	end
	engineSound.Volume = occupied and (0.35 + math.abs(throttle) * 0.35) or 0
end
seat:GetPropertyChangedSignal("ThrottleFloat"):Connect(applyControls)
seat:GetPropertyChangedSignal("SteerFloat"):Connect(applyControls)

seat:GetPropertyChangedSignal("Occupant"):Connect(function()
	local occupant = seat.Occupant
	local player = occupant and Players:GetPlayerFromCharacter(occupant.Parent)

	-- El conductor controla la física del carro (menos lag); sin conductor, el servidor
	chassis:SetNetworkOwner(player)

	enterPrompt.Enabled = occupant == nil
	exitPrompt.Enabled = occupant ~= nil
	driver = occupant

	if occupant then
		lastSpeed = 0
		smoothPitch = ENGINE_MIN_PITCH
		doorSound:Play()
		ignitionSound:Play()
		engineSound:Play()
		setHeadlights(true)
		if player then
			createSpeedometer(player)
		end
	else
		engineSound:Stop()
		yawAssist.Torque = Vector3.zero
		doorSound:Play()
		setHeadlights(false)
		destroySpeedometer()
	end

	applyControls()
end)

-- Motor según la velocidad, velocímetro y sonido de choque
RunService.Heartbeat:Connect(function(dt)
	if not driver then
		return
	end

	local velocity = chassis.AssemblyLinearVelocity
	local speed = velocity.Magnitude
	local throttle = math.abs(seat.ThrottleFloat)

	-- Ayuda de giro (SteerFloat > 0 = derecha = torque negativo sobre Y)
	local forwardSpeed = velocity:Dot(chassis.CFrame.LookVector)
	local desired = -seat.SteerFloat * math.clamp(forwardSpeed / 20, -1, 1)
	local yawRate = chassis.AssemblyAngularVelocity.Y
	local headroom = math.clamp(1 - yawRate * math.sign(desired) / MAX_YAW_RATE, 0, 1)
	local yawTorque = desired * chassis.AssemblyMass * TURN_ASSIST * headroom
	if math.abs(yawTorque - yawAssist.Torque.Y) > chassis.AssemblyMass * TURN_ASSIST * 0.02 then
		yawAssist.Torque = Vector3.new(0, yawTorque, 0)
	end

	local targetPitch = ENGINE_MIN_PITCH
		+ math.min(speed / MAX_SPEED, 1) * (ENGINE_MAX_PITCH - ENGINE_MIN_PITCH)
		+ throttle * 0.1
	smoothPitch += (targetPitch - smoothPitch) * math.min(1, dt * 6)
	if math.abs(engineSound.PlaybackSpeed - smoothPitch) > 0.01 then
		engineSound.PlaybackSpeed = smoothPitch
	end

	if speedLabel then
		local text = string.format("%d km/h", math.floor(speed + 0.5))
		if speedLabel.Text ~= text then
			speedLabel.Text = text
		end
	end

	local drop = lastSpeed - speed
	if drop > CRASH_SPEED_DROP and os.clock() - lastCrash > 0.6 then
		lastCrash = os.clock()
		crashSound.Volume = math.clamp(drop / 80, 0.3, 1)
		crashSound:Play()
	end
	lastSpeed = speed
end)

-- Reaparece si cae al vacío
task.spawn(function()
	while car.Parent do
		task.wait(2)
		if chassis.Position.Y < -50 then
			car:PivotTo(CFrame.new(SPAWN_POSITION))
			chassis.AssemblyLinearVelocity = Vector3.zero
			chassis.AssemblyAngularVelocity = Vector3.zero
			lastSpeed = 0
		end
	end
end)

applyControls()
print("[Carro] Listo. Acércate y pulsa el botón Conducir (E).")
