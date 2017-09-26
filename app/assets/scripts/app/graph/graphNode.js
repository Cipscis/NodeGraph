define(
	[
		'graph/link',

		'vector/vector'
	],

	function (Link, Vector) {

		var id = 0;

		var defaults = {
			name: function () { return id; },
			id: function () { return id; },
			r: 5,
			data: function () { return {}; }
		};

		var Node = function (options) {
			options = options || {};

			for (var prop in defaults) {
				if (prop in options) {
					this[prop] = options[prop];
				} else {
					if (defaults[prop] instanceof Function) {
						this[prop] = defaults[prop]();
					} else {
						this[prop] = defaults[prop];
					}
				}
			}

			this.coords = new Vector(options.x || 0, options.y || 0);
			this.links = [];

			id++;
		};

		Object.defineProperty(Node.prototype, 'x', {
			get: function () {
				return this.coords.x;
			},
			set: function (x) {
				this.coords.x = x;
			}
		});

		Object.defineProperty(Node.prototype, 'y', {
			get: function () {
				return this.coords.y;
			},
			set: function (y) {
				this.coords.y = y;
			}
		});

		Node.prototype.getLink = function (node) {
			if (!(node instanceof Node)) {
				console.error('Node.prototype.getLink requires a node');
				return;
			}

			for (var i = 0; i < this.links.length; i++) {
				var link = this.links[i];
				var nodeToCheck = link.getOtherNode(this);

				if (nodeToCheck === node) {
					return link;
				}
			}

			return false;
		};

		Node.prototype.getLinkedNodes = function () {
			var nodes = [],
				i, link;

			for (i = 0; i < this.links.length; i++) {
				link = this.links[i];
				nodes.push(link.getOtherNode(this));
			}

			return nodes;
		};

		Node.prototype.link = function (node) {
			if (!(node instanceof Node)) {
				console.error('Node.prototype.link requires a node');
				return;
			}

			if (this.getLink(node)) {
				console.warn('Trying to link node ' + this.name + ' to node ' + node.name + ', which is already linked');
				return;
			} else {
				var link = new Link(this, node);
				this.links.push(link);
				node.links.push(link);
			}
		};

		Node.prototype.unlink = function (node) {
			if (!(node instanceof Node)) {
				console.error('Node.prototype.unlink requires a node');
				return;
			}

			var link = this.getLink(node);

			if (!link) {
				console.error('Cannot unlink a node that is not linked');
				return;
			} else {
				this.links.splice(this.links.indexOf(link), 1);
				node.links.splice(node.links.indexOf(link), 1);
			}
		};

		Node.prototype.draw = function (ctx) {
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
			ctx.stroke();
			ctx.fill();
		};

		return Node;

	}
);