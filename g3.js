/*
---------------------------------------------------------------------
This is a custom, live-updating zoomable line chart implemented in D3.

The required input argument is just dataSrc, a string pointing to the
location of the php json server.

If you have questions, contact:
Author: Geoffrey Ji
E-mail: gji@umd.edu
---------------------------------------------------------------------
*/

var g3 = function(){};

g3._index = 0
g3._defaultColors = ["#4A6FE3","#11C638","#8E063B","#EF9708","#023FA5","#D33F6A","#0FCFC0","#F79CD4"]

g3.graph = function() {

    // Global variables (user-settable)
    this.dataSrc = ''; // Source of data. See php file for necessary getters.
    this.dataNames = []; // Names of data
    this.margins = {top: 10, right: 10, bottom: 10, left: 10};
    this.w = 500;
    this.h = 200;
    this.startI = 200;
    this.rounder = 6;
    this.liveUp = true;
    this.updateInt = 1000;
    this.dataDescs = [];
    this.dataColors = [];
    this.transitionSpeed = 500; // in ms
    this.autoTrans = true;

    // Global variables. These are mostly for the ability to sync joined-graph pan/zoom levels
    this.zoomer;
    this.updater;
    this.curGroup = [this]; // Set this with g3.joinScale
    this.gIndex = g3._index;

    // Update static variables
    g3._index++;

    // Local variables
    var that = this; // Need this because JS is flakey with the "this" keyword. Always reference that, not this!
    for (var n in arguments[0]) { this[n] = arguments[0][n]; } // Get all user-set vars
    for(var i=0; i<this.dataNames.length; i++) this.dataColors.push(g3._defaultColors[(i+this.gIndex)%(g3._defaultColors.length)]); // Throw on default colors

    width = this.w - this.margins.left - this.margins.right;
    height = this.h - this.margins.top - this.margins.bottom;

    var data; // Actual data
    var graph; // Handle to graph
    var xAxis; // Axis generators
    var yAxis;
    var x; // Coordinate generators
    var y;
    var line; // Reference to plotted data
    var cursor; // Reference to position cursor
    var latestTime; // Last time updated (in UNIX time)
    var upping = false; // Semaphore for updating
    var minT; // Earliest time with data entry
    var graphMotionSpeed;
    var bisect = d3.bisector(function(d) { return Math.round(d.time); }).left; // Bisector we will use multiple times
    var mD = false;

    this.plot = function() {
    d3.json(this.dataSrc + "/last/" + this.startI, function(error, json){
        if(error) return console.warn(error);
        data = json;
        minT = data[0].time * 1000;
        latestTime = data[data.length-1].time * 1000;
        that.setup();
	if(that.autoTrans) {
	    graphMotionSpeed = 1000*(data[1].time - data[0].time);
	}
        that.updater = setInterval(that.update, that.updateInt);
    });
    }

    this.setup = function() {
        // Set up axes
        var xd = d3.extent(data, function(d) {return new Date(1000*d.time);} ); 
        x = d3.time.scale().domain(xd).range([0,width]);

        var yd = d3.extent(data, function(d) {return (d[that.dataNames[0]]);} );
        if(yd[0] == yd[1]) {yd[0] = yd[0]*.9; yd[1] = yd[1]*1.1;}
        y = d3.scale.linear().domain([yd[0]-0.1*(yd[1]-yd[0]), yd[1]+0.1*(yd[1]-yd[0])]).range([height,0]);

        // Set up event listeners for zooming. The "true" causes the event listener to gain precedence over the built-in zoomer
        var graphObj = d3.select("body #g"+that.gIndex)//.attr("class", "graph")
        /*.on("mousedown", function(){ // Prevent updating when dragging the graph
            //mD = true;
            //clearInterval(that.updater);
            //that.setLiveUpdate(false);
        }, true).on("mouseup", function(){ // Restart updating, but ensure live updates are killed 
            //mD = false;
            //that.restartUps();
            //that.setLiveUpdate(false);
        }, true)*/.on("mousewheel", function(){ // Make sure we are updating synced graphs
            that.moveEvent(this);
        }, false).on("mousemove", function(){ // Update the cursor
            that.moveEvent(this);
        }, true)
	
	// special listener for mouseleave since mouseout fires whenever the dom element underneath the mouse changes, regardless if the cursor leaves!
	$("body #g"+that.gIndex).mouseleave( function(outevent){
            that.outEvent();
        })
	
	graphObj.attr("class", "graph").append("div").attr("class", "cpos").style("left", null).style("right", width);

        // this is the zooming object
        that.zoomer = d3.behavior.zoom().x(x).on("zoom", that.zoom);

        // Add main svg wrapper
        graph = d3.select(".graph#g"+that.gIndex).append("svg")
            .attr("width", width + that.margins.left + that.margins.right)
            .attr("height", height + that.margins.top + that.margins.bottom)
            .call(that.zoomer)
            .append("g")
            .attr("transform", "translate(" + that.margins.left + "," + that.margins.top + ")")

        // Add clippath for graph
        graph.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            //.attr("transform", "translate(1,0)")
            .attr("width", width)
            .attr("height", height);

        // Append axes
        xAxis = d3.svg.axis().scale(x).tickSize(16).tickSubdivide(true);
        graph.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        yAxis = d3.svg.axis().scale(y).ticks(4).tickSubdivide(true).orient("left");
        graph.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        // Line plot generator
        line = d3.svg.line()
            .interpolate("step-before")
            .x(function(d) { return x(new Date(1000*d.time)); })
            .y(function(d) { return y(d[that.dataNames[0]]); });

        // Line plot wrapper
        plot = graph.append("g")
            .attr("clip-path", "url(#clip)")
            .attr("class", "plot")

        // Actual data
        path = plot.append("path")
            .datum(data)
            .attr("stroke", that.dataColors[0])
            .attr("class", "line")
            .attr("d", line);

        // Cursor clipping rectangle
        d3.select(".graph#g"+that.gIndex+" svg").append("defs").append("clipPath")
            .attr("id", "clipCursor")
            .append("rect")
            .attr("transform", "translate(1,0)")
            .attr("width", width)
            .attr("height", height+that.margins['bottom']);

        // Adding the cursor
        cursor = d3.select(".graph#g"+that.gIndex+" svg").append("line")
            .attr("clip-path", "url(#clipCursor)")
            .attr("transform", "translate("+that.margins['left']+",0"+")")
            .attr("class", "cursor")
            .attr("x1",width)
            .attr("x2",width)
            .attr("y1",0)
            .attr("y2",height+that.margins['top']);

	that.goToLast();
    }

    // Event listeners
/*
    this.setLiveUpdate = function(lu) {
        objs = that.curGroup;
        for(var i=0; i<objs.length; i++) {
            objs[i].liveUp = lu;
        }
    }
*/
    this.moveEvent = function() {
        objs = that.curGroup;
        for(var i=0; i<objs.length; i++) {
            objs[i].zoomer.translate(that.zoomer.translate());
            objs[i].zoomer.scale(that.zoomer.scale());
            objs[i].liveUp = false;
            objs[i].updateCursor(false);
            objs[i].zoom();
            objs[i].updatePlot();
        }
    }
/*
    this.restartUps = function() {
        objs = that.curGroup;
        for(var i=0; i<objs.length; i++) {
            clearInterval(objs[i].updater);
            objs[i].updater = window.setInterval(objs[i].update, objs[i].updateInt);
        }
    }
*/
    this.outEvent = function() {
	objs = that.curGroup;
	for(var i=0; i<objs.length; i++) {
	    objs[i].liveUp = true;
	    objs[i].goToLast();
	    objs[i].zoom();
	    objs[i].update(); // Update immediately
	    objs[i].updateCursor(true);
	}
    }

    this.updateCursor = function() { // If first argument is true, we are live updating otherwise go to mouse position
        if(arguments[0] == true) {
            xp = width;
            dval = new Date(Math.round(latestTime));
            colored = "green";
            cursor.attr("transition", null).transition().duration(that.transitionSpeed).attr("x1", xp).attr("x2", xp).style("stroke", colored);
	    var dataPt = data[data.length-1];
        } else {
            var xp = d3.mouse(graph[0][0])[0];
            if(xp < 1) xp = 1;
            if(xp > width) xp = width;
            that.liveUp = false;
            dval = x.invert(xp);
            colored = "black";
            cursor.attr("transition", null).attr("x1", xp).attr("x2", xp).style("stroke", colored);
	    var place = bisect(data,dval.getTime()/1000);
	    var dataPt = data[place];
	} 
        var timeStr = this.updateCursorDateHelper(dval);
	var statusText = d3.select("#g"+that.gIndex+" .cpos");
        dataVal = ""
        if(dataPt != undefined && place != 0 ) {
            //var mult = Math.pow(10,this.rounder);
            //dataVal = Math.round(parseFloat(dataPt[that.dataNames[0]])*mult)/mult
            dataVal = parseFloat(dataPt[that.dataNames[0]]).toFixed(this.rounder);
            statusText.html(timeStr+"<br>"+that.dataDescs[0]+":<br><span class=\"info\">"+dataVal+"</span>");
        } else {
            statusText.html(timeStr+"<br>");
        }
        if(arguments[0] == true) {
	    if(statusText.style("right") != (that.margins['right']+4)+"px") { 
		// fancy stuff to make text transition back
		if(statusText.style("left") == "auto" && statusText.attr("transition") == "") {
		    statusText.attr("transition", null)
			.transition().duration(that.transitionSpeed)
			.style("right", (that.margins['right']+4)+"px");
		} else {
		    statusText
			.style("right", width-(parseFloat(statusText.style("left").replace("px",""))-that.margins['right']+statusText[0][0].offsetWidth) + "px")
			.style("left", "auto")
			.transition().duration(that.transitionSpeed)
			.style("right", (that.margins['right']+4)+"px")
			.style("text-align", "right");
		}
	    }
        } else {
            if(xp>width/2) { // switch sides if over halfway
                statusText.style("left","auto").style("right", (width-xp+that.margins['right']+4)+"px").style("text-align", "right");
            } else {
                statusText.style("right","auto").style("left", (xp+that.margins['left']+4)+"px").style("text-align", "left");
            }
        }
    }

    this.updateCursorDateHelper = function(dval) {
        var format = d3.time.format("%Y-%m-%d %H:%M:%S");
        var pad = "000";
        var n = dval.getMilliseconds();
        var result = (pad+n).slice(-pad.length);
        return format(dval)+"."+result;
    }

    this.zoom = function() {
        xAxis.scale(x);
	minDispVal = x.invert(0).getTime();
	screenLength = latestTime - minDispVal;
        if(minDispVal<minT) {
            minT = minDispVal - (screenLength)*1; // grab an extra screenlength for fluidity
            that.update(minT);
        } else if(minT < (minDispVal - (screenLength)*2) && data.length > 120) { // if minT is way too big (at least two screenlengths)
            var bpos = bisect(data, minDispVal - (screenLength)*1);
            if(data.length-bpos < 101) bpos = data.length-101; // at least keep 100 points
            data.splice(0,bpos);
            minT = data[0].time * 1000;
        }
	graph.select(".x.axis").transition().ease("linear").duration(graphMotionSpeed).call(xAxis);
        if(!mD) that.scaleY();
        that.updatePlot();
    }

    this.update = function() {
        if(arguments.length>0) { // update called by zoom, so we may need old data
	    liveUp = false;
            if(upping) { // Currently updating, set up listener to wait for new data
                window.setTimeout(that.update, 500, arguments[0]);
                return;
            }
            upping = true;
            d3.json(that.dataSrc + "/time/after/"+(arguments[0]/1000).toString(), function(error,json){updateCallback(error, json, true);});
        } else {
            if(!upping) {
                upping = true;
                d3.json(that.dataSrc + "/time/after/"+(latestTime/1000).toString(), function(error,json){updateCallback(error, json, false);});
            }
        }
    }

    updateCallback = function(error, json, zoom){
	if(error) return console.warn(error);
	if(!(json.length > 0)) {
	    upping = false;
	    return;
	}
	latestTime = 1000*json[json.length-1].time;
	if(zoom) data = json;
	else {
	    data = data.concat(json);
	    data.splice(0,json.length-1);
	}
	that.scaleY();
	if(that.liveUp) that.goToLast();
	that.updatePlot();
	upping = false;
    };

    this.goToLast = function() {
	var oldPos = that.zoomer.translate()[0];
        var past = (x(latestTime)-that.zoomer.translate()[0]-that.zoomer.scale()*width)/that.zoomer.scale(); // Javascript date constructor is standard unix time but in ms...??
        var oldTrans = -(that.zoomer.scale()*(width)) + width;
	var newPos = -past+oldTrans-past*(that.zoomer.scale()-1);
	that.zoomer.translate([newPos,0]);
	console.log("setting up transition!");
	path.attr("transform", null).attr("transform", "translate("+(oldPos - newPos).toString() + ",0)");
	if(graphMotionSpeed != 0) {
	    path.transition().ease("linear").duration(graphMotionSpeed*0.99).attr("transform", "translate(0,0)").each("end", calcTrans);
	    graphMotionSpeed = 0;
	} else {
	    graphMotionSpeed = 0;
	}
        that.zoom();
        that.updateCursor(true);
    }

    calcTrans = function() {
	if(graphMotionSpeed == 0) { // if it is 0, we have not yet tried to run another transition, so we can set it up.
	    graphMotionSpeed = 1000*(data[1].time - data[0].time);
	    path.transition().ease("linear").duration(graphMotionSpeed).attr("transform", "translate(0,0)").each("end", calcTrans);
	    graphMotionSpeed = 0;
	} else {
	}
    }

    this.scaleY = function() {
        var bisect = d3.bisector(function(d) { return Math.round(1000*d.time); }).left; // Javascript date constructor is standard unix time but in ms...??
        var place = bisect(data,x.invert(0).getTime());
        var yd = d3.extent(data.slice(place, data.length), function(d) {return (d[that.dataNames[0]]);} );
        if(yd[0] == yd[1]) {yd[0] = yd[0]*.9; yd[1] = yd[1]*1.1;}
        y.domain([yd[0]-0.1*(yd[1]-yd[0]), yd[1]+0.1*(yd[1]-yd[0])]).range([height,0]);
        yAxis.scale(y);
        graph.select(".y.axis").transition().duration(that.transitionSpeed).call(yAxis);
    }

    this.updatePlot = function() {
        d3.select("#g"+that.gIndex).select(".plot .line").datum(data);
        d3.select("#g"+that.gIndex).select(".plot .line").attr("d", line);
    }
}

g3.joinScale = function() {
    for(var i=0; i<arguments.length; i++) {
        arguments[i].curGroup = arguments;
        arguments[i].dataColors = arguments[0].dataColors;
    }
}
