define(
	['graph/graphNode'],

	function (Node) {

		var Graph = function (rootOptions) {
			var rootNode = new Node(rootOptions);

			this.root = rootNode;
		};

		Graph.prototype.addNode = function (options, anchor) {
			var node = new Node(options);

			if (anchor) {
				anchor.link(node);
			}

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

		Graph.prototype.getNodeById = function (id) {
			var nodes = this.getNodeList(),
				i, node;

			for (i = 0; i < nodes.length; i++) {
				node = nodes[i];

				if (node.id === id) {
					return node;
				}
			}

			// Didn't find a node
			return undefined;
		};

		Graph.prototype.getPath = function (nodeA, nodeB) {
			// Currently using Djikstra
			// Not sure if there's a suitable heuristic for upgrading to A*

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

		Graph.prototype.save = function () {
			// Save a graph in a format that can be exported to JSON

			var savedGraph = [];
			var savedNode;

			var nodes = this.getNodeList();
			var i, node;
			var j, link;

			// Step through nodes, and create object that can be used
			// to recreate them when passed as options
			for (i = 0; i < nodes.length; i++) {
				node = nodes[i];
				savedNode = {
					name: node.name,
					id: node.id,
					r: node.r,
					x: node.x,
					y: node.y,
					links: [],
					data: node.data
				};

				for (j = 0; j < node.links.length; j++) {
					link = node.links[j];

					savedNode.links.push({
						cost: link.cost,
						id: link.getOtherNode(node).id
					});
				}

				savedGraph.push(savedNode);
			}

			return JSON.stringify(savedGraph);
		};

		Graph.prototype.load = function (savedGraph) {
			// Load a graph from an object that can be imported from JSON

			var savedNode;
			var i, node;
			var j, savedLink;
			var linkedNode;
			var anchor;

			if (typeof savedGraph === 'string') {
				savedGraph = JSON.parse(savedGraph);
			}

			// Start overwriting this graph with new root node
			Graph.call(this, savedGraph[0]);

			// Add nodes sequentially
			// Because of how the node tree is traversed, each node should
			// have one linked node loaded before it and therefore
			// available as an anchor to attach it to the graph
			for (i = 1; i < savedGraph.length; i++) {
				savedNode = savedGraph[i];

				for (j = 0; j < savedNode.links.length; j++) {
					anchor = savedNode.links[j].id;
					anchor = this.getNodeById(anchor);

					if (anchor) {
						break;
					}
				}

				this.addNode(savedNode, anchor);
			}

			// Loop through nodes again and add any missing links
			for (i = 0; i < savedGraph.length; i++) {
				savedNode = savedGraph[i];
				node = this.getNodeById(savedNode.id);

				for (j = 1; j < savedNode.links.length; j++) {
					savedLink = savedNode.links[j];
					linkedNode = this.getNodeById(savedLink.id);

					if (!node.getLink(linkedNode)) {
						node.link(linkedNode);
					}
				}
			}
		};

		return Graph;

	}
);