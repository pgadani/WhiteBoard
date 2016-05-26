var svgSnap;
var wColor = "#000";
var pointerType = 0; //0 for paint, 1 for select
var boardActive = true; //false when the spectrum selector is open so users can click out of it
var actionsToUndo = [];
var actionsToRedo = [];
var selectedElements = [];
var beginDragX, beginDragY;
var dragX, dragY;

var PathAction = function(prev, post) {
	this.prev = prev;
	this.post = post;
};

PathAction.prototype.undoAction = function() {
	if (this.prev) {
		this.prev.forEach(function(item) {
			svgSnap.append(item);
		});
	}

	if (this.post) {
		this.post.forEach(function(item) {
			item.data("bbox").hide();
			item.remove();
		});
	}
};

PathAction.prototype.redoAction = function() {
	if (this.prev) {
		this.prev.forEach(function(item) {
			item.data("bbox").hide();
			item.remove();
		});
	}

	if (this.post) {
		this.post.forEach(function(item) {
			svgSnap.append(item);
		});
	}
};

var TranslateAction = function(elems, changeX, changeY) {
	this.elems = elems;
	this.changeX = changeX;
	this.changeY = changeY;
};

TranslateAction.prototype.undoAction = function() {
	var changeX = this.changeX;
	var changeY = this.changeY;
	if (this.elems) {
		this.elems.forEach(function(elem) {
			var transM = elem.transform().localMatrix;
			transM.translate(-changeX, -changeY);
			elem.data("bbox").transformAll(transM);
			elem.transform(transM);
		});
	}
};

TranslateAction.prototype.redoAction = function() {
	var changeX = this.changeX;
	var changeY = this.changeY;
	if (this.elems) {
		this.elems.forEach(function(elem) {
			var transM = elem.transform().localMatrix;
			transM.translate(changeX, changeY);
			elem.data("bbox").transformAll(transM);
			elem.transform(transM);
		});
	}
};

// for color changes
var ColorAction = function(elems) {
	this.elems = elems;
};

ColorAction.prototype.undoAction = function() {
	var prev = this.prev;
	if (this.elems) {
		this.elems.forEach(function(elem) {
			if (elem[0].type == "path") {
				elem[0].attr("stroke", elem[1]);
			}
			else if (elem[0].type == "circle") {
				elem[0].attr("fill", elem[1]);
			}
		});
	}
};

ColorAction.prototype.redoAction = function() {
	var post = this.post;
	if (this.elems) {
		this.elems.forEach(function(elem) {
			if (elem[0].type == "path") {
				elem[0].attr("stroke", elem[2]);
			}
			else if (elem[0].type == "circle") {
				elem[0].attr("fill", elem[2]);
			}
		});
	}
};

function clearSelectedElements() {
	selectedElements.forEach(function(item) {
		item.data("bbox").hide();
	});
	selectedElements = [];
}

function reportError() {
	var errorText = document.createElement("p");
	errorText.innerHTML = "Toolbar setup error";
	document.body.appendChild(errorText);
}

function toolbarSetup() {
	var color = document.getElementById("color"),
		thickness = document.getElementById("strokeSize"),
		thicknessVal = document.getElementById("strokeSizeVal"),
		undoButton = document.getElementById("undo"),
		redoButton = document.getElementById("redo"),
		paint = document.getElementById("paint"),
		select = document.getElementById("select"),
		remove = document.getElementById("remove"),
		svg = document.getElementById("board");

	if (!color || !thickness || !thicknessVal || !undoButton || !redoButton || !paint || !select || !remove) {
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

	undoButton.addEventListener("click", function() {
		if (actionsToUndo.length > 0) {
			var currAction = actionsToUndo.pop();
			currAction.undoAction();
			actionsToRedo.push(currAction);
		}
		clearSelectedElements();
	});
	redoButton.addEventListener("click", function() {
		if (actionsToRedo.length > 0) {
			var currAction = actionsToRedo.pop();
			currAction.redoAction();
			actionsToUndo.push(currAction);
		}
		clearSelectedElements();
	});

	paint.classList.add("selected");
	paint.addEventListener("click", function() {
		pointerType = 0;
		svg.style.cursor = "crosshair";
		if (select.classList.contains("selected")) {
			paint.classList.add("selected");
			select.classList.remove("selected");
		}
		clearSelectedElements();
	});
	select.addEventListener("click", function() {
		pointerType = 1;
		svg.style.cursor = "pointer";
		if (paint.classList.contains("selected")) {
			select.classList.add("selected");
			paint.classList.remove("selected");
		}
	});

	remove.addEventListener("click", function() {
		actionsToUndo.push(new PathAction(selectedElements, null));
		selectedElements.forEach(function(item) {
			item.data("bbox").hide();
			item.remove();
		});
		selectedElements = [];
	});
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

	// Mouse Event Handlers
	var isDown = false,
		isMoved = false,
		canvasX, canvasY,
		path, pInfo;

	svgSnap
	.mousedown(function(e) {
		if (!boardActive) return;
		isDown = true;
		if (pointerType===0) { // This is when the user wants to draw
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
			var elem = Snap.getElementByPoint(e.pageX, e.pageY);
			if ((elem.type=="path" || elem.type=="circle") && elem.data("bbox")) { //bbox so users can't select the bounding box circles
				if (e.ctrlKey) {
					if (selectedElements.indexOf(elem)>=0) {
						elem.data("bbox").hide();
						selectedElements.splice(selectedElements.indexOf(elem),1);
					}
					else {
						selectedElements.push(elem);
					}
				}
				else if (selectedElements.indexOf(elem)===-1){
					clearSelectedElements();
					selectedElements.push(elem);
				}
				dragX = e.pageX;
				dragY = e.pageY;
				beginDragX = e.pageX;
				beginDragY = e.pageY;
			}
			else {
				clearSelectedElements();
			}
		}
	})
	.mousemove(function(e) {
		if (isDown) {
			if (pointerType===0) { //When the user wants to draw
				canvasX = e.pageX - svgDiv.offsetLeft;
				canvasY = e.pageY - svgDiv.offsetTop;
				isMoved = true;
				pInfo += "L"+canvasX+","+canvasY;
				path.attr({d: pInfo});
			}
			else if (pointerType===1 && selectedElements.length>0) {
				selectedElements.forEach(function(elem) {
					var transM = elem.transform().localMatrix;
					transM.translate(e.pageX - dragX, e.pageY - dragY);
					elem.data("bbox").transformAll(transM);
					elem.transform(transM);
				});
				dragX = e.pageX;
				dragY = e.pageY;
				//we can use pageX and pageY here without worrying about the offset since we only need differences in values
			}
		}
	})
	.mouseup(function(e) {
		isDown = false;
		if (pointerType===0) { // When the user wants to draw
			if (e.type != "touchend" && !isMoved) {
				path.remove();
				canvasX = e.pageX - svgDiv.offsetLeft;
				canvasY = e.pageY - svgDiv.offsetTop;
				path = svgSnap.circle(canvasX, canvasY, document.getElementById("strokeSize").value/2);
				path.attr({fill: wColor});
			}
			var bbox = path.getBBox(),
				x = bbox.x,
				y = bbox.y,
				width = bbox.width,
				height = bbox.height;
			if (path.type === "path") {
				//not a circle, which has the correct bbox for the stroke thickness
				var offset = document.getElementById("strokeSize").value/2;
				x -= offset;
				y -= offset;
				width += 2*offset;
				height += 2*offset;
			}
			var c1 = svgSnap.circle(x, y, 2),
				c2 = svgSnap.circle(x+width/2, y, 2),
				c3 = svgSnap.circle(x+width, y, 2),
				c4 = svgSnap.circle(x+width, y+height/2, 2),
				c5 = svgSnap.circle(x+width, y+height, 2),
				c6 = svgSnap.circle(x+width/2, y+height, 2),
				c7 = svgSnap.circle(x, y+height, 2),
				c8 = svgSnap.circle(x, y+height/2, 2),
				c9 = svgSnap.circle(x+width/2, y-20, 2),
				l = svgSnap.path("M" + (x+width/2) + "," + (y-20) + "L" + (x+width/2) + "," + y);
			var boxData = {
				box: svgSnap
					.rect(x,y,width, height)
					.attr({
						fill: "none",
						strokeWidth: "1px",
						stroke: "gray"
					})
					.remove(), //forming the path for the bounding box
				recirc: svgSnap.g()
					.add(c1, c2, c3, c4, c5, c6, c7, c8, c9, l)
					.attr({
						fill: "black",
						strokeWidth: "1px",
						stroke: "gray"
					})
					.remove(),
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
			path.data("bbox", boxData);
			path
			.mouseover(function() {
				if (pointerType==1) {
					this.data("bbox").show();
				}
			})
			.mouseout(function() {
				if (selectedElements.indexOf(this)===-1) {
					this.data("bbox").hide();
				}
			});
			actionsToUndo.push(new PathAction(null, [path]));
			actionsToRedo = [];
		}
		else if (pointerType===1) { // When the user wants to select
			svg.style.cursor = "pointer";
			var changeX, changeY;
			if (e.type==="touchend") {
				changeX = e.changedTouches[0].pageX - beginDragX;
				changeY = e.changedTouches[0].pageY - beginDragY;
			}
			else {
				changeX = e.pageX - beginDragX;
				changeY = e.pageY - beginDragY;
			}
			if (selectedElements.length>0 && (changeX!==0 || changeY!==0)) {
				actionsToUndo.push(new TranslateAction(selectedElements, changeX, changeY));
				actionsToRedo = [];
			}
		}
	});

	// Disable Page Move
	document.body.addEventListener('touchmove',function(evt){
		evt.preventDefault();
	},false);
};

function setPenColor(color) {
	wColor = color.toRgbString();
	var multiInfo = [];
	selectedElements.forEach(function(item) {
		var info;
		if (item.type == "path") {
			info = [item, item.attr("stroke"), wColor];
			item.attr("stroke", wColor);
		}
		else if (item.type == "circle") {
			info = [item, item.attr("fill"), wColor];
			item.attr("fill", wColor);
		}
		multiInfo.push(info);
	});
	if (selectedElements.length > 0) {
		actionsToUndo.push(new ColorAction(multiInfo));
	}
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
		},
		show: function () {
			boardActive = false;
		},
		beforeShow: function () {
		},
		hide: function () {
			boardActive = true;
		},
		change: function(color) {
			setPenColor(color);
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
