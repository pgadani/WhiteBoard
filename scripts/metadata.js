var SelectionBox = function(currPath, copyData) {
	var pk = currPath.attr("id").slice(1);
	if (!copyData) {
		let minBBoxSize = 40,
			len = 30,		// distance between border box and rotation circle
			padding = len/2,
			radius = 4;		// radius of resizing circles
		let bbox = currPath.getBBox(),
			x = bbox.x,
			y = bbox.y,
			width = bbox.width,
			height = bbox.height;

		if (currPath.type === "path") {
			// not a circle, which has the correct bbox for the stroke thickness
			let offset = parseInt(currPath.attr("strokeWidth"),10)/2;
			width += 2*offset;
			height += 2*offset;
			// creating a larger bbox for small elements to make resizing/rotating easier
			if (width < minBBoxSize) {
				x-=minBBoxSize/2;
				width = minBBoxSize;
			}
			else {
				x-=offset;
			}
			if (height < minBBoxSize) {
				y-=minBBoxSize/2;
				height = minBBoxSize;
			}
			else {
				y-=offset;
			}
		}
		else {
			if (width < minBBoxSize) {
				x-=(minBBoxSize-width)/2;
				width = minBBoxSize;
			}
			if (height < minBBoxSize) {
				y-=(minBBoxSize-height)/2;
				height = minBBoxSize;
			}
		}
		x-=padding;
		y-=padding;
		width+=2*padding;
		height+=2*padding;

		// drag circles in the middle of each side and at each corner
		let c1 = svgSnap.circle(x, y, radius)
					.addClass("recirc c1"),
			c2 = svgSnap.circle(x+width/2, y, radius)
					.addClass("recirc c2"),
			c3 = svgSnap.circle(x+width, y, radius)
					.addClass("recirc c3"),
			c4 = svgSnap.circle(x+width, y+height/2, radius)
					.addClass("recirc c4"),
			c6 = svgSnap.circle(x+width, y+height, radius)
					.addClass("recirc c6"),
			c7 = svgSnap.circle(x+width/2, y+height, radius)
					.addClass("recirc c7"),
			c8 = svgSnap.circle(x, y+height, radius)
					.addClass("recirc c8"),
			c9 = svgSnap.circle(x, y+height/2, radius)
					.addClass("recirc c9"),
			// rotate circle above the top in the middle
			c10 = svgSnap.circle(x+width/2, y-len, radius)
					.addClass("recirc c10"),
			// rotate circle has a line connecting to the box
			l = svgSnap.path("M" + (x+width/2) + "," + (y-len) + "L" + (x+width/2) + "," + y),
			// type of circle, 1 corresponds to c1, etc
			rect = svgSnap.rect(x,y,width, height);

		this.box = svgSnap.g()
				.add(rect,l)
				.attr({
					fill: "none",
					strokeWidth: "1px",
					stroke: "gray"
				})
				.remove(); // don't put it in the canvas
		this.recirc = svgSnap.g()
				.add(c1, c2, c3, c4, c6, c7, c8, c9, c10)
				.attr({
					fill: "black",
					strokeWidth: (len-radius)+"px",
					stroke: "transparent", // transparent stroke around circle to increase clickable area
					id: "r"+pk
				})
				.remove(); // don't put it in the canvas
		this.center = [x+width/2, y+height/2];
		this.path = currPath;
	}
	else {
		let c1 = svgSnap.el("circle")
					.attr(copyData.recirc.select(".c1").attr()),
			c2 = svgSnap.el("circle")
					.attr(copyData.recirc.select(".c2").attr()),
			c3 = svgSnap.el("circle")
					.attr(copyData.recirc.select(".c3").attr()),
			c4 = svgSnap.el("circle")
					.attr(copyData.recirc.select(".c4").attr()),
			c6 = svgSnap.el("circle")
					.attr(copyData.recirc.select(".c6").attr()),
			c7 = svgSnap.el("circle")
					.attr(copyData.recirc.select(".c7").attr()),
			c8 = svgSnap.el("circle")
					.attr(copyData.recirc.select(".c8").attr()),
			c9 = svgSnap.el("circle")
					.attr(copyData.recirc.select(".c9").attr()),
			c10 = svgSnap.el("circle")
					.attr(copyData.recirc.select(".c10").attr()),
			rect = svgSnap.el("rect")
						.attr(copyData.box.select("rect").attr()),
			l = svgSnap.el("path")
					.attr(copyData.box.select("path").attr());

		this.box = svgSnap.g()
					.add(rect,l)
					.attr(copyData.box.attr())
					.remove();
		this.recirc = svgSnap.g()
					.add(c1, c2, c3, c4, c6, c7, c8, c9, c10)
					.attr(copyData.recirc.attr())
					.attr("id", "r"+pk)
					.remove();
		this.center = copyData.center.slice();
		this.path = currPath;
	}
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
	transM.add(this.path.transform().localMatrix);
	this.path.transform(transM);
	this.box.transform(transM);
	this.recirc.transform(transM);
	this.center = [this.center[0]+transX, this.center[1]+transY];
};

SelectionBox.prototype.rotateAll = function(angle) {
	var transM = new Snap.Matrix();
	transM.rotate(angle, this.center[0], this.center[1]);
	transM.add(this.path.transform().localMatrix);
	this.path.transform(transM);
	this.box.transform(transM);
	this.recirc.transform(transM);
};
