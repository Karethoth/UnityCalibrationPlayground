#pragma strict

// This is the variable the CalibratedInputScript looks for.
static var calibrationScheme = ChaoticCalibration();


// Example calibration scheme.
// Chaotic calibration: uses the maximum values gotten
// during the calibration as the reference to calculate ratios.
public class ChaoticCalibration extends CalibrationScheme
{
	// Reference values, which are used to calculate the ratio.
	private var referenceValues:Vector3 = Vector3( 1.0, 1.0, 1.0 );

	// The reference values can't be more than
	// the maximum values, desided by the developer.
	private var maxValueLimits:Vector3  = Vector3( 1.0, 1.0, 1.0 );

	// These are used to hold the current maximum values
	private var maxValuesX:Vector2 = Vector2( 0.01, -0.01 );
	private var maxValuesY:Vector2 = Vector2( 0.01, -0.01 );
	private var maxValuesZ:Vector2 = Vector2( 0.01, -0.01 );


	// This is the start function, which is
	// called when new calibration takes place.
	public function Start()
	{
		maxValuesX = Vector2( 0.01, 0.01 );
		maxValuesY = Vector2( 0.01, 0.01 );
		maxValuesZ = Vector2( 0.01, 0.01 );
	}

	// And this is called when calibration process stops.
	// It has to return an object, containing ratios as
	// Vector2 types as x, y and z in an object.
	public function End():RatioInformation
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

		var ratiosX = Vector2( ratioPositiveX, ratioNegativeX );
		var ratiosY = Vector2( ratioPositiveY, ratioNegativeY );
		var ratiosZ = Vector2( ratioPositiveZ, ratioNegativeZ );

		// And we shall return an object, containing the ratios:
		var ratios:RatioInformation = RatioInformation(
			ratiosX,
			ratiosY,
			ratiosZ
		);

		return ratios;
	}


	public function Step( currentValues:Vector3, zeroVector:Vector3 )
	{
		currentValues  -= zeroVector;
		var currX:float = currentValues.x;
		var currY:float = currentValues.y;
		var currZ:float = currentValues.z;

		// Check if the current X value goes over any of so far
		// observed maximum values but still remains below the hard limits.
		if( currX > maxValuesX.x &&
		    currX <= maxValueLimits.x )
		{
			maxValuesX.x = currX;
		}
		else if( currX < maxValuesX.y &&
		         currX >= 0-maxValueLimits.x)
		{
			maxValuesX.y = currX;
		}

		// Do the same for the Y value.
		if( currY > maxValuesY.x &&
		    currY <= maxValueLimits.y )
		{
			maxValuesY.x = currY;
		}
		else if( currY < maxValuesY.y &&
		         currY >= 0-maxValueLimits.y  )
		{
			maxValuesY.y = currY;
		}

		// And for the Z value.
		if( currZ > maxValuesZ.x &&
		    currZ <= maxValueLimits.z )
		{
			maxValuesZ.x = currZ;
		}
		else if( currZ < maxValuesY.y &&
		         currZ >= 0-maxValueLimits.z  )
		{
			maxValuesZ.y = currZ;
		}
	}
}
