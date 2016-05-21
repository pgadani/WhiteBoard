//thanks to http://codepen.io/mikethedj4/pen/cnCAL

function Layer(path, color, thickness, drawType) { //deal with text and shapes later
	this.path = path;
	this.color = color; //the color of the stroke
	this.thickness = thickness;
	this.drawType = drawType; //0 for stroke, 1 for fill
}
Layer.prototype.toString = function() {
	return "strokeStyle: "+this.stroke+", fillStyle: "+this.fill+", thickness: "+this.thickness+"\n";
}
Layer.prototype.containsPoint = function(x, y) {
	var ctx = document.getElementById("board").getContext("2d");
	return ctx.isPointInStroke(this.path, x, y);
}

layers = [];

window.onload = function() {
	var canvas = document.getElementById("board");
	var ctx = canvas.getContext("2d");
	var overlay = document.getElementById("overlay");
	var octx = overlay.getContext("2d");

	// Fill Window Width and Height
	var toolHeight = $("#toolbar").height();
	var width = $(window).width();
	canvas.width = width;
	canvas.height = window.innerHeight - toolHeight - 15;
	overlay.width = width;
	overlay.height = window.innerHeight - toolHeight - 15;

	// Set Background Color
	ctx.fillStyle="#fff";
	ctx.fillRect(0,0,canvas.width,canvas.height);
	ctx.lineCap="round";
	ctx.strokeStyle="#000";
	ctx.fillStyle="#000";
	octx.lineCap="round";
	octx.strokeStyle="#000";
	octx.fillStyle="#000";

	var path = new Path2D();

	// Mouse Event Handlers
	if (canvas) {
		var isDown = false;
		var isMoved = false;
		var canvasX, canvasY;

		$(overlay)
		.mousedown(function(e) {
			isDown = true;
			isMoved = false;
			canvasX = e.pageX - canvas.offsetLeft;
			canvasY = e.pageY - canvas.offsetTop;
			octx.lineWidth = document.getElementById("strokeSize").value;
			ctx.lineWidth = document.getElementById("strokeSize").value;
			path = new Path2D();
			path.moveTo(canvasX, canvasY);
		})
		.mousemove(function(e) {
			canvasX = e.pageX - canvas.offsetLeft;
			canvasY = e.pageY - canvas.offsetTop;
			if (isDown) {
				isMoved = true;
				path.lineTo(canvasX, canvasY);
				octx.clearRect(0,0,canvas.width, canvas.height);
				octx.stroke(path);
			}
			else {
				var found = false;
				layers.forEach(function(l) {
					if (l.containsPoint(canvasX, canvasY)) {
						console.log("hovering over "+l);
						found = true;
						octx.clearRect(0,0,canvas.width, canvas.height);
						octx.lineWidth = l.thickness;
						if (l.drawType==0) {
							octx.strokeStyle = "rgba(255,255,255,0.4)";
							octx.stroke(l.path);
							octx.strokeStyle = ctx.strokeStyle;
						}
						else {
							octx.fillStyle = "rgba(255,255,255,0.4)";
							octx.fill(l.path);
							octx.fillStyle = ctx.fillStyle;
						}
						octx.lineWidth = ctx.lineWidth;
					}
				});
				if (!found) {
					octx.clearRect(0,0,canvas.width, canvas.height);
				}
			}
		})
		.mouseup(function(e) {
			isDown = false;
			if (isMoved) {
				octx.clearRect(0,0,canvas.width, canvas.height);
				ctx.stroke(path);
				var l = new Layer(path, ctx.strokeStyle, ctx.lineWidth, 0);
				layers.push(l);
				console.log("mouse "+layers);
			}
			else {
				// To create circles on just a click
				path.arc(canvasX, canvasY, ctx.lineWidth/2, 0, 2*Math.PI);
				ctx.fill(path);
				var l = new Layer(path, ctx.fillStyle, ctx.lineWidth, 1);
				layers.push(l);
				console.log("click "+layers)
			}
		});
	}

	// Touch Events Handlers
	draw = {
		started: false,
		isMoved: false,
		start: function(evt) {
			this.started = true;
			this.isMoved = false;
			canvasX = evt.touches[0].pageX - canvas.offsetLeft;
			canvasY = evt.touches[0].pageY - canvas.offsetTop;
			octx.lineWidth = document.getElementById("strokeSize").value;
			ctx.lineWidth = document.getElementById("strokeSize").value;
			path = new Path2D();
			path.moveTo(canvasX, canvasY);
			// console.log(evt);
		},
		move: function(evt) {
			if (this.started) {
				this.isMoved = true;
				canvasX = evt.touches[0].pageX - canvas.offsetLeft;
				canvasY = evt.touches[0].pageY - canvas.offsetTop;
				path.lineTo(canvasX, canvasY);
				octx.clearRect(0,0,canvas.width, canvas.height);
				octx.stroke(path);
				// console.log(evt);
			}
		},
		end: function(evt) {
			this.started = false;
			if (this.isMoved) {
				octx.clearRect(0,0,canvas.width, canvas.height);
				ctx.stroke(path);
				var l = new Layer(path, ctx.strokeStyle, ctx.lineWidth, 0);
				layers.push(l);
				console.log("touch "+layers);
			}
			// console.log(evt);
		}
	};

	// Touch Events
	overlay.addEventListener('touchstart', draw.start, false);
	overlay.addEventListener('touchend', draw.end, false);
	overlay.addEventListener('touchmove', draw.move, false);

	// Disable Page Move
	document.body.addEventListener('touchmove',function(evt){
		evt.preventDefault();
	},false);
	paletteInit();
};

function paletteInit() {
	$("#color").spectrum({
		color: "#000",
		showInput: true,
		showAlpha: true,
		className: "full-spectrum",
		showInitial: true,
		showPalette: true,
		showSelectionPalette: true,
		maxSelectionSize: 10,
		preferredFormat: "hex",
		localStorageKey: "spectrum.demo",
		move: function (color) {
		},
		show: function () {
		},
		beforeShow: function () {
		},
		hide: function () {
		},
		change: function(color) {
			ctx = document.getElementById("board").getContext("2d");
			octx = document.getElementById("overlay").getContext("2d");
			ctx.strokeStyle = color.toRgbString();
			ctx.fillStyle = color.toRgbString();
			octx.strokeStyle = color.toRgbString();
			octx.fillStyle = color.toRgbString();
		},
		palette: [
			["rgb(0, 0, 0)", "rgb(67, 67, 67)", "rgb(102, 102, 102)",
			"rgb(204, 204, 204)", "rgb(217, 217, 217)","rgb(255, 255, 255)"],
			["rgb(152, 0, 0)", "rgb(255, 0, 0)", "rgb(255, 153, 0)", "rgb(255, 255, 0)", "rgb(0, 255, 0)",
			"rgb(0, 255, 255)", "rgb(74, 134, 232)", "rgb(0, 0, 255)", "rgb(153, 0, 255)", "rgb(255, 0, 255)"],
			["rgb(230, 184, 175)", "rgb(244, 204, 204)", "rgb(252, 229, 205)", "rgb(255, 242, 204)", "rgb(217, 234, 211)",
			"rgb(208, 224, 227)", "rgb(201, 218, 248)", "rgb(207, 226, 243)", "rgb(217, 210, 233)", "rgb(234, 209, 220)",
			"rgb(221, 126, 107)", "rgb(234, 153, 153)", "rgb(249, 203, 156)", "rgb(255, 229, 153)", "rgb(182, 215, 168)",
			"rgb(162, 196, 201)", "rgb(164, 194, 244)", "rgb(159, 197, 232)", "rgb(180, 167, 214)", "rgb(213, 166, 189)",
			"rgb(204, 65, 37)", "rgb(224, 102, 102)", "rgb(246, 178, 107)", "rgb(255, 217, 102)", "rgb(147, 196, 125)",
			"rgb(118, 165, 175)", "rgb(109, 158, 235)", "rgb(111, 168, 220)", "rgb(142, 124, 195)", "rgb(194, 123, 160)",
			"rgb(166, 28, 0)", "rgb(204, 0, 0)", "rgb(230, 145, 56)", "rgb(241, 194, 50)", "rgb(106, 168, 79)",
			"rgb(69, 129, 142)", "rgb(60, 120, 216)", "rgb(61, 133, 198)", "rgb(103, 78, 167)", "rgb(166, 77, 121)",
			"rgb(91, 15, 0)", "rgb(102, 0, 0)", "rgb(120, 63, 4)", "rgb(127, 96, 0)", "rgb(39, 78, 19)",
			"rgb(12, 52, 61)", "rgb(28, 69, 135)", "rgb(7, 55, 99)", "rgb(32, 18, 77)", "rgb(76, 17, 48)"]
		]
	});
}
