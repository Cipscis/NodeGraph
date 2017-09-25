define(
	[],

	function (Node) {

		var Link = function (nodeA, nodeB, cost) {
			if (nodeA === nodeB) {
				console.error('Link constructor requires two distinct nodes');
				return;
			}

			this.nodeA = nodeA;
			this.nodeB = nodeB;
			this.cost = cost || 1;
		};

		Link.prototype.getOtherNode = function (anchorNode) {
			if (anchorNode === this.nodeA) {
				return this.nodeB;
			} else if (anchorNode === this.nodeB) {
				return this.nodeA;
			} else {
				console.error('Link.prototype.getOtherNode called with a Node not contained in the Link');
				return;
			}
		};

		Link.prototype.draw = function (ctx) {
			ctx.beginPath();
			ctx.moveTo(this.nodeA.x, this.nodeA.y);
			ctx.lineTo(this.nodeB.x, this.nodeB.y);
			ctx.stroke();
		};

		return Link;

	}
);