define(
	[
		'graph/graph',
		'vector/vector',
		'vector/line'
	],

	function (Graph, Vector, Line) {
		const r = 5;

		const idealLinkLength = 200;
		const maxForce = 10000;
		const minDistance = r*2.5;
		const borderThreshold = 100;

		const clickThreshold = 200; // ms

		var GraphController = {
			init: function () {
				var canvas = document.getElementById('graph-canvas');
				GraphController.ctx = canvas.getContext('2d');

				GraphController.initGraph(5);

				// State properties
				GraphController.selectedNode = null;
				GraphController.selectedLinks = [];
				GraphController.mouseDownPos = null;
				GraphController.mouseDownTime = null;

				GraphController.initEvents();
				GraphController.start(GraphController.updateGraph, 0.1, 1);
			},

			initGraph: function (n) {
				GraphController.graph = new Graph({
					name: 'Root'
				});
				GraphController.nodes = [GraphController.graph.getRoot()];
				GraphController.nodes[0].coords = new Vector(GraphController.ctx.canvas.width/2, GraphController.ctx.canvas.height/2);

				for (let i = 1; i < n; i++) {
					// Add a new node, linked to a random other node
					anchor = GraphController.nodes[Math.floor(Math.random()*GraphController.nodes.length)];
					GraphController.addNode({r: r}, anchor);
				}
			},

			addNode: function (options, anchor) {
				options = options || {};

				if (typeof options.x === 'undefined') {
					options.x = Math.random()*(GraphController.ctx.canvas.width - borderThreshold*2) + borderThreshold;
				}

				if (typeof options.y === 'undefined') {
					options.y = Math.random()*(GraphController.ctx.canvas.height - borderThreshold*2) + borderThreshold;
				}

				var node = GraphController.graph.addNode(options, anchor);
				// Refresh list of nodes

				GraphController.nodes = GraphController.graph.getNodeList();

				return node;
			},

			removeNode: function (node) {
				var i, link;

				for (i = node.links.length-1; i >= 0; i--) {
					link = node.links[i];

					node.unlink(link.getOtherNode(node));
				}

				// Refresh list of nodes
				GraphController.nodes = GraphController.graph.getNodeList();
			},

			updateNodeCoords: function (dt) {
				for (let i = 0; i < GraphController.nodes.length; i++) {
					let node = GraphController.nodes[i];
					let force = new Vector(0, 0);

					if (GraphController.mouseDownPos && node === GraphController.selectedNode) {
						continue;
					}

					for (let j = 0; j < GraphController.nodes.length; j++) {
						let otherNode = GraphController.nodes[j];
						if (otherNode === node) {
							continue;
						}

						let link = node.getLink(otherNode);

						if (link) {
							// Calculate link lengths, then look at "forces" based on if they're longer or shorter than the ideal length. Those forces then move the nodes
							let linkVector = otherNode.coords.subtract(node.coords);

							let forceScale = Math.pow(linkVector.mod() - idealLinkLength, 2) * 0.1;
							let linkForce = linkVector.normalise().scale(forceScale);

							// Ensure correct force direction
							if (linkVector.mod() < idealLinkLength) {
								linkForce = linkForce.scale(-1);
							}

							force = force.add(linkForce);
						} else {
							// Keep unlinked nodes from getting too close
							let linkVector = otherNode.coords.subtract(node.coords);
							if (linkVector.mod() < minDistance) {
								force = force.add(linkVector.scale(-1));
							}
						}
					}

					if (force.mod() > maxForce) {
						force = force.normalise().scale(maxForce);
					}

					node.coords = node.coords.add(force.scale(dt));
				}
			},

			drawGraph: function () {
				var ctx = GraphController.ctx;

				ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

				ctx.strokeStyle = '#000';
				ctx.lineWidth = 2;
				ctx.font = '12px sans-serif';
				ctx.textAlign = 'center';

				// First loop through nodes, draw links
				var drawnLinks = [];
				for (let i = 0; i < GraphController.nodes.length; i++) {
					let node = GraphController.nodes[i];

					for (let j = 0; j < node.links.length; j++) {
						let link = node.links[j];

						if (drawnLinks.indexOf(link) !== -1) {
							continue;
						}

						ctx.strokeStyle = '#000';

						if (GraphController.selectedLinks.indexOf(link) !== -1) {
							let colourStrength = Math.floor(255 * (1 - (GraphController.selectedLinks.indexOf(link) / GraphController.selectedLinks.length)));
							ctx.strokeStyle = 'rgb(0, 255, 0)';
						}

						link.draw(ctx);

						drawnLinks.push(link);
					}
				}

				// Second loop through nodes, draw nodes
				for (let i = 0; i < GraphController.nodes.length; i++) {
					let node = GraphController.nodes[i];

					// Draw nodes
					if (node === GraphController.graph.getRoot()) {
						ctx.strokeStyle = '#f00';
					} else {
						ctx.strokeStyle = '#000';
					}
					ctx.fillStyle = '#fff';

					if (node === GraphController.selectedNode) {
						ctx.strokeStyle = '#0f0';
					}

					node.draw(ctx);

					// Draw node names
					ctx.fillStyle = '#000';
					ctx.fillText(node.name, node.x, node.y+4, r*2);
				}
			},

			updateGraph: function (dt) {
				GraphController.drawGraph();
			},

			getNodeAtPos: function (pos) {
				for (let i = 0; i < GraphController.nodes.length; i++) {
					let node = GraphController.nodes[i];

					if (node.coords.subtract(pos).mod() < r) {
						return node;
					}
				}
			},

			initEvents: function () {
				GraphController.ctx.canvas.addEventListener('contextmenu', GraphController.preventDefault);

				GraphController.ctx.canvas.addEventListener('mousedown', GraphController.processMouseDown);
				GraphController.ctx.canvas.addEventListener('mousemove', GraphController.processMouseMove);
				GraphController.ctx.canvas.addEventListener('mouseup', GraphController.processMouseUp);
				GraphController.ctx.canvas.addEventListener('mouseout', GraphController.processMouseUp);

				document.querySelector('.js-save').addEventListener('click', GraphController.processSave);
				document.querySelector('.js-load').addEventListener('click', GraphController.processLoad);

				document.querySelector('.js-node-name').addEventListener('change', GraphController.processNameChange);
			},

			preventDefault: function (e) {e.preventDefault();},

			processMouseDown: function (e) {
				var pos = new Vector(e.layerX, e.layerY);
				var clickedNode = GraphController.getNodeAtPos(pos);

				switch (e.which) {
					case 1: // Left click - record mouse press
						GraphController.mouseDownPos = pos;
						GraphController.mouseDownTime = new Date();
						break;
				}
			},

			processMouseMove: function (e) {
				var pos = new Vector(e.layerX, e.layerY);

				// If a node is selected and left click is held down, move it
				if (GraphController.mouseDownPos && GraphController.selectedNode) {
					var now = new Date();
					var mouseDownDuration = now - GraphController.mouseDownTime;
					if (mouseDownDuration > clickThreshold) {

						pos = new Vector(e.layerX, e.layerY);
						GraphController.mouseDownPos = pos;

						GraphController.selectedNode.coords = pos;
					}
				}

				// Highlight nearby links
				GraphController.selectedLinks = [];
				var links = [];
				var mouseThreshold = r;
				// Collect links
				for (let i = 0; i < GraphController.nodes.length; i++) {
					let node = GraphController.nodes[i];
					for (let j = 0; j < node.links.length; j++) {
						let link = node.links[j];
						if (links.indexOf(link) === -1) {
							links.push(link);
						}
					}
				}

				// Loop through links
				for (let i = 0; i < links.length; i++) {
					let link = links[i];

					let coordsA = link.nodeA.coords;
					let coordsB = link.nodeB.coords;

					let line = new Line(coordsA, coordsB.subtract(coordsA));
					let closestPoint = line.getClosestPoint(pos);

					if (closestPoint.subtract(pos).mod() < mouseThreshold) {
						// Mouse near line
						let linkLength = coordsA.subtract(coordsB).mod();
						let distA = closestPoint.subtract(coordsA).mod();
						let distB = closestPoint.subtract(coordsB).mod();
						if (distA < (linkLength+mouseThreshold) && distB < (linkLength+mouseThreshold)) {
							// Mouse within correct segment of line
							GraphController.selectedLinks.push(link);
						}
					}
				}
			},

			processMouseUp: function (e) {
				var pos = new Vector(e.layerX, e.layerY);
				var clickedNode = GraphController.getNodeAtPos(pos);

				switch (e.which) {
					case 1: // Left click
						var now = new Date();
						var mouseDownDuration = now - GraphController.mouseDownTime;

						if ((mouseDownDuration < clickThreshold)) {
							GraphController.processClickAction(clickedNode, pos);
						}

						GraphController.mouseDownPos = null;
						GraphController.mouseDownTime = null;
						break;
				}
			},

			processClickAction: function (clickedNode, pos) {
				var action = document.querySelector('[name="control"]:checked');
				if (action) {
					switch (action.value) {
						case 'select':
							let $nodeName = document.querySelector('.js-node-name');

							if (clickedNode) {
								if (clickedNode !== GraphController.selectedNode) {
									GraphController.selectedNode = clickedNode;

									$nodeName.value = clickedNode.data.name || '';
									$nodeName.disabled = false;
								}
							} else {
								GraphController.selectedNode = null;

								$nodeName.value = '';
								$nodeName.disabled = true;
							}
							break;
						case 'add':
							if (GraphController.selectedNode && !clickedNode) {
								GraphController.addNode(
									{
										r: r,
										x: pos.x,
										y: pos.y
									},
									GraphController.selectedNode
								);
							}
							break;
						case 'remove':
							if (clickedNode) {
								GraphController.removeNode(clickedNode);
							}
							break;
						case 'link':
							if (GraphController.selectedNode && clickedNode && GraphController.selectedNode !== clickedNode) {
								GraphController.selectedNode.link(clickedNode);
							}
							break;
						case 'unlink':
							if (GraphController.selectedNode && clickedNode && GraphController.selectedNode !== clickedNode) {
								GraphController.selectedNode.unlink(clickedNode);
								GraphController.nodes = GraphController.graph.getNodeList();
							}
							break;
					}
				}
			},

			processSave: function () {
				localStorage.setItem('graph', GraphController.graph.save());
			},

			processLoad: function () {
				var graphData = localStorage.getItem('graph');

				GraphController.graph.load(graphData);
				GraphController.nodes = GraphController.graph.getNodeList();
			},

			processNameChange: function (e) {
				var $name = this;

				GraphController.selectedNode.data.name = this.value;
			},

			start: function (callback, maxDt, inactiveTimeout) {
				var time = 0;

				var doCallback = function (timestamp) {
					var dt = time ? (timestamp - time)/1000 : 0;
					time = timestamp;
					if (inactiveTimeout && dt > inactiveTimeout) {
						dt = 0;
					} else if (maxDt && dt > maxDt) {
						dt = maxDt;
					}

					callback(dt);

					requestAnimationFrame(doCallback);
				};

				requestAnimationFrame(doCallback);
			}
		};

		GraphController.init();
	}
);