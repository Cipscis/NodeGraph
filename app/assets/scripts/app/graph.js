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
				module.canvas = document.getElementById('graph-canvas');
				module.ctx = module.canvas.getContext('2d');

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
				module.coords = {};
				module.coords[module.nodes[0].name] = new Vector(module.canvas.width/2, module.canvas.height/2);

				for (let i = 1; i < n; i++) {
					// Add a new node, linked to a random other node
					anchor = module.nodes[Math.floor(Math.random()*module.nodes.length)];
					module.addNode(anchor, {name: i});
				}
			},

			addNode: function (anchor, options, x, y) {
				if (typeof x === 'undefined') {
					x = Math.random()*(module.canvas.width - borderThreshold*2) + borderThreshold;
				}
				if (typeof y === 'undefined') {
					y = Math.random()*(module.canvas.height - borderThreshold*2) + borderThreshold;
				}

				var node = module.graph.addNode(anchor, options);
				module.nodes.push(node);
				module.coords[node.name] = new Vector(x, y);

				return node;
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
							let linkVector = module.coords[otherNode.name].subtract(module.coords[node.name]);

							let forceScale = Math.pow(linkVector.mod() - idealLinkLength, 2) * 0.1;
							let linkForce = linkVector.normalise().scale(forceScale);

							// Ensure correct force direction
							if (linkVector.mod() < idealLinkLength) {
								linkForce = linkForce.scale(-1);
							}

							force = force.add(linkForce);
						} else {
							// Keep unlinked nodes from getting too close
							let linkVector = module.coords[otherNode.name].subtract(module.coords[node.name]);
							if (linkVector.mod() < minDistance) {
								force = force.add(linkVector.scale(-1));
							}
						}
					}

					if (force.mod() > maxForce) {
						force = force.normalise().scale(maxForce);
					}

					module.coords[node.name] = module.coords[node.name].add(force.scale(dt));
				}
			},

			drawGraph: function () {
				var ctx = module.ctx;

				ctx.clearRect(0, 0, module.canvas.width, module.canvas.height);

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
							ctx.strokeStyle = 'rgb(' + (255 - colourStrength) + ', ' + colourStrength + ', 0)';
						}

						ctx.beginPath();
						ctx.moveTo(module.coords[node.name].x, module.coords[node.name].y);
						ctx.lineTo(module.coords[link.getOtherNode(node).name].x, module.coords[link.getOtherNode(node).name].y);
						ctx.stroke();

						drawnLinks.push(link);
					}
				}

				// Second loop through nodes, draw nodes
				for (let i = 0; i < module.nodes.length; i++) {
					let node = module.nodes[i];

					// Draw nodes
					ctx.strokeStyle = '#000';
					ctx.fillStyle = '#fff';

					if (node === module.selectedNode) {
						ctx.strokeStyle = '#0f0';
					}

					ctx.beginPath();
					ctx.arc(module.coords[node.name].x, module.coords[node.name].y, r, 0, Math.PI*2);
					ctx.stroke();
					ctx.fill();

					// Draw node names
					ctx.fillStyle = '#000';
					// ctx.fillText(node.name, module.coords[node.name].x, module.coords[node.name].y+4, r*2);
				}
			},

			updateGraph: function (dt) {
				module.updateNodeCoords(dt);
				module.drawGraph();
			},

			getNodeAtPos: function (pos) {
				for (let i = 0; i < module.nodes.length; i++) {
					let node = module.nodes[i];

					if (module.coords[node.name].subtract(pos).mod() < r) {
						return node;
					}
				}
			},

			initEvents: function () {
				module.canvas.addEventListener('contextmenu', module.preventDefault);
				module.canvas.addEventListener('mousedown', module.processMouseDown);
				module.canvas.addEventListener('mousemove', module.processMouseMove);
				module.canvas.addEventListener('mouseup', module.processMouseUp);
				module.canvas.addEventListener('mouseout', module.processMouseUp);
			},

			preventDefault: function (e) {e.preventDefault();},

			processMouseDown: function (e) {
				var pos = new Vector(e.layerX, e.layerY);
				var clickedNode = module.getNodeAtPos(pos);

				switch (e.which) {
					case 1: // Left click
						module.mouseDownPos = pos;
						module.mouseDownTime = new Date();
						if (clickedNode && clickedNode !== module.selectedNode) {
							module.selectedNode = clickedNode;
							module.selectedLinks = [];
						}
						break;
					case 3: // Right click
						if (clickedNode) {
							if (module.selectedNode) {
								let path = module.graph.getPath(module.selectedNode, clickedNode);

								module.selectedLinks = [];
								for (let i = 1; i < path.length; i++) {
									module.selectedLinks.push(path[i].getLink(path[i-1]));
								}
							}
						}
						break;
				}
			},

			processMouseMove: function (e) {
				var pos = new Vector(e.layerX, e.layerY);

				// If a node is selected, move it
				if (module.mouseDownPos && module.selectedNode) {
					var now = new Date();
					var mouseDownDuration = now - module.mouseDownTime;
					if (mouseDownDuration > clickThreshold) {

						var pos = new Vector(e.layerX, e.layerY);
						module.mouseDownPos = pos;

						module.coords[module.selectedNode.name] = pos;
					}
				}

				// Highlight nearby links
				module.selectedLinks = [];
				var links = [];
				var mouseThreshold = 10;
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

					let coordsA = module.coords[link.nodeA.name];
					let coordsB = module.coords[link.nodeB.name];

					let line = new Line(coordsA, coordsB.subtract(coordsA));
					let point = line.getClosestPoint(pos);

					if (pos.subtract(point).mod() < mouseThreshold) {
						// Close to line
						let linkDist = point.subtract(coordsA);
						let linkLength = coordsB.subtract(coordsA).mod();

						let lineProportion = (linkDist.x / line.direction.x) / linkLength;

						if (lineProportion > 0 && lineProportion < 1) {
							// Close to line segment
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
						if (!clickedNode) {
							var now = new Date();
							var mouseDownDuration = now - module.mouseDownTime;

							if ((mouseDownDuration < clickThreshold) && module.selectedNode) {
								module.addNode(module.selectedNode, {name: module.nodes.length}, pos.x, pos.y);
							}
						}

						module.mouseDownPos = null;
						module.mouseDownTime = null;
						break;
				}
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