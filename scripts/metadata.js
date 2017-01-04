var SelectionBox = function(currPath) {
	var minBBoxSize = 16;
	var bbox = currPath.getBBox(),
		x = bbox.x,
		y = bbox.y,
		width = bbox.width,
		height = bbox.height;

	if (currPath.type === "path") {
		//not a circle, which has the correct bbox for the stroke thickness
		let offset = parseInt(currPath.attr("strokeWidth"),10)/2;
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
	var radius = 10;
	var c1 = svgSnap.circle(x, y, radius),
		c2 = svgSnap.circle(x+width/2, y, radius),
		c3 = svgSnap.circle(x+width, y, radius),
		c4 = svgSnap.circle(x+width, y+height/2, radius),
		c6 = svgSnap.circle(x+width, y+height, radius),
		c7 = svgSnap.circle(x+width/2, y+height, radius),
		c8 = svgSnap.circle(x, y+height, radius),
		c9 = svgSnap.circle(x, y+height/2, radius),
		// rotate circle above the top in the middle
		c10 = svgSnap.circle(x+width/2, y-20, radius),
		// rotate circle has a line connecting to the box
		l = svgSnap.path("M" + (x+width/2) + "," + (y-20) + "L" + (x+width/2) + "," + y);
		// type of circle, 1 corresponds to c1, etc
	c1.data("ctype", "1");
	c2.data("ctype", "2");
	c3.data("ctype", "3");
	c4.data("ctype", "4");
	c6.data("ctype", "6");
	c7.data("ctype", "7");
	c8.data("ctype", "8");
	c9.data("ctype", "9");
	c10.data("ctype", "10");

	this.box = svgSnap
			.rect(x,y,width, height)
			.attr({
				fill: "none",
				strokeWidth: "1px",
				stroke: "gray"
			})
			.remove(); // don't put it in the canvas
	this.recirc = svgSnap.g()
			.add(c1, c2, c3, c4, c6, c7, c8, c9, c10, l)
			.attr({
				fill: "black",
				strokeWidth: "1px",
				stroke: "gray"
			})
			.data("path",currPath)
			.remove(); // don't put it in the canvas
	this.center = [x+width/2, y+height/2];
	this.currPath = currPath;
};

SelectionBox.prototype.show = function() {
	if (this.box.parent() === null) {
		svgSnap.append(this.box);
		svgSnap.append(this.recirc);
	}
};

SelectionBox.prototype.hide = function() {
	this.box.remove();
	this.recirc.remove();
};

SelectionBox.prototype.translateAll = function(transX, transY) {
	var transM = new Snap.Matrix();
	transM.translate(transX, transY);
	transM.add(this.currPath.transform().localMatrix);
	this.currPath.transform(transM);
	this.box.transform(transM);
	this.recirc.transform(transM);
	this.center = [this.center[0]+transX, this.center[1]+transY];
};

SelectionBox.prototype.rotateAll = function(angle) {
	var transM = new Snap.Matrix();
	transM.rotate(angle, this.center[0], this.center[1]);
	transM.add(this.currPath.transform().localMatrix);
	this.currPath.transform(transM);
	this.box.transform(transM);
	this.recirc.transform(transM);
};