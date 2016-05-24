var svgSnap;
var wColor = "#000";
var actionsToUndo = [];
var actionsToRedo = [];
var selectedElements = [];
var dragX = 0
var dragY = 0;

function reportError() {
	var errorText = document.createElement("p");
	errorText.innerHTML = "Toolbar setup error";
	document.body.appendChild(errorText);
}

var PathAction = function(pre, post) {
	this.pre = pre;
	this.post = post;
};

PathAction.prototype.undoAction = function() {
	if (this.pre) {
		svgSnap.append(this.pre);
	}

	if (this.post) {
		this.post.remove();
	}
};

PathAction.prototype.redoAction = function() {
	if (this.pre) {
		this.pre.remove();
	}

	if (this.post) {
		svgSnap.append(this.post);
	}
};

function actionButtonSetup() {
	var undoButton = document.getElementById("undo");
	var redoButton = document.getElementById("redo");
	if (!undoButton || !redoButton) {
		reportError();
		return;
	}

	undoButton.addEventListener('click', function() {
		if (actionsToUndo.length > 0) {
			var currAction = actionsToUndo.pop();
			currAction.undoAction();
			actionsToRedo.push(currAction);
		}
	});

	redoButton.addEventListener('click', function() {
		if (actionsToRedo.length > 0) {
			var currAction = actionsToRedo.pop();
			currAction.redoAction();
			actionsToUndo.push(currAction);
		}
	});
}

window.onload = function() {
	// set up undo and redo
	actionButtonSetup();

	//disabling dragging since firefox has glitches with dragging svg elements
	document.body.ondragstart = function() {
		return false;
	};
	document.body.ondrop = function() {
		return false;
	};

	var color = document.getElementById("color");
	var thickness = document.getElementById("strokeSize");
	var thicknessVal = document.getElementById("strokeSizeVal");
	if (!color || !thickness || !thicknessVal) {
		reportError();
		return;
	}

	//toolbar setup, do this first so height calculations work out
	paletteInit();
	color.value="#000";
	thickness.value="5";
	thickness.min="1";
	thickness.max="300";
	thicknessVal.value = "5";
	thickness.addEventListener("input", function() {
		thicknessVal.value = this.value;
	});
	thicknessVal.addEventListener("change", function() {
		var num = parseInt(this.value);
		if (isNaN(num) || num<1 || num>300) {
			this.value = thickness.value;
			alert("Please enter an integer between 1 and 300");
		}
		else {
			this.value = num;
			thickness.value = num;
		}
	});

	// Get DOM elements and null check
	var toolBar = document.getElementById("toolbar");
	var svgDiv = document.getElementById("board-container");
	var svg = document.getElementById("board");
	// These are the buttons to select the type of action
	var paint = document.getElementById("paint");
	var select = document.getElementById("select");

	if (!toolBar || !svgDiv || !svg || !paint || !select) {
		// error handling
		reportError();
		return;
	}

	// Fill Window Width and Height
	var toolHeight = toolBar.clientHeight;
	var width = window.innerWidth;

	svgDiv.style.width = width.toString() + "px";
	svgDiv.style.height = (window.innerHeight - toolHeight - 10).toString() + "px";
	svg.style.width = width.toString() + "px";
	svg.style.height = (window.innerHeight - toolHeight - 10).toString() + "px";

	svgSnap = Snap("#board");

	// Change Cursors for different Action Types
	paint.addEventListener("click", function c() {
		svg.style.cursor = "crosshair";
	});
	select.addEventListener("click", function c() {
		svg.style.cursor = "pointer";
	});

	// Mouse Event Handlers
	var isDown = false;
	var isMoved = false;
	var canvasX, canvasY;
	var path;
	var pInfo;

	svgSnap
	.mousedown(function(e) {
		if (paint.checked) { // This is when the user wants to draw
			isDown = true;
			isMoved = false;
			// canvasX = e.pageX - svgDiv.offsetLeft;
			// canvasY = e.pageY - svgDiv.offsetTop;
			// pInfo = "M" + canvasX + "," + canvasY;
			pInfo = "M"+e.layerX+","+e.layerY;
			path = svgSnap.path(pInfo);
			path.attr({
				strokeWidth: document.getElementById("strokeSize").value,
				stroke: wColor,
				fill: "none",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			});
		}
		else if (select.checked) { // When the user wants to select
			svg.style.cursor = "move";
		}
	})
	.mousemove(function(e) {
		if (paint.checked && isDown) { //When the user wants to draw
			// canvasX = e.pageX - svgDiv.offsetLeft;
			// canvasY = e.pageY - svgDiv.offsetTop;
			isMoved = true;
			// pInfo += " L" + canvasX.toString() + " " + canvasY.toString();
			pInfo += "L"+e.layerX+","+e.layerY;
			path.attr({d: pInfo});
		}
		else if (select.checked && e.buttons==1 && selectedElements.length>0) {
			selectedElements.forEach(function(elem) {
				transM = elem.transform().localMatrix;
				transM.translate(e.layerX - dragX, e.layerY - dragY);
				elem.transform(transM);
				elem.bbox.elem.transform(transM);
			})
			dragX = e.layerX;
			dragY = e.layerY;
		}
	})
	.mouseup(function(e) {
		isDown = false;
		if (paint.checked) { // When the user wants to draw
			if (e.type != "touchend" && !isMoved) {
				path.remove();
				canvasX = e.pageX - svgDiv.offsetLeft;
				canvasY = e.pageY - svgDiv.offsetTop;
				path = svgSnap.circle(canvasX, canvasY, document.getElementById("strokeSize").value/2);
				path.attr({fill: wColor});
			}
			var bbox = path.getBBox();
			var x = bbox.x;
			var y = bbox.y;
			var width = bbox.width;
			var height = bbox.height;
			if (path.type == "path") {
				//not a circle, which has the correct bbox for the stroke thickness
				var offset = document.getElementById("strokeSize").value/2;
				x -= offset;
				y -= offset;
				width += 2*offset;
				height += 2*offset;
			}
			var c1 = svgSnap.circle(x, y, 2);
			var c2 = svgSnap.circle(x+width/2, y, 2);
			var c3 = svgSnap.circle(x+width, y, 2);
			var c4 = svgSnap.circle(x+width, y+height/2, 2);
			var c5 = svgSnap.circle(x+width, y+height, 2);
			var c6 = svgSnap.circle(x+width/2, y+height, 2);
			var c7 = svgSnap.circle(x, y+height, 2);
			var c8 = svgSnap.circle(x, y+height/2, 2);
			path.bbox = {
				elem: svgSnap
					.rect(x,y,width, height)
					.attr({
						fill: "none",
						strokeWidth: "1px",
						stroke: "gray"
					})
					.remove(), //forming the path for the bounding box
				// recirc: svgSnap.g()
				// 	.add(c1, c2, c3, c4, c5, c6, c7, c8);
				// 	.attr({
				// 		fill: "gray"
				// 		stroke: "none"
				// 	})
				// 	.remove()
				show: function() {
					if (this.elem.parent() === null) {
						this.elem.appendTo(svgSnap);
						this.recirc.appendTo(svgSnap);
					}
				},
				hide: function() {
					this.elem.remove();
					this.recirc.remove();
				}
			};
			path
			.mouseover(function() {
				if (select.checked) {
					this.bbox.show();
				}
			})
			.mousedown(function(evt) {
				if (select.checked) {
					selectedElements.push(this);
					dragX = evt.layerX;
					dragY = evt.layerY;
					// this.clickX = evt.layerX;
					// this.clickY = evt.layerY;
					// this.transM = this.transform().localMatrix;
				}
			})
			// .mousemove(function(evt) {
			// 	//reimplement this keeping track of clicked/selected elements and moving all of them (would work even for fast movements that "leave" the path)
			// 	if (select.checked && evt.buttons==1) {
			// 		console.log("dragging");
			// 		newM = this.transM.clone().translate(evt.layerX - this.clickX, evt.layerY - this.clickY);
			// 		this.transform(newM);
			// 		this.bbox.elem.transform(newM);
			// 	}
			// })
			.mouseout(function() {
				this.bbox.hide();
			});

			actionsToUndo.push(new PathAction(null, path));
			actionsToRedo = [];
		}
		else if (select.checked) { // When the user wants to select
			svg.style.cursor = "pointer";
			selectedElements.splice(0,selectedElements.length);
		}
	});

	// Disable Page Move
	document.body.addEventListener('touchmove',function(evt){
		evt.preventDefault();
	},false);
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
		localStorageKey: "color_selector",
		move: function (color) {
		},
		show: function () {
		},
		beforeShow: function () {
		},
		hide: function () {
		},
		change: function(color) {
			wColor = color.toRgbString();
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
