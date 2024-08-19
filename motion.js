////////////////////////////////////////////////////////////
// Keyframe   and   Motion  classes
////////////////////////////////////////////////////////////

class Keyframe {
   constructor(name,dt,avars,time=0.0) {
       this.name = name;
       this.dt = dt;                 // time since last keyframe
       this.avars = avars;           // animation variables
       this.time = time;             // absolute time of keyframe;  to be computed later
   };
}

class Motion {
    constructor(setMatricesFunc) {
	this.keyFrameArray = [];          // list of keyframes
	this.maxTime = 0.0;               // time of last keyframe
	this.currTime = 0.0;              // current playback time
	this.updateMatrices = setMatricesFunc;    // function to call to update transformation matrices
    };
    reset() {                     // go back to first keyframe
	this.currTime = 0.0;
    };
    addKeyFrame(keyframe) {               // add a new keyframe at end of list
	this.keyFrameArray.push(keyframe);
	this.maxTime += keyframe.dt;
	keyframe.time = this.maxTime;
    };
    print() {
	var nKF = this.keyFrameArray.length;
	for (var n=0; n<nKF; n++) {
	    console.log("Keyframe ",n, this.keyFrameArray[n]);
	}
    };
    timestep(dt) {                //  take a time-step
	this.currTime += dt;
	if (this.currTime > this.maxTime)  // loop to beginning if beyond end
	    this.currTime = 0;     
	if (this.currTime < 0.0)           // loop to end if beyond beginning (for negative dt)
	    this.currTime = this.maxTime;
//	var avars = this.getAvarsLinear();
	var avars = this.getAvarsSpline();
	this.updateMatrices(avars);
    };

    genMotionCurves(dt) {
	var curvePts = [];
	for (var t=0; t<this.maxTime; t+=dt) {
	    this.currTime = t;
//	    var avars = this.getAvarsLinear();
	    var avars = this.getAvarsSpline();
	    curvePts.push(avars);
	}
//	console.log(curvePts);
	return curvePts;
    };


	// ASSIGNMENT 2 Question 1A: COMMENTS ARE IN THIS FUNCTION
    getAvarsSpline() {       // Catmull-Rom spline interpolation across multiple segments
	var Mh = new THREE.Matrix4();     // hermite basis matrix
	Mh.set( 2, -2, 1, 1,        // set using row-major ordering
	   -3, 3, -2, -1,
	   0, 0, 1, 0,
	   1, 0, 0, 0 );
	var i = 1;      // begin with the first curve segment
	var eps=0.001;
	// console.log("currTime=",this.currTime);
	while (this.currTime > this.keyFrameArray[i].time)      // find the right pair of keyframes (i.e. which keyframes we're currently in between)
	    i++; 		// once we reach the end of our curve segment's time, move on to the next segment (ie. increment the index i)
	var avars = []; // initialize the avars array
	var nKF = this.keyFrameArray.length; ///nKF = number of key frames
	for (var n=0; n<this.keyFrameArray[i-1].avars.length; n++) {  //for every animation variable in the current keyframe
              // compute point indices
	    var i1 = i-2;  if (i1<0) i1=0;          // i1 = index of the control point one before where our current curve segment starts; if this index doesn't exist, set it to 0
	    var i2 = i-1;							// i2 = index of the control point at which the current curve segment starts
	    var i3 = i;								// i3 = index of the control point at which the current curve segment ends
	    var i4 = i+1;  if (i4>nKF-1) i4=nKF-1;  // i4 = index of the control point one after where our current curve segment ends; if this index doesn't exist, set to last control point's index
	    var kf1 = this.keyFrameArray[i1];		// kf1 = the key frame at control point i1
	    var kf2 = this.keyFrameArray[i2];		// kf2 = the key frame at control point i2
	    var kf3 = this.keyFrameArray[i3];		// kf3 = the key frame at control point i3
	    var kf4 = this.keyFrameArray[i4];		// kf4 = the key frame at control point i4
	    var y1 = kf1.avars[n],  t1 = kf1.time;	// y1 = the variable's value and t1 = absolute time, at the frame preceding the start of our current curve segment
	    var y2 = kf2.avars[n],  t2 = kf2.time; 	// y2 = the variable's value and t2 = absolute time, at the start of the current curve segment
	    var y3 = kf3.avars[n],  t3 = kf3.time; 	// y3 = the variable's value and t3 = absolute time, at the end of the current curve segment
	    var y4 = kf4.avars[n],  t4 = kf4.time; 	// y4 = the variable's value and t4 = absolute time, at the frame following the end of our current curve segment
	    var y2p = (t3-t2)*(y3-y1)/(t3-t1);		// y2p = tangent vector at position y2 (see comments below)
	    var y3p = (t3-t2)*(y4-y2)/(t4-t2);		// y3p = tangent vector at position y3 (see comments below)
	    var t = (this.currTime - t2)/(t3-t2);	// t = current time (scaled) to use for our T vector
	    var T = new THREE.Vector4( t*t*t, t*t, t, 1 );	// T = [t^3 t^2 t 1]
	    var G = new THREE.Vector4(y2,y3,y2p,y3p); 		// G = geometry vector of a Hermite curve (the 2 points and 2 tangent vectors of our current curve segment)
	    var A = G.applyMatrix4(Mh); 					// A = Hermite basis matrix * Hermite geometry vector of the nth variable
	    var val = T.dot(A);		// variable(t) = TA (aka variable(t) = TMG)
	    avars.push(val);		// add variable(t) to the spline's animation variables list 
	}
	/**
	 * DEALING WITH VARIABLE-SPACING IN THE TIME DOMAIN:
	 * In class, when we had evenly spaced times, we got the tangent at a point with 
	 * P(k) = 1/2 * (P(k+1) - P(k-1))
	 * But here, we often have unevenly spaced times. Thus, to calculate a tangent at a point P(k), instead
	 * of scaling the difference in variable positions by half, we instead scale by the time duration of our 
	 * current curve (i.e. point P(k) and the next point after it) divided by the time difference between 
	 * P(k)'s two adjacent points.
	 */
	

	return avars;
    };

    getAvarsLinear() {        // linear interpolation of values
	var i = 1;      // begin with the first curve segment
	while (this.currTime > this.keyFrameArray[i].time)      // find the right pair of keyframes
	    i++;
	var avars = [];
	for (var n=0; n<this.keyFrameArray[i-1].avars.length; n++) {   // interpolate the values
	    var y0 = this.keyFrameArray[i-1].avars[n];
	    var y1 = this.keyFrameArray[i].avars[n];
	    var x0 = this.keyFrameArray[i-1].time;
	    var x1 = this.keyFrameArray[i].time;
	    var x = this.currTime;
	    var y = y0 + (y1-y0)*(x-x0)/(x1-x0);    // linearly interpolate
	    avars.push(y);
	}
	return avars;         // return list of interpolated avars
    };
}

