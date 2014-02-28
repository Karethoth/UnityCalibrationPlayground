#pragma strict

var inputNode:GameObject;

private var inp:CalibratedInputScript;
private var calibrated:boolean = false;


function Start()
{
	inp = inputNode.GetComponent( CalibratedInputScript );
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


	// If we haven't yet calibrated, then we'll start the calibration
	if( !calibrated )
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
			calibrated = true;
			return;
		}
		
		// Print out some data during the calibration, like time and the current raw values.
		this.guiText.text = "" + inp.GetCalibrationTime() + "\n" +
		                    "X: " + vals.x + "\nY: " + vals.y;

		return;
	}

	// Show the calibrated values
	this.guiText.text = "X: " + vals.x + "\nY: " + vals.y;
}
