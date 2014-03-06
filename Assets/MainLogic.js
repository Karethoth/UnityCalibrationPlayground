#pragma strict

var inputNode:GameObject;
var stickOne:GameObject;
var stickTwo:GameObject;
var sliderOne:GameObject;
var sliderTwo:GameObject;
var infoTextOne:GameObject;
var infoTextTwo:GameObject;
var infoTextBox:GameObject;

private var textMeshOne:TextMesh;
private var textMeshTwo:TextMesh;
private var infoTextMesh:TextMesh;


private var inp:CalibratedInputScript;
private var calibrating:boolean = false;

private var stickOneStartPos:Vector3;
private var stickTwoStartPos:Vector3;
private var sliderOneStartPos:Vector3;
private var sliderTwoStartPos:Vector3;

private var usingGamepad:boolean = false;


function Start()
{
	Screen.sleepTimeout = SleepTimeout.NeverSleep;
	inp = inputNode.GetComponent( CalibratedInputScript );

	inp.SetClampingDelegate( Clamper );

	textMeshOne = infoTextOne.GetComponent( TextMesh );
	textMeshTwo = infoTextTwo.GetComponent( TextMesh );
	infoTextMesh = infoTextBox.GetComponent( TextMesh );

	stickOneStartPos  = stickOne.transform.position;
	stickTwoStartPos  = stickTwo.transform.position;
	sliderOneStartPos = sliderOne.transform.position;
	sliderTwoStartPos = sliderTwo.transform.position;

	if( Application.platform == RuntimePlatform.WindowsPlayer    ||
	    Application.platform == RuntimePlatform.WindowsWebPlayer ||
	    Application.platform == RuntimePlatform.WindowsEditor )
	{
		usingGamepad = true;
		inp.inputFromGamepad = true;
	};
}



function Update()
{
	// This doesn't really belong in here,
	// but I'll let it be here for now.
	if( Input.GetKeyDown( KeyCode.Escape ) )
	{
		Application.Quit();
	}

	// Fetch the inputs. They are multiplied by two because
	// that is the needed length to reach the side of a pad.
	//  (This could also be accomplished by halving
	//   the reference values (setting them to 0.5).
	var vals:Vector3    = inp.acceleration  * 2.0;
	var rawVals:Vector3 = inp.GetRawInput() * 2.0;

	// Move sticks to corresponding positions.
	stickOne.transform.position = stickOneStartPos + Vector3( vals.x, vals.y, 0.0 );
	stickTwo.transform.position = stickTwoStartPos + Vector3( rawVals.x, rawVals.y, 0.0 );

	// Move the sliders too.
	sliderOne.transform.position = sliderOneStartPos + Vector3( 0, vals.z, 0.0 );
	sliderTwo.transform.position = sliderTwoStartPos + Vector3( 0, rawVals.z, 0.0 );

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
			infoTextMesh.text = "";
			return;
		}

		// Print out the time left for calibration:
		infoTextMesh.text = "Calibrating:\n" +
		                    (10 - inp.GetCalibrationTime()).ToString( "F1" );
	}

	// Print out the values
	textMeshOne.text = "X: "   + (vals.x * 0.5).ToString( "F2" ) +
	                   "\nY: " + (vals.y * 0.5).ToString( "F2" ) +
	                   "\nZ: " + (vals.z * 0.5).ToString( "F2" );

	textMeshTwo.text = "X: "   + (rawVals.x * 0.5).ToString( "F2" ) +
	                   "\nY: " + (rawVals.y * 0.5).ToString( "F2" ) +
	                   "\nZ: " + (rawVals.z * 0.5).ToString( "F2" );
}


function OnGUI()
{
	var buttonStyle = GUIStyle( "button" );
	buttonStyle.fontSize = 20;
	buttonStyle.wordWrap = true;

	GUI.Box( Rect( 10, 10, 150, 290 ), "" );

	if( !calibrating )
	{
		if( GUI.Button( Rect( 20, 30, 130, 80 ), "Update Zero Vector", buttonStyle ) )
		{
			inp.UpdateZeroVector();
		}

		if( GUI.Button( Rect( 20, 120, 130, 80 ), "Calibrate ratios", buttonStyle ) )
		{
			calibrating = true;
		}

		var label = inp.rangeHack ? "Normal Range" : "Extend range";
		if( GUI.Button( Rect( 20, 210, 130, 80 ), label, buttonStyle ) )
		{
			inp.rangeHack = !inp.rangeHack;
		}
	}
}


function Clamper( vals:Vector3 )
{
	if( vals.x > 1.0 )
		vals.x = 1.0;
	else if( vals.x < -1.0 )
		vals.x = -1.0;

	if( vals.y > 1.0 )
		vals.y = 1.0;
	else if( vals.y < -1.0 )
		vals.y = -1.0;

	if( vals.z > 1.0 )
		vals.z = 1.0;
	else if( vals.z < -1.0 )
		vals.z = -1.0;

	return vals;
}
