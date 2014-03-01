#pragma strict

var inputNode:GameObject;
var stickNodeOne:GameObject;
var stickNodeTwo:GameObject;

private var inp:CalibratedInputScript;
private var calibrating:boolean = false;
private var stickOneStartPos:Vector3;
private var stickTwoStartPos:Vector3;


function Start()
{
	Screen.sleepTimeout = SleepTimeout.NeverSleep;
	inp = inputNode.GetComponent( CalibratedInputScript );

	stickOneStartPos = stickNodeOne.transform.position;
	stickTwoStartPos = stickNodeTwo.transform.position;
}



function Update()
{
	// This doesn't really belong in here,
	// but I'll let it be here for now.
	if( Input.GetKeyDown( KeyCode.Escape ) )
	{
		Application.Quit();
	}

	// Fetch the inputs.
	var vals:Vector2    = inp.GetInput();
	var rawVals:Vector2 = inp.GetRawInput();

	// Move sticks to corresponding positions.
	stickNodeOne.transform.position = stickOneStartPos + Vector3( vals.x, vals.y, 0.0 );
	stickNodeTwo.transform.position = stickTwoStartPos + Vector3( rawVals.x, rawVals.y, 0.0 );

	// Handle calibration logic on this side.
	if( calibrating )
	{
		// If the input node isn't yet calibrating, it's time to start
		if( !inp.IsCalibrating() )
		{
			inp.StartCalibration();
			return;
		}

		// We'll limit the calibration now by time: 10 seconds.
		if( inp.GetCalibrationTime() >= 10 )
		{
			inp.EndCalibration();
			calibrating = false;
			return;
		}

		// Print out some data during the calibration, like time and the current raw values.
		this.guiText.text = "" + (10 - inp.GetCalibrationTime()) + "\n" +
		                    "X: " + vals.x + "\nY: " + vals.y;

		return;
	}

	// Show the calibrated values
	this.guiText.text = "X: " + vals.x + "\nY: " + vals.y;
}


function OnGUI()
{
	GUI.Box( Rect( 10, 10, 160, 90 ), "Calibration Menu" );

	if( GUI.Button( Rect( 20, 40, 140, 20 ), "Update Zero Vector" ) )
	{
		inp.UpdateZeroVector();
	}

	if( !calibrating )
	{
		if( GUI.Button( Rect( 20, 70, 140, 20 ), "Calibrate ratios" ) )
		{
			calibrating = true;
		}
	}
}
