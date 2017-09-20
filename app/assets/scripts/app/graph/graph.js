define(
	['graph/graphNode'],

	function (Node) {

		var Graph = function (rootOptions) {
			var rootNode = new Node(rootOptions);

			this.root = rootNode;
		};

		Graph.prototype.addNode = function (anchor, options) {
			var node = new Node(options);
			anchor.link(node);

			return node;
		};

		Graph.prototype.getRoot = function () {
			return this.root;
		};

		Graph.prototype.getNodeList = function () {
			var nodeList = [];

			var frontier = [this.root];
			while (frontier.length) {
				var nodeToCheck = frontier.splice(0, 1)[0]; // Remove current node from frontier

				if (nodeList.indexOf(nodeToCheck) === -1) {
					nodeList.push(nodeToCheck);

					for (var i = 0; i < nodeToCheck.links.length; i++) {
						var link = nodeToCheck.links[i];

						var newNode = link.getOtherNode(nodeToCheck);

						if (nodeList.indexOf(newNode) === -1 && frontier.indexOf(newNode) === -1) {
							frontier.push(newNode);
						}
					}
				}
			}

			return nodeList;
		};

		Graph.prototype.getPath = function (nodeA, nodeB) {
			// Currently using Djikstra

			var checkedNodes = [];
			var frontier = [nodeA];

			var nodes = this.getNodeList();
			var nodeInfo = []; // Match index with nodeList to store info

			nodeInfo[nodes.indexOf(nodeA)] = {
				node: nodeA,
				prev: null,
				cost: 0
			};

			while (frontier.length) {
				var nodeToCheck = frontier.splice(0, 1)[0]; // Remove current node from frontier
				var nodeIndex = nodes.indexOf(nodeToCheck);

				checkedNodes.push(nodeToCheck);

				for (var i = 0; i < nodeToCheck.links.length; i++) {
					var link = nodeToCheck.links[i];
					var linkCost = link.cost || 1;

					var newNode = link.getOtherNode(nodeToCheck);
					var newIndex = nodes.indexOf(newNode);

					if (checkedNodes.indexOf(newNode) === -1 && frontier.indexOf(newNode) === -1) {
						frontier.push(newNode);
						nodeInfo[newIndex] = {
							node: newNode,
							prev: nodeToCheck,
							cost: nodeInfo[nodes.indexOf(nodeToCheck)].cost+linkCost
						};
					} else if (nodeInfo[nodeIndex].cost+linkCost < nodeInfo[newIndex].cost) {
						nodeInfo[newIndex] = {
							node: newNode,
							prev: nodeToCheck,
							cost: nodeInfo[nodes.indexOf(nodeToCheck)].cost+linkCost
						};
					}
				}
			}

			var path = [nodeB];
			var currentNode = nodeB;

			while (currentNode !== nodeA) {
				var index = nodes.indexOf(currentNode);
				currentNode = nodeInfo[index].prev;
				path.push(currentNode);
			}

			path = path.reverse();

			return path;
		};

		return Graph;

	}
);