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

private var menuVisible:boolean = false;
private var oldTouches:boolean = false; // Any touches during last update?
private var oldTouchPosition:Vector2;

private var menuPadding:float   = 10;
private var buttonPadding:float = 5;
private var buttonSize:Vector2  = Vector2( 130, 80 );
private var menuRect:Rect = Rect( menuPadding,
                                  menuPadding,
                                  buttonPadding*2 + buttonSize.x,
                                  buttonPadding*2 + buttonSize.y * 4 + buttonPadding * 4 );


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
		inp.inputFromGamepad = true;
	}

	// If we have an usable gyroscope, use it
	if( SystemInfo.supportsGyroscope )
	{
		Input.gyro.enabled = true;
		Input.gyro.updateInterval = 0.01;
	}

	// Set current orientation as the default one
	inp.UpdateZeroVector();

	// Set the infotext
	infoTextMesh.text = "Press or click\nthe screen to\nshow the menu";
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

	// Handle the logic of showing or hiding the menu
	// Calculate the point where user has clicked, if he has.
	var point:Vector2;
	var hasPoint:boolean = true;

	if( oldTouches && Input.touchCount == 0 )
	{
		point = oldTouchPosition;
		point.y = Screen.height - point.y;
	}
	else if( Input.GetMouseButtonUp( 0 ) )
	{
		point = Vector2( Input.mousePosition.x, Input.mousePosition.y );
		point.y = Screen.height - point.y;
	}
	else
	{
		hasPoint = false;
	}

	// Show the menu, if it's not visible and user has clicked something
	if( !menuVisible && hasPoint )
	{
		menuVisible = true;
		oldTouches  = false;

		// Hacky
		if( infoTextMesh.text == "Press or click\nthe screen to\nshow the menu" )
		{
			infoTextMesh.text = "";
		}
	}

	// Hide the menu if user clicked something else than it.
	else if( hasPoint && !menuRect.Contains( point ) )
	{
		menuVisible = false;
		oldTouches  = false;
	}
	else if( Input.touchCount > 0 )
	{
		oldTouches       = true;
		oldTouchPosition = Input.GetTouch( 0 ).position;
	}
}


function OnGUI()
{
	var buttonStyle = GUIStyle( "button" );
	buttonStyle.fontSize = 20;
	buttonStyle.wordWrap = true;

	if( !calibrating && menuVisible )
	{
		GUI.Box( menuRect, "" );
		var firstButtonPos:Vector2 = Vector2( menuRect.x + buttonPadding, menuRect.y + buttonPadding );

		var zeroVectorButton = GUI.Button(
			Rect( firstButtonPos.x,
			      firstButtonPos.y,
			      buttonSize.x,
			      buttonSize.y ),
			"Update Zero Vector",
			buttonStyle
		);

		var calibrateButton = GUI.Button(
			Rect( firstButtonPos.x,
			      firstButtonPos.y + buttonSize.y * 1 + buttonPadding * 1,
			      buttonSize.x,
			      buttonSize.y ),
			"Calibrate ratios",
			buttonStyle
		);


		var rangeLabel = inp.rangeHack ? "Normal Range" : "Extend range";
		var rangeHackButton = GUI.Button(
			Rect( firstButtonPos.x,
			      firstButtonPos.y + buttonSize.y * 2 + buttonPadding * 2,
			      buttonSize.x,
			      buttonSize.y ),
			rangeLabel,
			buttonStyle
		);

		var resetButton = GUI.Button(
			Rect( firstButtonPos.x,
			      firstButtonPos.y + buttonSize.y * 3 + buttonPadding * 3,
			      buttonSize.x,
			      buttonSize.y ),
			"Reset",
			buttonStyle
		);


		if( zeroVectorButton )
		{
			inp.UpdateZeroVector();
		}

		if( calibrateButton )
		{
			calibrating = true;
		}

		if( rangeHackButton )
		{
			inp.rangeHack = !inp.rangeHack;
		}

		if( resetButton )
		{
			inp.SetZeroVector( Vector3.zero );

			var defaultRatios = RatioInformation();
			inp.SetAxisRatios( defaultRatios );
		}
	}
}


function Clamper( vals:Vector3 )
{
	// Clamp axes to range -1.0 ... 1.0
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
