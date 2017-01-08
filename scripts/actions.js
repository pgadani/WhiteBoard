// File for undo/redo abstractions
// Each action is considered a "class" with
// two required methods: redoAction and undoAction

// prev and post are elem data
var PathAction = function(prev, post) {
	this.prev = prev;
	this.post = post;
};

PathAction.prototype.undoAction = function() {
	if (this.prev) {
		this.prev.forEach(function(item) {
			svgSnap.append(item.path);
		});
	}

	if (this.post) {
		this.post.forEach(function(item) {
			item.hide();
			item.path.remove();
		});
	}
};

PathAction.prototype.redoAction = function() {
	if (this.prev) {
		this.prev.forEach(function(item) {
			item.hide();
			item.path.remove();
		});
	}

	if (this.post) {
		this.post.forEach(function(item) {
			svgSnap.append(item.path);
		});
	}
};

// items are elem data
var TranslateAction = function(items, changeX, changeY) {
	this.items = items;
	this.changeX = changeX;
	this.changeY = changeY;
};

TranslateAction.prototype.undoAction = function() {
	var changeX = this.changeX;
	var changeY = this.changeY;
	if (this.items) {
		this.items.forEach(function(item) {
			item.translateAll(-changeX, -changeY);
		});
	}
};

TranslateAction.prototype.redoAction = function() {
	var changeX = this.changeX;
	var changeY = this.changeY;
	if (this.items) {
		this.items.forEach(function(item) {
			item.translateAll(changeX, changeY);
		});
	}
};

// for color changes, elems are paths (not metadata)
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

// for rotations, item is elem data
var RotateAction = function(item, angle) {
	this.item = item;
	this.angle = angle;
};

RotateAction.prototype.undoAction = function() {
	this.item.rotateAll(-this.angle);
};

RotateAction.prototype.redoAction = function() {
	this.item.rotateAll(this.angle);
};
