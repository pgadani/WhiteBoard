var svgSnap;
var wColor = "#000";
var pointerType = 0; //0 for paint, 1 for select
var actionsToUndo = [];
var actionsToRedo = [];
var selectedElements = [];
var beginDragX, beginDragY;
var dragX, dragY;

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

//takes the transformation strings
var TranslateAction = function(elems, changeX, changeY) {
	this.elems = elems; //eventually to be an array of elements
	this.changeX = changeX;
	this.changeY = changeY;
}

TranslateAction.prototype.undoAction = function() {
	changeX = this.changeX;
	changeY = this.changeY;
	if (this.elems) {
		this.elems.forEach(function(elem) {
			transM = elem.transform().localMatrix;
			transM.translate(-changeX, -changeY);
			elem.transform(transM);
			elem.bbox.elem.transform(transM);
		})
	}
}

TranslateAction.prototype.redoAction = function() {
	if (this.elems) {
		this.elems.forEach(function(elem) {
			transM = elem.transform().localMatrix;
			transM.translate(this.changeX, this.changeY);
			elem.transform(transM);
			elem.bbox.elem.transform(transM);
		})
	}
}

function toolbarSetup() {
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
	var undoButton = document.getElementById("undo");
	var redoButton = document.getElementById("redo");
	var paint = document.getElementById("paint");
	var select = document.getElementById("select");
	if (!undoButton || !redoButton || !paint || !select) {
		reportError();
		return;
	}
	undoButton.addEventListener("click", function() {
		if (actionsToUndo.length > 0) {
			var currAction = actionsToUndo.pop();
			currAction.undoAction();
			actionsToRedo.push(currAction);
		}
	});
	redoButton.addEventListener("click", function() {
		if (actionsToRedo.length > 0) {
			var currAction = actionsToRedo.pop();
			currAction.redoAction();
			actionsToUndo.push(currAction);
		}
	});
	paint.classList.add("selected");
	paint.addEventListener("click", function() {
		pointerType = 0;
		this.classList.toggle("selected");
		select.classList.toggle("selected");
	});
	select.addEventListener("click", function() {
		pointerType = 1;
		this.classList.toggle("selected");
		paint.classList.toggle("selected");
	})
}

window.onload = function() {
	toolbarSetup();

	//disabling dragging since firefox has glitches with dragging svg elements
	document.body.ondragstart = function() {
		return false;
	};
	document.body.ondrop = function() {
		return false;
	};

	// Get DOM elements and null check
	var toolBar = document.getElementById("toolbar");
	var svgDiv = document.getElementById("board-container");
	var svg = document.getElementById("board");

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
		if (pointerType==0) { // This is when the user wants to draw
			isDown = true;
			isMoved = false;
			canvasX = e.pageX - svgDiv.offsetLeft;
			canvasY = e.pageY - svgDiv.offsetTop;
			pInfo = "M"+canvasX+","+canvasY;
			path = svgSnap.path(pInfo);
			path.attr({
				strokeWidth: document.getElementById("strokeSize").value,
				stroke: wColor,
				fill: "none",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			});
		}
		else if (pointerType==1) { // When the user wants to select
			svg.style.cursor = "move";
		}
	})
	.mousemove(function(e) {
		if (pointerType==0 && isDown) { //When the user wants to draw
			canvasX = e.pageX - svgDiv.offsetLeft;
			canvasY = e.pageY - svgDiv.offsetTop;
			isMoved = true;
			pInfo += "L"+canvasX+","+canvasY;
			path.attr({d: pInfo});
		}
		else if (pointerType==1 && e.buttons==1 && selectedElements.length>0) {
			selectedElements.forEach(function(elem) {
				transM = elem.transform().localMatrix;
				transM.translate(e.pageX - dragX, e.pageY - dragY);
				elem.transform(transM);
				elem.bbox.elem.transform(transM);
			})
			dragX = e.pageX;
			dragY = e.pageY;
			//we can use pageX and pageY here without worrying about the offset since we only need differences in values
		}
	})
	.mouseup(function(e) {
		isDown = false;
		if (pointerType==0) { // When the user wants to draw
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
			path.bbox = {
				elem: svgSnap
					.rect(x,y,width, height)
					.attr({
						fill: "none",
						strokeWidth: "1px",
						stroke: "gray"
					})
					.remove(), //forming the path for the bounding box
				show: function() {
					if (this.elem.parent() === null) {
						this.elem.appendTo(svgSnap);
					}
				},
				hide: function() {
					this.elem.remove();
				}
			};
			path
			.mouseover(function() {
				if (pointerType==1) {
					this.bbox.show();
				}
			})
			.mousedown(function(evt) {
				if (pointerType==1) {
					selectedElements.push(this);
					dragX = evt.pageX;
					dragY = evt.pageY;
					beginDragX = evt.pageX;
					beginDragY = evt.pageY;
				}
			})
			.mouseout(function() {
				this.bbox.hide();
			});

			actionsToUndo.push(new PathAction(null, path));
			actionsToRedo = [];
		}
		else if (pointerType==1) { // When the user wants to select
			svg.style.cursor = "pointer";
			if (selectedElements.length>0) {
				elems = selectedElements;
				actionsToUndo.push(new TranslateAction(elems, e.pageX - beginDragX, e.pageY - beginDragY));
				actionsToRedo = [];
				selectedElements = [];
			}
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
