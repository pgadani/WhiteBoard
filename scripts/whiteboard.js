//thanks to http://codepen.io/mikethedj4/pen/cnCAL
window.onload = function() {
	var canvas = document.getElementById("board");
	var ctx = canvas.getContext("2d");

	// Fill Window Width and Height
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	// Set Background Color
	ctx.fillStyle="#fff";
	ctx.fillRect(0,0,canvas.width,canvas.height);
	ctx.fillStyle="#000";

	// Mouse Event Handlers
	if (canvas) {
		var isDown = false;
		var isMoved = false;
		var canvasX, canvasY;
		ctx.lineWidth = document.getElementById("strokeSize").value;

		$(canvas)
		.mousedown(function(e){
			isDown = true;
			isMoved = false;
			ctx.lineWidth = document.getElementById("strokeSize").value
			ctx.beginPath();
			canvasX = e.pageX - canvas.offsetLeft;
			canvasY = e.pageY - canvas.offsetTop;
			ctx.moveTo(canvasX, canvasY);
		})
		.mousemove(function(e){
			if(isDown !== false) {
				isMoved = true;
				canvasX = e.pageX - canvas.offsetLeft;
				canvasY = e.pageY - canvas.offsetTop;
				ctx.lineTo(canvasX, canvasY);
				//ctx.strokeStyle = "#000";
				ctx.stroke();
			}
		})
		.mouseup(function(e){
			isDown = false;
			if (isMoved) {
				ctx.closePath();
			}
			else {
				ctx.rect(canvasX-ctx.lineWidth/2, canvasY-ctx.lineWidth/2, ctx.lineWidth, ctx.lineWidth);
				ctx.fill();
			}
		});
	}

	// Touch Events Handlers
	draw = {
		started: false,
		start: function(evt) {
			ctx.beginPath();
			ctx.moveTo(
				evt.touches[0].pageX - canvas.offsetLeft,
				evt.touches[0].pageY - canvas.offsetTop
			);
			this.started = true;
		},
		move: function(evt) {
			if (this.started) {
				ctx.lineTo(
					evt.touches[0].pageX - canvas.offsetLeft,
					evt.touches[0].pageY - canvas.offsetTop
				);
				//ctx.strokeStyle = "#000";
				ctx.lineWidth = document.getElementById("strokeSize").value;
				ctx.stroke();
			}
		},
		end: function(evt) {
			this.started = false;
		}
	};

	// Touch Events
	canvas.addEventListener('touchstart', draw.start, false);
	canvas.addEventListener('touchend', draw.end, false);
	canvas.addEventListener('touchmove', draw.move, false);

	// Disable Page Move
	document.body.addEventListener('touchmove',function(evt){
		evt.preventDefault();
	},false);
	paletteInit();
};

function paletteInit() {
	$("#color").spectrum({
		color: "#000000",
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
			ctx.strokeStyle = color.toRgbString();
			ctx.fillStyle = color.toRgbString();
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
