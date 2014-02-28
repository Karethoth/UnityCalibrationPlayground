#pragma strict

var inputNode:GameObject;
var stickNode:GameObject;

private var inp:CalibratedInputScript;
private var calibrating:boolean = false;
private var stickStartPos:Vector3;


function Start()
{
	Screen.sleepTimeout = SleepTimeout.NeverSleep;
	inp = inputNode.GetComponent( CalibratedInputScript );
	stickStartPos = stickNode.transform.position;
}



function Update()
{
	// This doesn't really belong in here,
	// but I'll let it be here for now.
	if( Input.GetKeyDown( KeyCode.Escape ) )
	{
		Application.Quit();
	}

	// Fetch the input, calibrated or not.
	var vals:Vector2 = inp.GetInput();

	// Move the stick to corresponding position.
	var stickPosition:Vector3 = stickStartPos;
	stickPosition.x += vals.x;
	stickPosition.y += vals.y;
	stickNode.transform.position = stickPosition;

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
