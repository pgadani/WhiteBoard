var svgSnap;				// Snap's reference to svg element (basically the canvas)
var selectedColor = "#000";
var boardActive = true; 	// false when the spectrum selector is open so users can click out of it
var selectedElements = [];
var copiedElements = [];

var beginDragX, beginDragY;
var endDragX, endDragY;

var pointerType = {
	DRAW: 0,
	ERASE: 1,
	SELECT: 2
};
var currPointer = pointerType.DRAW;

var thickness;				// element holding the path width

// Stacks to remember actions for undo/redo
var actionsToUndo = [];
var actionsToRedo = [];

function clearSelectedElements() {
	// remove all selected elements and remove bbox from canvas
	selectedElements.forEach(function(item) {
		item.data("bbox").hide();
	});
	selectedElements = [];
}

function reportError() {
	// just in case the canvas doesn't show
	// NOTE: may remove since alert makes this repetitives
	var errorText = document.createElement("p");
	errorText.innerHTML = "Toolbar setup error";
	document.body.appendChild(errorText);

	alert("Toolbar error");
}

function toolbarSetup() {
	thickness = document.getElementById("strokeSize");

	var color = document.getElementById("color"),
		thicknessVal = document.getElementById("strokeSizeVal"),
		undoButton = document.getElementById("undo"),
		redoButton = document.getElementById("redo"),
		paint = document.getElementById("paint"),
		erase = document.getElementById("erase"),
		select = document.getElementById("select"),
		remove = document.getElementById("remove"),
		svg = document.getElementById("board");

	// null == FALSE
	if (!color || !thickness || !thicknessVal || !undoButton || !redoButton || !paint || !erase || !select || !remove) {
		reportError();
		return;
	}

	//toolbar setup, do this first so height calculations work out
	paletteInit();
	color.value=selectedColor;

	var initThickness = "5";
	thicknessVal.value = initThickness;
	thickness.value=initThickness;
	thickness.min="1";
	thickness.max="300";

	thickness.addEventListener("input", function() {
		thicknessVal.value = this.value;
	});
	thicknessVal.addEventListener("change", function() {
		var num = parseInt(this.value);
		if (isNaN(num) || num<parseInt(thickness.min) || num>parseInt(thickness.max)) {
			alert("Please enter an integer between 1 and 300");
		}
		else {
			thickness.value = num;
		}
		this.value = thickness.value;
	});

	var undo = function() {
		// undo action and move from undo stack to redo stack
		if (actionsToUndo.length > 0) {
			var currAction = actionsToUndo.pop();
			currAction.undoAction();
			actionsToRedo.push(currAction);
		}
		clearSelectedElements();
	};
	var redo = function() {
		// redo action and move from redo stack to undo stack
		if (actionsToRedo.length > 0) {
			var currAction = actionsToRedo.pop();
			currAction.redoAction();
			actionsToUndo.push(currAction);
		}
		clearSelectedElements();
	};
	var del = function() {
		actionsToUndo.push(new PathAction(selectedElements, null));
		// hide bbox AND delete each item
		selectedElements.forEach(function(item) {
			item.data("bbox").hide();
			item.remove();
		});
		selectedElements = [];
	};
	var pointerSelect = function() {
		currPointer = pointerType.SELECT;
		svg.style.cursor = "pointer";
		if (!select.classList.contains("selected")) {
			select.classList.add("selected");
			erase.classList.remove("selected");
			paint.classList.remove("selected");
		}
	};
	var copySelectedElements = function() {
		//clone each element in case it is later deleted/edited
		copiedElements = [];
		selectedElements.forEach(function(item) {
			var clone = item.clone();
			addSelectionBox(clone);
			clone.remove();
			copiedElements.push(clone);
		});
	};
	var pasteSelectedElements = function() {
		//paste the copied elements, add their bboxes, and select them
		pointerSelect();
		clearSelectedElements();
		copiedElements.forEach(function(item) {
			item.appendTo(svgSnap);
			console.log(item);
			console.log(item.data("bbox"));
			item.data("bbox").show();
			selectedElements.push(item);
		});
		//not using a copy of the array since we never remove anything from it
		actionsToUndo.push(new PathAction(null, copiedElements));
		//reclone copied elements to allow for pasting multiple times
		copySelectedElements();
	};


	undoButton.addEventListener("click", undo);
	redoButton.addEventListener("click", redo);
	remove.addEventListener("click", del);

	document.addEventListener("keyup", function(evt) {
		switch(evt.key) {
		case "z":
			if (evt.ctrlKey) undo();
			break;
		case "y":
			if (evt.ctrlKey) redo();
			break;
		case "a":
			if (evt.ctrlKey) {
				clearSelectedElements();
				//selecting all the elements within the svg, can't use * because of description and other children that can't be displayed
				selectedElements = [].concat(svgSnap.selectAll("path").items, svgSnap.selectAll("circle").items);
				selectedElements.forEach(function(item) {
					item.data("bbox").show();
				});
				//switching to selecting pointer
				pointerSelect();
			}
			break;
		case "c":
			if (evt.ctrlKey) copySelectedElements();
			break;
		case "v":
			if (evt.ctrlKey) pasteSelectedElements();
			break;
		case "Del":
		case "Delete":
		case "Backspace":
			del();
			break;
		}
	});

	// paint is the default choice
	paint.classList.add("selected");
	paint.addEventListener("click", function() {
		currPointer = pointerType.DRAW;
		svg.style.cursor = "crosshair";
		if (!paint.classList.contains("selected")) {
			paint.classList.add("selected");
			erase.classList.remove("selected");
			select.classList.remove("selected");
		}
		clearSelectedElements();
	});

	erase.addEventListener("click", function() {
		currPointer = pointerType.ERASE;
		svg.style.cursor = "crosshair";
		if (!erase.classList.contains("selected")) {
			erase.classList.add("selected");
			paint.classList.remove("selected");
			select.classList.remove("selected");
		}
		clearSelectedElements();
	});

	select.addEventListener("click", pointerSelect);
}

function angleBetween(x1, y1, x2, y2, x3, y3) {
	// 1 is the starting point, 2 is the center, 3 is the end
	// Uses a rotation matrix to position one vector on the x-axis
	// The rotation of x,y is [x, y; -y, x] (makes the second coordinate 0)
	// After the rotation, the angle is found with atan2
	var x21 = x2-x1,
		y21 = y2-y1,
		x32 = x3-x2,
		y32 = y3-y2,
		dot = x21*x32 + y21*y32,
		cross = x21*y32 - x32*y21;
	return atan2(cross, dot);
}

function addSelectionBox(currPath) {
	var minBBoxSize = 16;
	var bbox = currPath.getBBox(),
		x = bbox.x,
		y = bbox.y,
		width = bbox.width,
		height = bbox.height;

	if (currPath.type === "path") {
		//not a circle, which has the correct bbox for the stroke thickness
		var offset = thickness.value/2;
		x -= offset;
		y -= offset;
		width += 2*offset;
		height += 2*offset;
	}

	//creating a larger bbox for small elements to make resizing/rotating easier
	if (width < minBBoxSize) {
		x-=minBBoxSize/2;
		width+=minBBoxSize;
	}
	if (height < minBBoxSize) {
		y-=minBBoxSize/2;
		height+=minBBoxSize;
	}

	// drag circles in the middle of each side and at each corner
	var c1 = svgSnap.circle(x, y, 2),
		c2 = svgSnap.circle(x+width/2, y, 2),
		c3 = svgSnap.circle(x+width, y, 2),
		c4 = svgSnap.circle(x+width, y+height/2, 2),
		c5 = svgSnap.circle(x+width, y+height, 2),
		c6 = svgSnap.circle(x+width/2, y+height, 2),
		c7 = svgSnap.circle(x, y+height, 2),
		c8 = svgSnap.circle(x, y+height/2, 2),
		// rotate circle above the top in the middle
		c9 = svgSnap.circle(x+width/2, y-20, 2),
		// rotate circle has a line connecting to the box
		l = svgSnap.path("M" + (x+width/2) + "," + (y-20) + "L" + (x+width/2) + "," + y);

	var boxData = {
		//forming the path for the bounding box
		box: svgSnap
			.rect(x,y,width, height)
			.attr({
				fill: "none",
				strokeWidth: "1px",
				stroke: "gray"
			})
			.remove(), // don't put it in the canvas
		recirc: svgSnap.g()
			.add(c1, c2, c3, c4, c5, c6, c7, c8, c9, l)
			.attr({
				fill: "black",
				strokeWidth: "1px",
				stroke: "gray"
			})
			.remove(), // don't put it in the canvas
		show: function() {
			if (this.box.parent() === null) {
				this.box.appendTo(svgSnap);
				this.recirc.appendTo(svgSnap);
			}
		},
		hide: function() {
			this.box.remove();
			this.recirc.remove();
		},
		transformAll: function(transM) {
			this.box.transform(transM);
			this.recirc.transform(transM);
		}
	};

	// attach custom bbox to the path (not actually visible)
	currPath.data("bbox", boxData);
	// mouse listeners automatically check for correct mouse position
	// handles the "preview" of a bbox
	currPath
	.mouseover(function(e) {
		//checking that no buttons are pressed so that the hovering box is not shown when dragging other elements
		if (currPointer===pointerType.SELECT && e.buttons===0) {
			this.data("bbox").show();
		}
	})
	.mouseout(function() {
		if (selectedElements.indexOf(this)===-1) {
			this.data("bbox").hide();
		}
	});

	var cx = x + width/2;
	var cy = y + height/2;

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
	var toolBar = document.getElementById("toolbar"),
		svgDiv = document.getElementById("board-container"),
		svg = document.getElementById("board");

	// null == FALSE
	if (!toolBar || !svgDiv || !svg) {
		reportError();
		return;
	}

	// Fill Window Width and Height
	var toolHeight = toolBar.clientHeight;
	var width = window.innerWidth;
	var height = window.innerHeight;
	// if units are strings, then they must have px at the end
	// height of canvas is the rest of the window height (give or take 10)
	svgDiv.style.width = width.toString() + "px";
	svgDiv.style.height = (height - toolHeight - 10).toString() + "px";
	svg.style.width = width.toString() + "px";
	svg.style.height = (height - toolHeight - 10).toString() + "px";

	svgSnap = Snap("#board");

	var isDown = false,
		isMoved = false,
		canvasX, canvasY,
		path, 	// the svg path element
		pInfo;	// the data inside the svg path element (xy coordinates)

	// Mouse Event Handlers
	var beginMovement = function(e) {
		// if the user is selecting a color, don't draw
		if (!boardActive) return;
		isDown = true;
		if (currPointer===pointerType.DRAW) {
			isMoved = false;
			// e is global coordinates, svgDiv is the canvas top left corner
			canvasX = e.pageX - svgDiv.offsetLeft;
			canvasY = e.pageY - svgDiv.offsetTop;
			// M starts a path
			pInfo = "M"+canvasX+","+canvasY;
			path = svgSnap.path(pInfo);
			path.attr({
				strokeWidth: thickness.value,
				stroke: selectedColor,
				fill: "none",
				strokeLinecap: "round",	// shape at ends of paths (for smoothing)
				strokeLinejoin: "round"	// shape at corner of paths (for smoothing)
			});
		}
		else if (currPointer===pointerType.ERASE) {
			isMoved = false;
			// e is global coordinates, svgDiv is the canvas top left corner
			canvasX = e.pageX - svgDiv.offsetLeft;
			canvasY = e.pageY - svgDiv.offsetTop;
			// M starts a path
			pInfo = "M"+canvasX+","+canvasY;
			path = svgSnap.path(pInfo);
			path.attr({
				strokeWidth: thickness.value,
				stroke: "white",
				fill: "none",
				strokeLinecap: "round",	// shape at ends of paths (for smoothing)
				strokeLinejoin: "round"	// shape at corner of paths (for smoothing)
			});
		}
		else if (currPointer===pointerType.SELECT) {
			svg.style.cursor = "move";
			var elem = Snap.getElementByPoint(e.pageX, e.pageY);
			console.log(elem);
			console.log(elem.data("bbox"));
			if ((elem.type==="path" || elem.type==="circle") && elem.data("bbox")) { //bbox so users can't select the bounding box circles
				if (e.ctrlKey) {
					// deselect if already selected, remove both bbox and elem
					if (selectedElements.indexOf(elem)>=0) {
						elem.data("bbox").hide();
						selectedElements.splice(selectedElements.indexOf(elem),1);
					}
					// add it if it's not
					else {
						selectedElements.push(elem);
					}
				}
				else if (selectedElements.indexOf(elem)===-1){
					clearSelectedElements();
					selectedElements.push(elem);
				}
				//no canvasXY since we only need differences in values
				endDragX = e.pageX;
				endDragY = e.pageY;
				beginDragX = e.pageX;
				beginDragY = e.pageY;
			}
			else {
				clearSelectedElements();
			}
		}
	};

	var movement = function(e) {
		if (isDown) {
			if (currPointer===pointerType.DRAW) {
				isMoved = true;
				// e is global coordinates, svgDiv is the canvas top left corner
				canvasX = e.pageX - svgDiv.offsetLeft;
				canvasY = e.pageY - svgDiv.offsetTop;
				// L is continuation of a path, i.e. another point
				pInfo += "L"+canvasX+","+canvasY;
				path.attr({d: pInfo});
			}
			else if (currPointer===pointerType.ERASE) {
				isMoved = true;
				// e is global coordinates, svgDiv is the canvas top left corner
				canvasX = e.pageX - svgDiv.offsetLeft;
				canvasY = e.pageY - svgDiv.offsetTop;
				// L is continuation of a path, i.e. another point
				pInfo += "L"+canvasX+","+canvasY;
				path.attr({d: pInfo});
			}
			else if (currPointer===pointerType.SELECT && selectedElements.length>0) {
				//no canvasXY since we only need differences in values
				selectedElements.forEach(function(elem) {
					// create translation matrix
					var transM = elem.transform().localMatrix;
					transM.translate(e.pageX - endDragX, e.pageY - endDragY);

					elem.data("bbox").transformAll(transM);
					elem.transform(transM);
				});
				endDragX = e.pageX;
				endDragY = e.pageY;
			}
		}
	};
	var endMovement = function(e) {
		isDown = false;
		if (currPointer===pointerType.DRAW && path) { // When the user wants to draw
			if (!isMoved) {
				path.remove();
				// chrome creates both a touchend event and a mouseup event so this prevents duplicate circles
				if (e.type != "touchend") {
					// the path doesn't show so we make a circle
					// e is global coordinates, svgDiv is the canvas top left corner
					canvasX = e.pageX - svgDiv.offsetLeft;
					canvasY = e.pageY - svgDiv.offsetTop;
					// parameters: center x, center y, radius
					path = svgSnap.circle(canvasX, canvasY, thickness.value/2);
					path.attr({fill: selectedColor});
				}
			}

			// create a custom bbox now that the path has stopped moving
			addSelectionBox(path);

			// PathAction takes a list of paths
			actionsToUndo.push(new PathAction(null, [path]));
			// forget any previously undone actions
			actionsToRedo = [];
		}
		else if (currPointer===pointerType.ERASE && path) {
			if (e.type != "touchend" && !isMoved) {
				// the path doesn't show so we make a circle
				path.remove();
				// e is global coordinates, svgDiv is the canvas top left corner
				canvasX = e.pageX - svgDiv.offsetLeft;
				canvasY = e.pageY - svgDiv.offsetTop;
				// parameters: center x, center y, radius
				path = svgSnap.circle(canvasX, canvasY, thickness.value/2);
				path.attr({fill: "white"});
			}

			// create a custom bbox now that the path has stopped moving
			addSelectionBox(path);

			// PathAction takes a list of paths
			actionsToUndo.push(new PathAction(null, [path]));
			// forget any previously undone actions
			actionsToRedo = [];
		}
		else if (currPointer===pointerType.SELECT) { // When the user wants to select
			svg.style.cursor = "pointer";
			var changeX, changeY;
			if (e.type==="touchend") {
				// touch events can potentially have multiple points
				// so we just use the first
				changeX = e.changedTouches[0].pageX - beginDragX;
				changeY = e.changedTouches[0].pageY - beginDragY;
			}
			else {
				// e is global coordinates, svgDiv is the canvas top left corner
				changeX = e.pageX - beginDragX;
				changeY = e.pageY - beginDragY;
			}
			// add an action only if the element actually moved
			if (selectedElements.length>0 && (changeX!==0 || changeY!==0)) {
				actionsToUndo.push(new TranslateAction(selectedElements.slice(), changeX, changeY));
				//copy selectedElements in case it is later edited
				actionsToRedo = [];
			}
		}
	};

	svgSnap
	.mousedown(beginMovement)
	.mousemove(movement)
	.mouseup(endMovement);
	svg.addEventListener("mouseleave", function(e) {
		if (isDown) {
			endMovement(e);
		}
	});
	//so that dragging the mouse off the board ends the movement

	// Disable Page Move
	document.body.addEventListener("touchmove",function(evt){
		evt.preventDefault();
	},false);
};

var multiInfo;
var oldColors;

function setPenColor(color) {
	// set stroke in correct format
	selectedColor = color.toRgbString();
	// need to pass every color into ColorAction
	multiInfo = [];
	selectedElements.forEach(function(item) {
		// get old color, set new color using the correct attribute
		var info;
		if (item.type == "path") {
			info = [item, oldColors[item.id], selectedColor];
			item.attr("stroke", selectedColor);
		}
		else if (item.type == "circle") {
			info = [item, oldColors[item.id], selectedColor];
			item.attr("fill", selectedColor);
		}
		multiInfo.push(info);
	});
}

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
		hideAfterPaletteSelect: true,
		preferredFormat: "hex",
		localStorageKey: "color_selector",
		move: function (color) {
			setPenColor(color);
		},
		show: function () {
			boardActive = false;
			multiInfo = [];
			oldColors = [];
			if (selectedElements.length > 0) {
				selectedElements.forEach(function (item) {
					if (item.type == "path") {
						oldColors[item.id] = item.attr("stroke");
					}
					else if (item.type == "circle") {
						oldColors[item.id] = item.attr("fill");
					}
				});
			}
		},
		beforeShow: function () {
		},
		hide: function () {
			boardActive = true;
			if (selectedElements.length > 0 && multiInfo.length > 0) {
				actionsToUndo.push(new ColorAction(multiInfo));
			}
		},
		change: function() {
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
