var svgSnap;				// Snap's reference to svg element (basically the canvas)
var svgDiv;					// For div of svg, global for offset
var selectedColor = "#000";
var thickness;				// element holding the path width
var boardActive = true; 	// false when the spectrum selector is open so users can click out of it
var selectedElemData = [];
var copiedElements = [];
var metadata = {};			// stores bbox data for each path
var pk = 0;					// counter used to assign unique keys to paths

var multiInfo;
var oldColors;

var transformType = {
	TRANSLATE: 0,
	ROTATE: 1
};
var currTransform;			// will store type of transformation and associated data like beginning point or angle

var pointerType = {
	DRAW: 0,
	ERASE: 1,
	SELECT: 2
};
var currPointer = pointerType.DRAW;

// Stacks to remember actions for undo/redo
var actionsToUndo = [];
var actionsToRedo = [];

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
	thickness.max="100";

	thickness.addEventListener("input", function() {
		thicknessVal.value = this.value;
	});
	thicknessVal.addEventListener("input", function() {
		var num = parseInt(this.value);
		if (!isNaN(num) && num>=parseInt(thickness.min) && num<=parseInt(thickness.max)) {
			thickness.value = num;
			this.value = thickness.value;
		}
		// else do nothing since the value is invalid but it's intermediate, like if someone clears the text field
	});
	thicknessVal.addEventListener("change", function() {
		var num = parseInt(this.value);
		if (isNaN(num) || num<parseInt(thickness.min) || num>parseInt(thickness.max)) {
			alert("Please enter an integer between 1 and 300");
			thickness.value = initThickness;
			this.value = thickness.value;
		}
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
		actionsToUndo.push(new PathAction(selectedElemData.slice(), null));
		// hide bbox AND delete each item
		selectedElemData.forEach(function(item) {
			item.hide();
			item.path.remove();
		});
		selectedElemData = [];
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
		selectedElemData.forEach(function(item) {
			// var clone = item.clone();
			var clone = svgSnap.el(item.path.type); //create a new element of the same type
			clone.attr(item.path.attr()); //copy all the attributes like path and stroke
			addMetadata(clone);
			clone.remove();
			copiedElements.push(clone);
		});
	};
	var pasteSelectedElements = function() {
		//paste the copied elements, add their bboxes, and select them
		pointerSelect();
		clearSelectedElements();
		copiedElements.forEach(function(elem) {
			svgSnap.append(elem);
			let bbox = metadata[elem.attr("id").slice(1)];
			bbox.show();
			selectedElemData.push(bbox);
		});
		// not using a copy of the array since we never remove anything from it
		actionsToUndo.push(new PathAction(null, selectedElemData.slice()));
		// reclone copied elements to allow for pasting multiple times
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
				let elems = svgSnap.selectAll(".drawn");
				elems.forEach(function(elem) {
					let bbox = metadata[elem.attr("id").slice(1)];
					bbox.show();
					selectedElemData.push(bbox);
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

window.onload = function() {
	toolbarSetup();
	//disabling dragging since firefox has glitches with dragging svg elements
	document.body.ondragstart = function() {
		return false;
	};
	document.body.ondrop = function() {
		return false;
	};
	// Disable Page Move
	document.body.addEventListener("touchmove",function(evt){
		evt.preventDefault();
	},false);

	// Get DOM elements and null check
	var toolBar = document.getElementById("toolbar"),
		svg = document.getElementById("board"),
		svgDiv = document.getElementById("board-container");

	// null == FALSE
	if (!toolBar || !svgDiv || !svg) {
		reportError();
		return;
	}

	// Fill Window Width and Height
	var toolHeight = toolBar.clientHeight,
		width = window.innerWidth,
		height = window.innerHeight;
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
		path, // the svg path element, the element at the user's mouse
		pInfo;	// the data inside the svg path element (xy coordinates)

	// Mouse Event Handlers
	var beginMovement = function(e) {
		// if the user is selecting a color, don't draw
		if (!boardActive) return;
		isDown = true;
		// e is global coordinates, svgDiv is the canvas top left corner
		canvasX = e.pageX - svgDiv.offsetLeft;
		canvasY = e.pageY - svgDiv.offsetTop;
		if (currPointer===pointerType.DRAW || currPointer===pointerType.ERASE) {
			var color = (currPointer===pointerType.DRAW) ? selectedColor:"white";
			isMoved = false;
			// M starts a path
			pInfo = "M"+canvasX+","+canvasY;
			path = svgSnap.path(pInfo);
			path.attr({
				strokeWidth: thickness.value,
				stroke: color,
				fill: "none",
				strokeLinecap: "round",	// shape at ends of paths (for smoothing)
				strokeLinejoin: "round"	// shape at corner of paths (for smoothing)
			});
		}
		else if (currPointer===pointerType.SELECT) {
			svg.style.cursor = "move";
			let elem = $(e.target);
			if (elem.hasClass("recirc")) { // The selected element is a circle for a bbox
				clearSelectedElements();
				let sBox = metadata[elem.parent().attr("id").slice(1)];
				sBox.show();
				selectedElemData.push(sBox); // get the original path from the associate circle
				if (elem.hasClass("c10")) { // For rotation
					console.log("Start Rotate");
					currTransform = {
						type: transformType.ROTATE,
						start: [canvasX, canvasY],
						angle: 0
					};
				}
				else {
					currTransform = null; // eventually add resizing
				}
			}
			else if (elem.hasClass("drawn")) { // bbox so users can't select the bounding box circles
				console.log("Select");
				let sBox = metadata[elem.attr("id").slice(1)];
				let index = selectedElemData.indexOf(sBox);
				if (e.ctrlKey) {
					// deselect if already selected, remove both bbox and elem
					if (index>=0) {
						sBox.hide();
						selectedElemData.splice(index,1); // remove this element
					}
					// add it if it's not
					else {
						sBox.show();
						selectedElemData.push(sBox);
					}
				}
				else if (index===-1){
					clearSelectedElements();
					sBox.show();
					selectedElemData.push(sBox);
				}
				//no canvasXY since we only need differences in values
				currTransform = {
					type: transformType.TRANSLATE,
					start: [e.pageX, e.pageY],
					end: [e.pageX, e.pageY]
				};
			}
			else {
				clearSelectedElements();
				currTransform = null;
			}
		}
	};

	var movement = function(e) {
		if (isDown) {
			// e is global coordinates, svgDiv is the canvas top left corner
			canvasX = e.pageX - svgDiv.offsetLeft;
			canvasY = e.pageY - svgDiv.offsetTop;
			if (currPointer===pointerType.DRAW || currPointer===pointerType.ERASE) {
				isMoved = true;
				// L is continuation of a path, i.e. another point
				pInfo += "L"+canvasX+","+canvasY;
				path.attr({d: pInfo});
			}
			else if (currPointer===pointerType.SELECT && currTransform) {
				if (currTransform.type===transformType.TRANSLATE) {
					//no canvasXY since we only need differences in values
					var diffX = e.pageX - currTransform.end[0];
					var diffY = e.pageY - currTransform.end[1];
					currTransform.end = [e.pageX, e.pageY];
					selectedElemData.forEach(function(item) {
						item.translateAll(diffX, diffY);
					});
				}
				else if (currTransform.type===transformType.ROTATE) {
					//there should be exactly one selected element
					var p = [canvasX, canvasY];
					var angle = angleBetween(currTransform.start, selectedElemData[0].center, p)*180/Math.PI+180;
					selectedElemData[0].rotateAll(angle-currTransform.angle);
					currTransform.angle = angle;
				}
			}
		}
	};

	var endMovement = function(e) {
		isDown = false;
		// e is global coordinates, svgDiv is the canvas top left corner
		canvasX = e.pageX - svgDiv.offsetLeft;
		canvasY = e.pageY - svgDiv.offsetTop;
		if (e.type === "touchend") {
			// if the movement was a touchend, pageX/Y will be NaN because nothing is being touched
			canvasX = e.changedTouches[0].pageX - svgDiv.offsetLeft;
			canvasY = e.changedTouches[0].pageY - svgDiv.offsetTop;
		}
		if ( (currPointer===pointerType.DRAW || currPointer===pointerType.ERASE) && path) { // When the user wants to draw
			var color = (currPointer===pointerType.DRAW) ? selectedColor:"white";
			if (!isMoved && e.type != "touchend") {
				path.remove();
				// chrome creates both a touchend event and a mouseup event so this prevents duplicate circles
				// the path doesn't show so we make a circle
				// parameters: center x, center y, radius
				path = svgSnap
					.circle(canvasX, canvasY, thickness.value/2)
					.attr({fill: color});
			}

			if (isMoved || e.type!="touchend") {
				// create a custom bbox now that the path has stopped moving
				let bbox = addMetadata(path);

				// PathAction takes a list of paths
				actionsToUndo.push(new PathAction(null, [bbox]));
				// forget any previously undone actions
				actionsToRedo = [];
			}
		}
		else if (currPointer===pointerType.SELECT) { // When the user wants to select
			svg.style.cursor = "pointer";
			if (currTransform) {
				if (currTransform.type===transformType.TRANSLATE) {
					var changeX, changeY;
					if (e.type==="touchend") {
						// touch events can potentially have multiple points
						// so we just use the first
						changeX = e.changedTouches[0].pageX - currTransform.start[0];
						changeY = e.changedTouches[0].pageY - currTransform.start[1];
					}
					else {
						// e is global coordinates, svgDiv is the canvas top left corner
						changeX = e.pageX - currTransform.start[0];
						changeY = e.pageY - currTransform.start[1];
					}
					// add an action only if the element actually moved
					if (selectedElemData.length>0 && (changeX!==0 || changeY!==0)) {
						actionsToUndo.push(new TranslateAction(selectedElemData.slice(), changeX, changeY));
						//copy selectedElements in case it is later edited
						actionsToRedo = [];
					}
				}
				else if (currTransform.type===transformType.ROTATE) {
					//there should be exactly one selected element
					var p = [canvasX, canvasY];
					var angle = angleBetween(currTransform.start, selectedElemData[0].center, p)*180/Math.PI+180;
					selectedElemData[0].rotateAll(angle-currTransform.angle);
					currTransform.angle = angle;
					actionsToUndo.push(new RotateAction(selectedElemData[0], currTransform.angle));
					actionsToRedo = [];
				}
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
};


function clearSelectedElements() {
	// remove all selected elements and remove bbox from canvas
	selectedElemData.forEach(function(item) {
		item.hide();
	});
	selectedElemData = [];
}

function angleBetween(p1, p2, p3) {
	// 1 is the starting point, 2 is the center, 3 is the end
	// Uses a rotation matrix to position one vector on the x-axis
	// The rotation of x,y is [x, y; -y, x] (makes the second coordinate 0)
	// After the rotation, the angle is found with atan2
	var x21 = p2[0]-p1[0];
	var y21 = p2[1]-p1[1];
	var x32 = p3[0]-p2[0];
	var y32 = p3[1]-p2[1];
	var dot = x21*x32 + y21*y32;
	var cross = x21*y32 - x32*y21;
	return Math.atan2(cross, dot);
}

function addMetadata(currPath) {
	currPath.addClass("drawn");
	currPath.attr("id","p"+pk);
	metadata[pk] = new SelectionBox(currPath);
	// store bbox based on path's id
	pk++;

	// mouse listeners automatically check for correct mouse position
	// handles the "preview" of a bbox
	currPath
	.mouseover(function(e) {
		//checking that no buttons are pressed so that the hovering box is not shown when dragging other elements
		if (currPointer===pointerType.SELECT && e.buttons===0) {
			metadata[this.attr("id").slice(1)].show();
		}
	})
	.mouseout(function() {
		let bbox = metadata[this.attr("id").slice(1)];
		if (selectedElemData.indexOf(bbox)===-1) {
			bbox.hide();
		}
	});
	return metadata[pk-1];
}

function setPenColor(color) {
	// set stroke in correct format
	selectedColor = color.toRgbString();
	// need to pass every color into ColorAction
	multiInfo = [];
	selectedElemData.forEach(function(item) {
		// get old color, set new color using the correct attribute
		let info;
		let colType = (item.path.type == "path") ? "stroke" : "fill";
		info = [item.path, oldColors[item.path.attr("id")], selectedColor];
		item.path.attr(colType, selectedColor);
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
			if (selectedElemData.length > 0) {
				selectedElemData.forEach(function (item) {
					let colType = (item.path.type == "path") ? "stroke" : "fill";
					oldColors[item.path.attr("id")] = item.path.attr(colType);
				});
			}
		},
		beforeShow: function () {
		},
		hide: function () {
			boardActive = true;
			if (selectedElemData.length > 0 && multiInfo.length > 0) {
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
