/*
  Calibrated Input Script.

  Description of the API / available functions:
  ( functionName(input values)(return values) - description )

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

	- SetReferenceValues(Vector3)() - Set the reference values.
	- SetMaximumValues(Vector3)()   - Set the maximum values.
	- SetZeroVector(Vector3)()      - Set the zero vector manually.

	- IsCalibrating()(boolean)      - Returns either true or false, depending on the current state.
*/


#pragma strict


// Reference values, which are used to calculate the ratio.
private var referenceValues:Vector3 = Vector3( 1.0, 1.0, 1.0 );

// The reference values can't be more than
// the maximum values, desided by the developer.
//   (These are just the default values and can
//    be changed later in scripts or by Unity.)
private var maxValueLimits:Vector3  = Vector3( 1.0, 1.0, 1.0 );

// The Zero Vector that indicates
// the default orientation of device
private var zeroVector:Vector3 = Vector3( 0.0, 0.0, 0.0 );

// Ratios which are used to calculate
// the values after calibration is done
private var ratiosX:Vector2 = Vector2( 1.0, 1.0 );
private var ratiosY:Vector2 = Vector2( 1.0, 1.0 );
private var ratiosZ:Vector2 = Vector2( 1.0, 1.0 );

// These are used to calculate the ratios
private var maxValuesX:Vector2 = Vector2( 0.01, -0.01 );
private var maxValuesY:Vector2 = Vector2( 0.01, -0.01 );
private var maxValuesZ:Vector2 = Vector2( 0.01, -0.01 );

// Holds values from Input.acceleration.
//   This is just so that same values can be used
//   per update, without passing them all over the place.
private var sensorInput:Vector3;


// These are used when calibrating the zero vector.
private var zeroBuffer:Array = new Array();
private var zeroBufferSize:int = 20;


// We want to know if we're calibrating or not.
private var calibrating:boolean = false;

// The calibration function we will be using.
private var CalibrationStep:function() = ChaoticCalibration;

// Count of calibration samples we have
private var calibrationSampleCount:int = 0;

// Time when the calibration started
private var calibrationStartTime:float = 0.0;


// Values that can be used outside this script
static var currentX:float = 0;
static var currentY:float = 0;
static var currentZ:float = 0;



function Start()
{
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
	// Read the gyro+acceleration info for this update.
	sensorInput = Input.acceleration;

	// This is a hack to increase the physical ranges for X and Y.
	// Should work just fine, except when the device is used upside-down
	// (screen facing straing down). Making code tolerant for that would
	// require use of quaternions and I won't do that until I really have to.
	// - The software values are still kept in range [-1.0 ... 1.0]
	sensorInput.x *= 0.5;
	sensorInput.y *= 0.5;
	if( sensorInput.z > 0 )
	{
		var direction = Vector2( sensorInput.x, sensorInput.y ).normalized * 0.5;
		direction    += direction * sensorInput.z;
		sensorInput.x = direction.x;
		sensorInput.y = direction.y;
	}

	if( IsCalibrating() )
	{
		CalibrationStep();
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

	maxValuesX = Vector2( 0.01, 0.01 );
	maxValuesY = Vector2( 0.01, 0.01 );
	maxValuesZ = Vector2( 0.01, 0.01 );
	ratiosX = Vector2( 1.0, 1.0 );
	ratiosY = Vector2( 1.0, 1.0 );
	ratiosZ = Vector2( 1.0, 1.0 );
}


function EndCalibration()
{
	// Calculate ratios
	var ratioPositiveX = referenceValues.x     / maxValuesX.x;
	var ratioNegativeX = (0-referenceValues.x) / maxValuesX.y;
	var ratioPositiveY = referenceValues.y     / maxValuesY.x;
	var ratioNegativeY = (0-referenceValues.y) / maxValuesY.y;
	var ratioPositiveZ = referenceValues.z     / maxValuesZ.x;
	var ratioNegativeZ = (0-referenceValues.z) / maxValuesZ.y;

	// We don't want zeros here.
	if( ratioPositiveX == 0 )
		ratioPositiveX = 0.01;
	if( ratioNegativeX == 0 )
		ratioNegativeX = 0.01;
	if( ratioPositiveY == 0 )
		ratioPositiveY = 0.01;
	if( ratioNegativeY == 0 )
		ratioNegativeY = 0.01;
	if( ratioPositiveZ == 0 )
		ratioPositiveZ = 0.01;
	if( ratioNegativeZ == 0 )
		ratioNegativeZ = 0.01;

	ratiosX = Vector2( ratioPositiveX, ratioNegativeX );
	ratiosY = Vector2( ratioPositiveY, ratioNegativeY );
	ratiosZ = Vector2( ratioPositiveZ, ratioNegativeZ );

	calibrating = false;
	calibrationSampleCount = 0;
	calibrationStartTime   = 0;
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
	return Vector3( currentX, currentY, currentZ );
}


function GetRawInput()
{
	return sensorInput;
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



function SetReferenceValues( newReferenceValues:Vector3 )
{
	referenceValues = newReferenceValues;
}


function SetMaximumValues( newMaximumValues:Vector3 )
{
	maxValueLimits = newMaximumValues;
}


function SetZeroVector( newZeroVector:Vector3 )
{
	zeroVector = newZeroVector;
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
}



// Example of a calibration function
private function ChaoticCalibration()
{
	// Check if the current X value goes over any of so far
	// observed maximum values but still remains below the hard limits.
	if( currentX > maxValuesX.x &&
	    currentX <= maxValueLimits.x )
	{
		maxValuesX.x = currentX;
	}
	else if( currentX < maxValuesX.y &&
	         currentX >= 0-maxValueLimits.x)
	{
		maxValuesX.y = currentX;
	}

	// Do the same for the Y value.
	if( currentY > maxValuesY.x &&
	    currentY <= maxValueLimits.y )
	{
		maxValuesY.x = currentY;
	}
	else if( currentY < maxValuesY.y &&
	         currentY >= 0-maxValueLimits.y  )
	{
		maxValuesY.y = currentY;
	}

	// And for the Z value.
	if( currentZ > maxValuesZ.x &&
	    currentZ <= maxValueLimits.z )
	{
		maxValuesZ.x = currentZ;
	}
	else if( currentZ < maxValuesY.y &&
	         currentZ >= 0-maxValueLimits.z  )
	{
		maxValuesZ.y = currentZ;
	}
}
