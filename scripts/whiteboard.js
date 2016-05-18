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

	// Mouse Event Handlers
	if (canvas) {
		var isDown = false;
		var canvasX, canvasY;
		ctx.lineWidth = 5;

		$(canvas)
		.mousedown(function(e){
			isDown = true;
			ctx.beginPath();
			canvasX = e.pageX - canvas.offsetLeft;
			canvasY = e.pageY - canvas.offsetTop;
			ctx.moveTo(canvasX, canvasY);
		})
		.mousemove(function(e){
			if(isDown !== false) {
				canvasX = e.pageX - canvas.offsetLeft;
				canvasY = e.pageY - canvas.offsetTop;
				ctx.lineTo(canvasX, canvasY);
				ctx.strokeStyle = "#000";
				ctx.stroke();
			}
		})
		.mouseup(function(e){
			isDown = false;
			ctx.closePath();
		});
	}

	// Touch Events Handlers
	draw = {
		started: false,
		start: function(evt) {
			ctx.beginPath();
			ctx.moveTo(
				evt.touches[0].pageX,
				evt.touches[0].pageY
			);
			this.started = true;
		},
		move: function(evt) {
			if (this.started) {
				ctx.lineTo(
					evt.touches[0].pageX,
					evt.touches[0].pageY
				);
				ctx.strokeStyle = "#000";
				ctx.lineWidth = 5;
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
};
