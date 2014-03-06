/*
  Calibrated Input Script.

  Description of the API / available functions:
  ( functionName(input values)(return values) - description )

	VARIABLES:
    - acceleration:Vector3     - (Read Only) the current values that have been calibrated.
    - rangeHack:boolean        - If set to true, will "double" the physical angles for orientation.
    - inputFromGamepad:boolean - If set to true, input will be fetched from a controller instead of Input.acceleration.
    - invertedX:boolean        - If set to true, the X-axis will be inverted
    - invertedY:boolean        - If set to true, the Y-axis will be inverted
    - invertedZ:boolean        - If set to true, the Z-axis will be inverted


	FUNCTIONS:
	- StartCalibration()()          - Starts the calibration.
	- EndCalibration()()            - Ends the calibration.

	- UpdateZeroVector()()          - Updates the default orientation. (As current orientation, smooth)

	- GetInput()(Vector3)           - Returns current calibrated axis values.
	- GetRawInput()(Vector3)        - Returns raw, uncalibrated axis values.
	- GetZeroVector()(Vector3)      - Get the zero vector that's currently in use.
	- GetRatiosX()(Vector2)         - Get the X ratios.
	- GetRatiosY()(Vector2)         - Get the Y ratios.
	- GetRatiosZ()(Vector2)         - Get the Z ratios.

	- GetCalibrationTime()(float)      - Returns time in seconds of how long the calibration has been going on.
	- GetCalibrationSampleCount()(int) - Returns the count of calibration samples.

	- SetZeroVector(Vector3)()                  - Set the zero vector manually.
	- SetCalibrationScheme(CalibrationScheme)() - Set the calibration scheme.
	- SetClampingDelegate(function(Vector3))()  - Set the clamping function. The function needs to return Vector3.

	- IsCalibrating()(boolean)      - Returns either true or false, depending on the current state.
*/


#pragma strict


// Used to store and pass around ratios
public class RatioInformation
{
	public var x:Vector2;
	public var y:Vector2;
	public var z:Vector2;

	public function RatioInformation()
	{
		x = Vector2( 1, 1 );
		y = Vector2( 1, 1 );
		z = Vector2( 1, 1 );
	}

	public function RatioInformation( X:Vector2, Y:Vector2, Z:Vector2 )
	{
		x = X;
		y = Y;
		z = Z;
	}
}



// Used as an interface for different calibration schemes
public class CalibrationScheme
{
	public function Start()
	{
		// Initialization of variables goes here
		Debug.LogWarning( "Using default CalibrationScheme::Start method. Please, overload me." );
	}

	public function End():RatioInformation
	{
		Debug.LogWarning( "Using default CalibrationScheme::End method. Please, overload me." );
		return RatioInformation();
	}

	public function Step( currentInput:Vector3, zeroVector:Vector3 )
	{
		Debug.LogWarning( "Using default CalibrationScheme::Step method. Please, overload me." );
	}
}



// The Zero Vector that indicates
// the default orientation of device
private var zeroVector:Vector3 = Vector3( 0.0, 0.0, 0.0 );

// Ratios which are used to calculate
// the values after calibration is done
private var ratiosX:Vector2 = Vector2( 1.0, 1.0 );
private var ratiosY:Vector2 = Vector2( 1.0, 1.0 );
private var ratiosZ:Vector2 = Vector2( 1.0, 1.0 );

// Holds values from Input.acceleration.
//   This is just so that same values can be used
//   per update, without passing them all over the place.
private var sensorInput:Vector3;

// Holds the raw input.
private var _rawInput:Vector3;


// These are used when calibrating the zero vector.
private var zeroBuffer:Array = new Array();
private var zeroBufferSize:int = 20;


// We want to know if we're calibrating or not.
private var calibrating:boolean = false;

// The calibration scheme we will be using.
private var calibrationScheme:CalibrationScheme;

// The clamping function we will be using.
private var ClampingFunction:function( Vector3 ):Vector3;

// Count of calibration samples we have
private var calibrationSampleCount:int = 0;

// Time when the calibration started
private var calibrationStartTime:float = 0.0;

// Private copy of acceleration we will calculate
private var _acceleration:Vector3;

// Values that can be used outside this script
static var currentX:float = 0;
static var currentY:float = 0;
static var currentZ:float = 0;
static var acceleration:Vector3;

// Public flag to keep taps on if we should be using the range hack or not
static var rangeHack:boolean = false;

// Are we reading the input data from Input.acceleration or gamepad
static var inputFromGamepad:boolean = false;


// The axes need to be invertable.
static var invertedX:boolean = false;
static var invertedY:boolean = false;
static var invertedZ:boolean = false;


function Start()
{
	calibrationScheme = GetComponent( Scheme ).calibrationScheme;
	// We'll turn the calibrating flag on because
	// we don't have anything set up.
	//   (In reality we do, but this is just a little precaution.)
	calibrating = true;

	// Set up the default values.
	Initialize();

	// Now that we have at least some sort of default values,
	// we can turn the calibrating flag off and let the developer
	// set it up when the real calibrating takes place.
	calibrating = false;
}


function Update()
{
	if( !inputFromGamepad )
	{
		// Read the gyro+acceleration info for this update.
		sensorInput = Input.acceleration;
	}
	else
	{
		sensorInput = FakeInputFromGamepad();
	}

	_rawInput   = sensorInput;

	// This is a hack to increase the physical ranges for X and Y.
	// Should work just fine, except when the device is used upside-down
	// (screen facing straing down). Making code tolerant for that would
	// require use of quaternions and I won't do that until I really have to.
	// - The software values are still kept in range [-1.0 ... 1.0] by default.
	if( rangeHack && !inputFromGamepad )
	{
		var angle     = Mathf.Acos( Vector3.Dot( Vector3( 0, 0, -1 ), sensorInput.normalized ));
		var distance  = angle / Mathf.PI;
		var direction = Vector2( sensorInput.x, sensorInput.y ).normalized;

		sensorInput.x = direction.x * distance;
		sensorInput.y = direction.y * distance;
	}

	if( IsCalibrating() )
	{
		calibrationScheme.Step( sensorInput, zeroVector );
		++calibrationSampleCount;
	}

	// Update
	CalculateNewValues();
}


// Public functions:
function StartCalibration()
{
	calibrating = true;
	calibrationStartTime = Time.time;

	ratiosX = Vector2( 1.0, 1.0 );
	ratiosY = Vector2( 1.0, 1.0 );
	ratiosZ = Vector2( 1.0, 1.0 );

	calibrationScheme.Start();
}


function EndCalibration()
{
	calibrating = false;
	calibrationSampleCount = 0;
	calibrationStartTime   = 0;

	var ratios:RatioInformation = calibrationScheme.End();
	ratiosX = ratios.x;
	ratiosY = ratios.y;
	ratiosZ = ratios.z;
}


function UpdateZeroVector()
{
	zeroBuffer.Clear();

	var averageVector:Vector3 = Vector3( 0.0, 0.0, 0.0 );
	while( zeroBuffer.length < zeroBufferSize )
	{
		UpdateBuffers();
		var tmpOrientation:Vector3 = zeroBuffer.Pop();
		averageVector += tmpOrientation;
		zeroBuffer.Push( tmpOrientation );
	}
	averageVector /= zeroBufferSize;
	zeroVector = averageVector;
}


function GetInput()
{
	return _acceleration;
}


function GetRawInput()
{
	return _rawInput;
}


function GetZeroVector()
{
	return zeroVector;
}


function GetRatiosX()
{
	return ratiosX;
}


function GetRatiosY()
{
	return ratiosY;
}


function GetCalibrationTime()
{
	if( !IsCalibrating() )
		return 0.0;

	return Time.time - calibrationStartTime;
}


function GetCalibrationSampleCount()
{
	return calibrationSampleCount;
}


function SetZeroVector( newZeroVector:Vector3 )
{
	zeroVector = newZeroVector;
}


function SetCalibrationScheme( newScheme:CalibrationScheme )
{
	calibrationScheme = newScheme;
}

function SetClampingDelegate( clamper:function( Vector3 ):Vector3 )
{
	ClampingFunction = clamper;
}


function IsCalibrating()
{
	return calibrating;
}



// Private implementation:
private function Initialize()
{
	zeroVector = Input.acceleration;
	UpdateZeroVector();
}


private function FakeInputFromGamepad():Vector3
{
	var inputData:Vector3 = Vector3();
	inputData.x = Input.GetAxis( "Horizontal" );
	inputData.y = Input.GetAxis( "Vertical" );
	return inputData;
}


private function UpdateBuffers()
{
	// Update zeroBuffer
	zeroBuffer.Push( sensorInput );
	if( zeroBuffer.length > zeroBufferSize )
	{
		zeroBuffer.RemoveAt( 0 );
	}
}


private function CalculateNewValues()
{
	var zeroedInput = sensorInput - zeroVector;

	// Multiply axis values with correct ratios
	if( zeroedInput.x > 0 )
	{
		currentX = zeroedInput.x * ratiosX.x;
	}
	else
	{
		currentX = zeroedInput.x * ratiosX.y;
	}

	if( zeroedInput.y > 0 )
	{
		currentY = zeroedInput.y * ratiosY.x;
	}
	else
	{
		currentY = zeroedInput.y * ratiosY.y;
	}

	if( zeroedInput.z > 0 )
	{
		currentZ = zeroedInput.z * ratiosZ.x;
	}
	else
	{
		currentZ = zeroedInput.z * ratiosZ.y;
	}

	// Invert the inverted axes.
	currentX = invertedX? -currentX : currentX;
	currentY = invertedY? -currentY : currentY;
	currentZ = invertedZ? -currentZ : currentZ;

	// Collect the values to a vector and clamp them
	var vals = Vector3( currentX, currentY, currentZ );
	if( ClampingFunction )
	{
		vals = ClampingFunction( vals );
	}

	acceleration = vals;
	_acceleration = vals;
}
