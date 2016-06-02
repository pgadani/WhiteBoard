// File for undo/redo abstractions
// Each action is considered a "class" with
// two required methods: redoAction and undoAction

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
	this.elems.forEach(function(elem) {
		if (elem[0].type == "path") {
			elem[0].attr("stroke", elem[1]);
		}
		else if (elem[0].type == "circle") {
			elem[0].attr("fill", elem[1]);
		}
	});
};

ColorAction.prototype.redoAction = function() {
	this.elems.forEach(function(elem) {
		if (elem[0].type == "path") {
			elem[0].attr("stroke", elem[2]);
		}
		else if (elem[0].type == "circle") {
			elem[0].attr("fill", elem[2]);
		}
	});
};

// for rotations
var RotateAction = function(elem, angle, center) {
	this.elem = elem;
	this.angle = angle;
	this.center = center;
};

RotateAction.prototype.undoAction = function() {
	var t = new Snap.Matrix();
	t.rotate(-this.angle, this.center[0], this.center[1]);
	t.add(this.elem.transform().localMatrix);
	this.elem.transform(t);
	this.elem.data("bbox").transformAll(t);
};

RotateAction.prototype.redoAction = function() {
	var t = new Snap.Matrix();
	t.rotate(this.angle, this.center[0], this.center[1]);
	t.add(this.elem.transform().localMatrix);
	this.elem.transform(t);
	this.elem.data("bbox").transformAll(t);
};