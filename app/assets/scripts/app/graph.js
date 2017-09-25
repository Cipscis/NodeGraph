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

		const clickThreshold = 100; // ms

		var module = {
			init: function () {
				var canvas = document.getElementById('graph-canvas');
				module.ctx = canvas.getContext('2d');

				module.initGraph(5);

				// State properties
				module.selectedNode = null;
				module.selectedLinks = [];
				module.mouseDownPos = null;
				module.mouseDownTime = null;

				module.initEvents();
				module.start(module.updateGraph, 0.1, 1);
			},

			initGraph: function (n) {
				module.graph = new Graph({
					name: 'Root'
				});
				module.nodes = [module.graph.getRoot()];
				module.nodes[0].coords = new Vector(module.ctx.canvas.width/2, module.ctx.canvas.height/2);

				for (let i = 1; i < n; i++) {
					// Add a new node, linked to a random other node
					anchor = module.nodes[Math.floor(Math.random()*module.nodes.length)];
					module.addNode({r: r}, anchor);
				}
			},

			addNode: function (options, anchor) {
				options = options || {};

				if (typeof options.x === 'undefined') {
					options.x = Math.random()*(module.ctx.canvas.width - borderThreshold*2) + borderThreshold;
				}

				if (typeof options.y === 'undefined') {
					options.y = Math.random()*(module.ctx.canvas.height - borderThreshold*2) + borderThreshold;
				}

				var node = module.graph.addNode(options, anchor);
				// Refresh list of nodes

				module.nodes = module.graph.getNodeList();

				return node;
			},

			removeNode: function (node) {
				var i, link;

				console.log('Remove', node);
				for (i = 0; i < node.links.length; i++) {
					link = node.links[i];

					console.log(link, link.getOtherNode(node));
					node.unlink(link.getOtherNode(node));
				}

				// Refresh list of nodes
				module.nodes = module.graph.getNodeList();
			},

			updateNodeCoords: function (dt) {
				for (let i = 0; i < module.nodes.length; i++) {
					let node = module.nodes[i];
					let force = new Vector(0, 0);

					if (module.mouseDownPos && node === module.selectedNode) {
						continue;
					}

					for (let j = 0; j < module.nodes.length; j++) {
						let otherNode = module.nodes[j];
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
				var ctx = module.ctx;

				ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

				ctx.strokeStyle = '#000';
				ctx.lineWidth = 2;
				ctx.font = '12px sans-serif';
				ctx.textAlign = 'center';

				// First loop through nodes, draw links
				var drawnLinks = [];
				for (let i = 0; i < module.nodes.length; i++) {
					let node = module.nodes[i];

					for (let j = 0; j < node.links.length; j++) {
						let link = node.links[j];

						if (drawnLinks.indexOf(link) !== -1) {
							continue;
						}

						ctx.strokeStyle = '#000';

						if (module.selectedLinks.indexOf(link) !== -1) {
							let colourStrength = Math.floor(255 * (1 - (module.selectedLinks.indexOf(link) / module.selectedLinks.length)));
							ctx.strokeStyle = 'rgb(0, 255, 0)';
						}

						link.draw(ctx);

						drawnLinks.push(link);
					}
				}

				// Second loop through nodes, draw nodes
				for (let i = 0; i < module.nodes.length; i++) {
					let node = module.nodes[i];

					// Draw nodes
					if (node === module.graph.getRoot()) {
						ctx.strokeStyle = '#f00';
					} else {
						ctx.strokeStyle = '#000';
					}
					ctx.fillStyle = '#fff';

					if (node === module.selectedNode) {
						ctx.strokeStyle = '#0f0';
					}

					node.draw(ctx);

					// Draw node names
					ctx.fillStyle = '#000';
					ctx.fillText(node.name, node.x, node.y+4, r*2);
				}
			},

			updateGraph: function (dt) {
				module.drawGraph();
			},

			getNodeAtPos: function (pos) {
				for (let i = 0; i < module.nodes.length; i++) {
					let node = module.nodes[i];

					if (node.coords.subtract(pos).mod() < r) {
						return node;
					}
				}
			},

			initEvents: function () {
				module.ctx.canvas.addEventListener('contextmenu', module.preventDefault);
				module.ctx.canvas.addEventListener('mousedown', module.processMouseDown);
				module.ctx.canvas.addEventListener('mousemove', module.processMouseMove);
				module.ctx.canvas.addEventListener('mouseup', module.processMouseUp);
				module.ctx.canvas.addEventListener('mouseout', module.processMouseUp);

				document.getElementsByClassName('js-save')[0].addEventListener('click', module.processSave);
				document.getElementsByClassName('js-load')[0].addEventListener('click', module.processLoad);
			},

			preventDefault: function (e) {e.preventDefault();},

			processMouseDown: function (e) {
				var pos = new Vector(e.layerX, e.layerY);
				var clickedNode = module.getNodeAtPos(pos);

				switch (e.which) {
					case 1: // Left click - record mouse press
						module.mouseDownPos = pos;
						module.mouseDownTime = new Date();
						break;
				}
			},

			processMouseMove: function (e) {
				var pos = new Vector(e.layerX, e.layerY);

				// If a node is selected and left click is held down, move it
				if (module.mouseDownPos && module.selectedNode) {
					var now = new Date();
					var mouseDownDuration = now - module.mouseDownTime;
					if (mouseDownDuration > clickThreshold) {

						var pos = new Vector(e.layerX, e.layerY);
						module.mouseDownPos = pos;

						module.selectedNode.coords = pos;
					}
				}

				// Highlight nearby links
				module.selectedLinks = [];
				var links = [];
				var mouseThreshold = r;
				// Collect links
				for (let i = 0; i < module.nodes.length; i++) {
					let node = module.nodes[i];
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
							module.selectedLinks.push(link);
						}
					}
				}
			},

			processMouseUp: function (e) {
				var pos = new Vector(e.layerX, e.layerY);
				var clickedNode = module.getNodeAtPos(pos);

				switch (e.which) {
					case 1: // Left click
						var now = new Date();
						var mouseDownDuration = now - module.mouseDownTime;

						if ((mouseDownDuration < clickThreshold)) {
							module.processClickAction(clickedNode, pos);
						}

						module.mouseDownPos = null;
						module.mouseDownTime = null;
						break;
				}
			},

			processClickAction: function (clickedNode, pos) {
				var action = document.querySelector('[name="control"]:checked');
				if (action) {
					switch (action.value) {
						case 'select':
							if (clickedNode) {
								if (clickedNode !== module.selectedNode) {
									module.selectedNode = clickedNode;
								}
							} else {
								module.selectedNode = null;
							}
							break;
						case 'add':
							if (module.selectedNode && !clickedNode) {
								module.addNode(
									{
										r: r,
										x: pos.x,
										y: pos.y
									},
									module.selectedNode
								);
							}
							break;
						case 'remove':
							if (clickedNode) {
								module.removeNode(clickedNode);
							}
							break;
						case 'link':
							if (module.selectedNode && clickedNode && module.selectedNode !== clickedNode) {
								module.selectedNode.link(clickedNode);
							}
							break;
						case 'unlink':
							if (module.selectedNode && clickedNode && module.selectedNode !== clickedNode) {
								module.selectedNode.unlink(clickedNode);
								module.nodes = module.graph.getNodeList();
							}
							break;
					}
				}
			},

			processSave: function () {
				localStorage.setItem('graph', module.graph.save());
			},

			processLoad: function () {
				var graphData = localStorage.getItem('graph');

				module.graph.load(graphData);
				module.nodes = module.graph.getNodeList();
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

		module.init();
	}
);