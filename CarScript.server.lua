-- Carro funcional en un solo Script (ServerScriptService)
-- Controles: W/S acelerar/reversa, A/D girar. Siéntate en el asiento para conducir.
-- Al soltar W/S el carro frena suavemente.

local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")

-- Configuración
local SPAWN_POSITION = Vector3.new(0, 6, 0)
local MAX_SPEED = 80       -- studs/s
local TORQUE = 40000
local TURN_ANGLE = 30      -- grados máximos de giro
local WHEEL_RADIUS = 1.5
local WHEEL_WIDTH = 1
local BODY_COLOR = Color3.fromRGB(200, 30, 30)

-- Si el carro va hacia atrás con W, cambia DRIVE_SIGN a -1.
-- Si las ruedas giran al lado contrario de la tecla, cambia STEER_SIGN a -1.
local DRIVE_SIGN = 1
local STEER_SIGN = 1

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

-- Chasis
local chassis = makePart({
	Name = "Chasis",
	Size = Vector3.new(8, 1, 14),
	Color = BODY_COLOR,
	Material = Enum.Material.SmoothPlastic,
	CustomPhysicalProperties = PhysicalProperties.new(2, 0.3, 0, 1, 1),
	CFrame = CFrame.new(SPAWN_POSITION),
	Parent = car,
})

-- Añade una pieza de carrocería soldada al chasis (offset relativo al chasis)
local function addBodyPart(name, size, offset, props)
	local p = makePart({
		Name = name,
		Size = size,
		CFrame = chassis.CFrame * CFrame.new(offset),
		Parent = car,
	})
	for k, v in pairs(props or {}) do
		p[k] = v
	end
	weld(chassis, p)
	return p
end

local bodyProps = { Color = BODY_COLOR, Material = Enum.Material.SmoothPlastic }

addBodyPart("Cofre", Vector3.new(7.5, 1, 4.5), Vector3.new(0, 1, -4.5), bodyProps)
addBodyPart("Techo", Vector3.new(7, 0.5, 6), Vector3.new(0, 5.5, 1), bodyProps)

-- Pilares del techo (el interior queda libre para el conductor)
for _, x in ipairs({ -3.3, 3.3 }) do
	for _, z in ipairs({ -1.8, 3.8 }) do
		addBodyPart("Pilar", Vector3.new(0.4, 4.75, 0.4), Vector3.new(x, 2.875, z), bodyProps)
	end
end

addBodyPart("Parabrisas", Vector3.new(6.2, 4.5, 0.2), Vector3.new(0, 2.75, -1.8), {
	Color = Color3.fromRGB(150, 200, 255),
	Transparency = 0.5,
	Material = Enum.Material.Glass,
	CanCollide = false,
})

addBodyPart("RespaldoTrasero", Vector3.new(6.2, 2.5, 0.3), Vector3.new(0, 1.75, 3.8), bodyProps)

-- Faros y luces traseras
for _, x in ipairs({ -3, 3 }) do
	addBodyPart("Faro", Vector3.new(1.2, 0.8, 0.3), Vector3.new(x, 1, -6.9), {
		Color = Color3.fromRGB(255, 255, 200),
		Material = Enum.Material.Neon,
		CanCollide = false,
	})
	addBodyPart("LuzTrasera", Vector3.new(1.2, 0.8, 0.3), Vector3.new(x, 1, 7.1), {
		Color = Color3.fromRGB(255, 0, 0),
		Material = Enum.Material.Neon,
		CanCollide = false,
	})
end

-- Asiento (el frente del VehicleSeat mira hacia -Z, igual que el cofre)
local seat = Instance.new("VehicleSeat")
seat.Name = "Asiento"
seat.Size = Vector3.new(2, 1, 2)
seat.Color = Color3.fromRGB(30, 30, 30)
seat.TopSurface = Enum.SurfaceType.Smooth
seat.BottomSurface = Enum.SurfaceType.Smooth
seat.CFrame = chassis.CFrame * CFrame.new(0, 1, 1.5)
seat.Parent = car
weld(chassis, seat)

-- Ruedas: { x, z, ¿delantera? }
local wheelDefs = {
	{ -4.6, -4.5, true },
	{ 4.6, -4.5, true },
	{ -4.6, 4.5, false },
	{ 4.6, 4.5, false },
}

local motors = {}
local steers = {}

for i, def in ipairs(wheelDefs) do
	local x, z, isFront = def[1], def[2], def[3]
	local wheelCFrame = chassis.CFrame * CFrame.new(x, -0.5, z)

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
	motor.ActuatorType = Enum.ActuatorType.Motor
	motor.MotorMaxTorque = TORQUE
	motor.MotorMaxAcceleration = 200
	motor.AngularVelocity = 0
	motor.Attachment0 = wheelAtt
	motor.Attachment1 = hubAtt
	motor.Parent = wheel
	table.insert(motors, motor)

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
		steer.AngularSpeed = 4
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

-- El conductor controla la física del carro (menos lag); sin conductor, el servidor
local function updateOwnership()
	local occupant = seat.Occupant
	local player = occupant and Players:GetPlayerFromCharacter(occupant.Parent)
	chassis:SetNetworkOwner(player)
end
seat:GetPropertyChangedSignal("Occupant"):Connect(updateOwnership)

-- VehicleSeat entrega ThrottleFloat / SteerFloat entre -1 y 1
local function applyControls()
	local throttle = seat.ThrottleFloat
	local steerInput = seat.SteerFloat

	for _, s in ipairs(steers) do
		s.TargetAngle = -steerInput * TURN_ANGLE * STEER_SIGN
	end

	local angularSpeed = -throttle * (MAX_SPEED / WHEEL_RADIUS) * DRIVE_SIGN
	for _, m in ipairs(motors) do
		m.AngularVelocity = angularSpeed
		m.MotorMaxTorque = (throttle == 0) and TORQUE * 0.1 or TORQUE
	end
end
seat:GetPropertyChangedSignal("ThrottleFloat"):Connect(applyControls)
seat:GetPropertyChangedSignal("SteerFloat"):Connect(applyControls)

-- Reaparece si cae al vacío
task.spawn(function()
	while car.Parent do
		task.wait(2)
		if chassis.Position.Y < -50 then
			car:PivotTo(CFrame.new(SPAWN_POSITION))
			chassis.AssemblyLinearVelocity = Vector3.zero
			chassis.AssemblyAngularVelocity = Vector3.zero
		end
	end
end)

print("[Carro] Listo. Siéntate en el asiento y usa W/A/S/D para conducir.")
