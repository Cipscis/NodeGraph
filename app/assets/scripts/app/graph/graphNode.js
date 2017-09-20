define(
	['graph/link'],

	function (Link) {

		var Node = function (options) {
			this.name = options.name;

			this.links = [];
		};

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
				node.links.splice(this.links.indexOf(link), 1);
			}
		};

		return Node;

	}
);