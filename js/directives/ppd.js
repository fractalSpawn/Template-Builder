ppdDirectives.directive('dabble', ['templateService',function(templateService){
	return {
		restrict: "E",
		scope: {
			"model": "=model"
		},
		templateUrl: "partials/ppdCanvas.html",
		replace: true,
		link: function($scope, $el, $attrs){
			// we can determine what the initial zoom value is
			// by looking at the size of dabble vs the size of
			// the svg document. The canvas size should always be
			// contained in width/height attributes. special
			// consideration must be done for 100% values.
			var dabbleWidth = $attrs.width;
			var dabbleHeight = $attrs.height;

			$scope.setupViewport($el, dabbleWidth, dabbleHeight);

			// when the template service has a current template, we can draw everything
			// when the template changes, we redraw it all over again.
			$scope.$watch(function(){ return templateService.currentTemplate; }, function(newValue, oldValue){
				if(newValue === oldValue){ return; }
				$scope.drawCurrentPerspective();
			}, true);

			// // watch for changes in mode or context and redraw the perspective accordingly.
			// $scope.$watch('model.mode', function(newValue, oldValue){
			// 	if(newValue === oldValue){ return; }
			// 	$scope.drawCurrentPerspective();
			// });
			// $scope.$watch('model.context', function(newValue, oldValue){
			// 	if(newValue === oldValue){ return; }
			// 	$scope.drawCurrentPerspective();
			// });
			
			// // if the perspective changes in any way, redraw it and zoom out
			// //XXX zooming out automatically can sometimes be problematic, check use cases
			// $scope.$watch('model.currentPerspective', function(newValue, oldValue){
			// 	if(newValue === oldValue){ return; }
			// 	$scope.drawCurrentPerspective();
			// 	// zoom back out completely (clear the translate x,y).
			// 	// this prevents a strange jump back to last known x,y when
			// 	// zooming back in again after zooming out.
			// 	$scope.paper.attr({"transform": "translate(0,0)scale("+$scope.initialZoom+")"});
			// }, true);

			// // watch for any changes on the current print area, re-render as required.
			// $scope.$watch('model.currentPrintArea', function(newValue, oldValue){
			// 	if(newValue === oldValue){ return; }
			// 	if(templateService.currentPrintArea !== undefined){
			// 		$scope.drawCurrentPerspective();
			// 	}
			// }, true);

			// // watch for when the borders are changed. Redraw the perspective to reflect change.
			// // we do the perspective so as to affect all print areas.
			// $scope.$watch('model.borders', function(newValue, oldValue){
			// 	if(newValue === oldValue){ return; }
			// 	$scope.drawCurrentPerspective();
			// }, true);

			// // watch for when the rulers are changed. Redraw the guides to reflect change.
			// $scope.$watch('model.rulers', function(newValue, oldValue){
			// 	if(newValue === oldValue){ return; }
			// 	// always remove the rulers on a change
			// 	d3.select('#' + templateService.currentPrintArea.id + '_rulers').remove();
			// 	// then only redraw them if we are enabling rulers
			// 	if(newValue.enabled === true){ $scope.drawRulers(); }
			// }, true);

			// // watch for when the grid is changed. Redraw the guides to reflect change.
			// $scope.$watch('model.grid', function(newValue, oldValue){
			// 	if(newValue === oldValue){ return; }
			// 	// always remove the grid on a change
			// 	d3.select('#' + templateService.currentPrintArea.id + '_grid').remove();
			// 	// then only redraw them if we are enabling the grid
			// 	if(newValue.enabled === true){ $scope.drawGrid(); }
			// }, true);
		},
		controller: function($scope, $filter){
			// set up a way to track if the viewport is ready or not.
			$scope.viewportReady = false;

			// set up objects to remember what we've already drawn
			// these get cleared when we redraw the perspective.
			// use drawnPerspectives to store/reference entire perspectives
			// use drawnAreas to store/reference print areas
			// use drawnPrintGuides to store/reference print guides (borders, labels, safearea)
			// use drawnDesignGuides to store/reference design guides (rulers, grid)
			// use drawnDesigns to store/reference designs within print areas.
			$scope.drawnPerspectives = {};
			$scope.drawnAreas = {};
			$scope.drawnPrintGuides = {};
			$scope.drawnDesignGuides = {};
			$scope.drawnDesigns = {};

			// the majority of the sizes/scales used are based on a calculation
			// of the perspectives print resolution and the perspectives scale.
			// Increasing the resolution of the print will make print areas
			// larger since 6"@100dpi (600px) is 3 times smaller than 6"@300dpi (1800px).
			// Because the visual size of print areas in the UI is affected, we need to 
			// adjust the scale of these areas so that they visually match with
			// the background image. Scaling is purely for visual purposes and
			// does not affect the actual print size. It is similar to zoom, but
			// only affects the designs and print area guides (zoom affects everything).
			$scope.resScale = 0;

			/**
			 * @function		setupViewport
			 * @description		Sets up the dabble area, zoom and initial svg elements.
			 * @author			Jacob
			 * @params			dabbleWidth {String} the width of dabble from the directive element attributes
			 * @params			dabbleHeight {String} the height of dabble from the directive element attributes
			 * @returns			nothing
			 */
			$scope.setupViewport = function($el, dabbleWidth, dabbleHeight){
				// use the width and height to set properties on the outer dabble div.
				// doing this here prevents us from having to worry about including
				// special sizing css in a file somewhere.
				$el.css({
					"width": dabbleWidth+"px",
					"height": dabbleHeight+"px",
					"overflow": "hidden"
				});
				
				// based on how big our dabble is compared to the full canvas width
				// we can determine what the initial zoom is going to be so the 
				// template fills up the entire space on init.
				$scope.initialZoom = dabbleWidth / $scope.model.canvasWidth;

				// add zoom/pan functionality for entire SVG
				$scope.zoom = d3.behavior.zoom()
					.scale($scope.initialZoom)
					.translate([0,0])
					.scaleExtent([$scope.initialZoom,1])
					.on("zoom", function(){
						// when scale gets back out to min, reset the translate
						// offset back to 0 so that when we zoom back in, we
						// don't experience a jump back to previous offset.
						if(d3.event.scale === $scope.initialZoom){
							d3.event.translate = [0,0];
							$scope.zoom.translate([0,0]);
						}
						$scope.paper.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
					});

				// create the main svg canvas area using SVGJS. It does not
				// have to be a scope variable because we won't be drawing to the
				// root SVG element. We draw to the viewport element.
				var rootSVG = d3.select('#dabblePaper')
					.attr({
						"width": $scope.model.canvasWidth,
						"height": $scope.model.canvasHeight,
						"viewBox": ("0 0 " + $scope.model.canvasWidth + " " + $scope.model.canvasHeight),
						"preserveAspectRatio": "xMidYMid meet",
						"pointer-events": "all"
					})
					.call($scope.zoom);

				// create an area where we can put defs that apply globally
				// Things like color textures and cutout masks
				$scope.globalDefs = rootSVG.append('svg:defs');

				// using a group that encompasses everything makes
				// it easier to do zooming and panning the SVG.
				// If we only used the root SVG, things get messy.
				$scope.paper = rootSVG.append('svg:g')
					.attr({
						"id": "viewport",
						"transform": "translate(0,0)scale("+$scope.initialZoom+")"
					});
			};

			/**
			 * @function		drawCurrentPerspective
			 * @description		Adds the background image, and builds the print areas for the perspective
			 * @author			Jacob
			 * @params			pAreaData {object} The data with which to build this print area
			 * @returns			{object} An SVG object containing our print area
			 */
			$scope.drawCurrentPerspective = function(){
				// if we don't have a current perspective, bail
				if(!templateService.currentPerspective){ return; }

				// if we've already drawn this perspective, remove it for a fresh redraw
				if($scope.drawnPerspectives[templateService.currentPerspective.name] !== undefined){
					$scope.drawnPerspectives[templateService.currentPerspective.name].remove();
				}

				// we're going to create a group for this perspective so that
				// we can reference it and even remove it if we wanted to redraw.
				var perspectiveGroup = $scope.paper.append('svg:g')
					.attr('id', templateService.currentPerspective.name + '_perspective');

				// store perspective for later
				$scope.drawnPerspectives[templateService.currentPerspective.name] = perspectiveGroup;

				// calculate the resScale for this perspective
				// this is important because our measurements rely on this value
				$scope.resScale = templateService.currentPerspective.resolution * (templateService.currentPerspective.scale / 100);

				// we'll need a colorized/texturized image of the template
				// to lay our guides and designs on top of.
				$scope.drawTemplateImage(perspectiveGroup);

				// we only want to do print area stuff if there are print areas to do it with
				// and we have a current perspective to work with (check for background).
				// this condition is really useful when we create new perspectives.
				if(templateService.currentPerspective.background && templateService.currentPerspective.printAreas){

					// loop through all the print areas in this perspective and
					// draw everything required for each.
					for(var i in templateService.currentPerspective.printAreas){
						if(templateService.currentPrintArea !== templateService.currentPerspective.printAreas[i]){
							$scope.drawPrintArea(perspectiveGroup, templateService.currentPerspective.printAreas[i]);
						}
					}
					// lastly, draw the current print area on top (i.e. last node)
					$scope.drawPrintArea(perspectiveGroup, templateService.currentPrintArea);
				}
			};

			/**
			 * @function		drawTemplateImage
			 * @description		Creates an SVG group to hold template color, texture and image.
			 * @author			Jacob
			 * @params			none
			 * @returns			nothing
			 */
			$scope.drawTemplateImage = function(perspectiveGroup){
				// we need the default color because it tells us a lot. In addition
				// to the color, it will also provide us info whether the color is textured
				// or if there is an accent color, or that accent is textured, etc. 
				var defaultColor = templateService.getTemplateDefaults('colors');

				// if we have no default color, set to white as default
				// so that we can add perspectives/print areas before setting up product colors.
				// everything else will be disabled (textures, accents, etc.) but product will have color.
				if(!defaultColor){ defaultColor = {hex:'#FFF'}; }

				// make sure to clear any previously drawn defs and SVG.
				// using groups makes this easy to control
				if($scope.tplImageDefsGroup !== undefined){ $scope.tplImageDefsGroup.remove(); }
				if($scope.tplImageGroup !== undefined){ $scope.tplImageGroup.remove(); }

				// create groups to contain our defs and our template image SVG
				// append the imageGroup to the perspectiveGroup so that it shows
				// behind the guides and designs.
				$scope.tplImageDefsGroup = $scope.globalDefs.append('svg:g').attr('id', 'tplImageDefsGroup');
				$scope.tplImageGroup = perspectiveGroup.append('svg:g').attr('id', 'tplImageGroup');

				// create an image mask to use as texture for our product color
				if(defaultColor.heathering !== undefined){
					$scope.colorTex = $scope.tplImageDefsGroup.append('svg:mask').attr({ 'id': 'colorTex' });
					$scope.colorTex.append('image')
						.attr({ 'x':0, 'y':0, 'width':'100%', 'height':'100%', 'xlink:href':'images/heather.gif' });
				}

				// The product is colored by using a rect behind a transparent image of the product.
				// To make sure the product has a texture, we apply the texture mask to the rect.
				$scope.colorBg = $scope.tplImageGroup.append('svg:rect')
					.attr({ 'x':0, 'y':0, 'width':'100%', 'height':'100%', 'fill':defaultColor.hex });

				// if there is a color texture, apply it to the color bg
				if(defaultColor.heathering !== undefined){
					$scope.colorBg.attr('mask', 'url(#colorTex)');
				}

				// Accents are created by using an image mask of the areas where the product is accented.
				// The image mask allows the accent to show through when applied to a colored rect.
				// To make sure the accents have texture, we apply the texture mask to the image.
				// Basically: texture mask is applied to image mask then image mask is applied to accent color rect.
				if(templateService.currentPerspective.accentImage && defaultColor.accentHex){
					// add mask to defs
					$scope.accentMask = $scope.tplImageDefsGroup.append('svg:mask').attr({'id': 'accentMask'});
					// add image to mask
					$scope.accentMask.append('svg:image')
						.attr({
							'x': 0,
							'y': 0,
							'width': '100%',
							'height': '100%',
							'xlink:href': templateService.currentPerspective.accentImage,
							'mask': 'url(#colorTex)'
						});
					// add accent color bg with image mask applied
					$scope.accentColorBg = $scope.tplImageGroup.append('svg:rect')
						.attr({
							'x': 0,
							'y': 0,
							'width': '100%',
							'height': '100%',
							'fill': defaultColor.accentHex,
							'mask': 'url(#accentMask)'
						});
				}

				$scope.colorBg.attr('fill', defaultColor.hex);

				if($scope.accentColorBg !== undefined && defaultColor.accentHex !== undefined){
					$scope.accentColorBg.attr('fill', defaultColor.accentHex);
				}

				// add product image. DO THIS LAST so that the texture
				// of the product goes over any accent coloring.
				if(templateService.currentPerspective.background){
					$scope.tplImageGroup.append('svg:image')
						.attr({ 'x':0, 'y':0, 'width':'100%', 'height':'100%', 'xlink:href':templateService.currentPerspective.background });
				}
			};

			/**
			 * @function		drawPrintArea
			 * @description		Draws a single print area for a perspective.
			 * @author			Jacob
			 * @params			perspectiveGroup {SVG group} The group element of the parent perspective.
			 * @params			pAreaData {Object} The data for the print area.
			 * @returns			nothing
			 */
			$scope.drawPrintArea = function(perspectiveGroup, pAreaData){
				var scaleX = pAreaData.x * $scope.resScale;
				var scaleY = pAreaData.y * $scope.resScale;
				var scaleWidth = pAreaData.width * $scope.resScale;
				var scaleHeight = pAreaData.height * $scope.resScale;

				// first, we need a group to hold both the design and the guides.
				// this way we can drag the entire print area around for placement
				// and still keep the design and guides in separate containers.
				var printArea = perspectiveGroup.append('svg:g')
					.attr({
						"id": pAreaData.id + "_printArea",
						"transform": "translate(" + scaleX + "," + scaleY + ")",
						"width": scaleWidth,
						"height": scaleHeight
					});

				// // if we're creating/editing master or instance templates, allow print area dragging.
				// if($scope.model.permissions.canDragArea === true){
					var drag = d3.behavior.drag()
						// set the origin point of the draggable with draggable.data
						// .origin(function(d){ return d; })
						.origin(function() {
							var t = d3.select(this);
							return {
								x: t.attr("x") + d3.transform(t.attr("transform")).translate[0],
								y: t.attr("y") + d3.transform(t.attr("transform")).translate[1]
							};
						})
						.on('dragstart', function(d){
							templateService.currentPrintArea = d.layer;
							// we need to kill the propagation of the drag when started
							// so that we don't pan the view as we drag a draggable.
							d3.event.sourceEvent.stopPropagation();
						})
						.on('drag', function(d){
							// update the data
							d.layer.x = parseFloat((d3.event.x / $scope.resScale).toFixed(1));
							d.layer.y = parseFloat((d3.event.y / $scope.resScale).toFixed(1));

							d3.select(this).attr("transform", "translate(" + [d3.event.x, d3.event.y] + ")");
						})
						.on('dragend', function(d){
							$scope.$apply();
							$scope.drawCurrentPerspective();
						});

					// apply drag to print area
					printArea.data([{'layer':pAreaData}]).call(drag);
				// }

				// add this print area to our drawn array so that
				// we can reference it in other methods using the ID
				$scope.drawnAreas[pAreaData.id] = printArea;

				// draw print guides (border, label, safearea) before the design
				// so that they are behind it. Even though the border rect is transparent
				// it will prevent things from being dragged. There might be a better way
				// (like stroke on print area mask) but we'll leave this alone for now.
				$scope.drawPrintGuides(pAreaData);

				// if this perspective has a design, and design layers,
				// draw the designs for the print area. Do this after print guides
				// but before design guides to keep the correct order.
				if(pAreaData.design !== undefined && pAreaData.design.layers !== undefined){
					$scope.drawPrintAreaDesign(pAreaData);
				}

				// design guides (ruler, grid, guides (tbd)) go on top of the design
				// at request of the designers. 
				$scope.drawDesignGuides(pAreaData);
				
			};

			/**
			 * @function		drawPrintGuides
			 * @description		Draws a group for print guides (borders, labels)
			 * @author			Jacob
			 * @params			pAreaData {object} The data with which to build print guides for this print area
			 * @returns			nothing
			 */
			$scope.drawPrintGuides = function(pAreaData){
				// set some scaled values for easier equations
				var scaleX = pAreaData.x * $scope.resScale;
				var scaleY = pAreaData.y * $scope.resScale;
				var scaleWidth = pAreaData.width * $scope.resScale;
				var scaleHeight = pAreaData.height * $scope.resScale;
				
				// if we've already drawn this set of guides, clear our
				// 'memory' so that we can redraw it fresh.
				if($scope.drawnPrintGuides[pAreaData.id] !== undefined){
					$scope.drawnPrintGuides[pAreaData.id].remove();
				}

				// get the print area that we're going to be drawing guides for
				var printArea = $scope.drawnAreas[pAreaData.id];

				// all the guides are going to be placed into one group.
				var printGuidesGroup = printArea.append('svg:g')
					.attr({
						"id": pAreaData.id + "_printGuides",
						"width": scaleWidth,
						"height": scaleHeight,
						"opacity": (templateService.currentPrintArea == pAreaData ? 1 : 0.5)
					});
				
				// remember that we've drawn this set of guides
				$scope.drawnPrintGuides[pAreaData.id] = printGuidesGroup;

				// the labels can sometimes be intrusive so we can toggle them on and off
				// draw labels for all print areas when enabled
				if($scope.model.borders.labeled){
					$scope.drawPrintAreaLabels(printGuidesGroup, pAreaData);
				}

				// turning off the borders helps the design be more visible
				// draw borders for all print areas when enabled
				if($scope.model.borders.enabled){
					$scope.drawBorders(printGuidesGroup, pAreaData);
				}
			};

			$scope.drawDesignGuides = function(pAreaData){

				// set some scaled values for easier equations
				var scaleX = pAreaData.x * $scope.resScale;
				var scaleY = pAreaData.y * $scope.resScale;
				var scaleWidth = pAreaData.width * $scope.resScale;
				var scaleHeight = pAreaData.height * $scope.resScale;
				
				// if we've already drawn this set of guides, clear our
				// 'memory' so that we can redraw it fresh.
				if($scope.drawnDesignGuides[pAreaData.id] !== undefined){
					$scope.drawnDesignGuides[pAreaData.id].remove();
				}

				// get the print area that we're going to be drawing guides for
				var printArea = $scope.drawnAreas[pAreaData.id];

				var designGuidesGroup = printArea.append('svg:g')
					.attr({
						"id": pAreaData.id + "_designGuides",
						"width": scaleWidth,
						"height": scaleHeight
					});
				
				// remember that we've drawn this set of guides
				$scope.drawnDesignGuides[pAreaData.id] = designGuidesGroup;

				// the rulers can sometimes be intrusive so we can toggle them on and off
				// draw rulers for all print areas when enabled
				if($scope.model.rulers.enabled && templateService.currentPrintArea === pAreaData){
					$scope.drawRulers();
				}

				// turning off the grid helps the design be more visible
				// draw grid for all print areas when enabled
				if($scope.model.grid.enabled && templateService.currentPrintArea === pAreaData){
					$scope.drawGrid();
				}
			};

			/**
			 * @function		drawBorders
			 * @description		Draws borders for print area and safe area.
			 * @author			Jacob
			 * @params			printGuidesGroup {svgObject} An SVG.js <g> object we use to encapsulate all guide elements.
			 * @params			pAreaData {object} The data (x,y, height, width, etc.) for this particular print area.
			 * @returns			nothing
			 */
			$scope.drawBorders = function(printGuidesGroup, pAreaData){
				// set some scaled values for easier equations
				var scaleX = pAreaData.x * $scope.resScale;
				var scaleY = pAreaData.y * $scope.resScale;
				var scaleWidth = pAreaData.width * $scope.resScale;
				var scaleHeight = pAreaData.height * $scope.resScale;

				// if we've already drawn the borders, remove them
				// then create the group again to draw fresh ones
				if(d3.select('#' + pAreaData.id + '_borders').length > 0){
					d3.select('#' + pAreaData.id + '_borders').remove();
				}
				var borderGroup = printGuidesGroup.append('svg:g').attr('id', pAreaData.id + '_borders');

				// safe area border should be centered, so that means half
				// its size (safearea/2) from all sides. we'll use a variable
				// for this value to keep our equations reasonable.
				// also make sure to offset by the stroke-width too.
				if(pAreaData.safearea > 0){
					var halfScaleSafeArea = (pAreaData.safearea/2) * $scope.resScale;
					var pAreaSafe = borderGroup.append('svg:rect')
						.attr({
							"id": pAreaData.id + '_safeArea',
							"x": halfScaleSafeArea - 5,
							"y": halfScaleSafeArea - 5,
							"width": scaleWidth - (2*halfScaleSafeArea) + 10,
							"height": scaleHeight - (2*halfScaleSafeArea) + 10,
							"stroke": $scope.model.borders.safeAreaColor,
							"fill": "transparent",
							"stroke-width": 10,
							"stroke-opacity": 0.7,
							"stroke-dasharray": 40 + "," + 20
						});
				}

				// this is the actual print area border, offset by a pxl
				// so that the design is literally within the area, not
				// overlapping it or behind it or whatever. just in case,
				// we're going to include the border last so that it shows
				// up over everything, including the safe area border.
				var pAreaBorder = borderGroup.append('svg:rect')
					.attr({
						"id": pAreaData.id + '_outerBorder',
						"x": -5,
						"y": -5,
						"width": scaleWidth + 10,
						"height": scaleHeight + 10,
						"fill": "transparent",
						"stroke": (pAreaData.supported) ? $scope.model.borders.color : '#333',
						"stroke-width": 10,
						"stroke-opacity": 1,
						"stroke-dasharray": 40 + "," + 20
					});

				// if we're editing a master or instance template, enable scaling
				// if($scope.model.permissions.canScaleArea === true){
					var scale = d3.behavior.drag()
						// set the origin point of the draggable with draggable.data
						.origin(function(d){ return d; })
						.on('dragstart', function(d){
							// we need to kill the propagation of the drag when started
							// so that we don't pan the view as we drag a draggable.
							d3.event.sourceEvent.stopPropagation();
						})
						.on('drag', function(d){
							// derive the new width,height from the x,y of the anchor
							var w = parseFloat((d3.event.x / $scope.resScale).toFixed(1));
							var h = parseFloat((d3.event.y / $scope.resScale).toFixed(1));

							// adjust the print area as we drag
							pAreaBorder.attr({
								"width": (w * $scope.resScale) + 10,
								"height": (h * $scope.resScale) + 10
							});

							// adjust the safe area too, if we have one
							if(pAreaSafe !== undefined){
								pAreaSafe.attr({
									"width": (w * $scope.resScale) - (2*halfScaleSafeArea) + 10,
									"height": (h * $scope.resScale) - (2*halfScaleSafeArea) + 10,
								});
							}

							// update the data x,y with the event x,y
							// and simultaneously update the x,y of
							// the element we're dragging
							d3.select(this).attr({
								'x': d.x = d3.event.x+10,
								'y': d.y = d3.event.y+10
							});

							// apply the new width and height to the print area
							d.pArea.width = w;
							d.pArea.height = h;
						})
						.on('dragend', function(d){
							$scope.$apply();
							$scope.drawCurrentPerspective();
						});

					// create a small handle that we can grab to scale
					var scaleHandle = borderGroup.append('svg:rect')
						.attr({
							"id": pAreaData.id + 'scaleHandle',
							"x": scaleWidth + 10,
							"y": scaleHeight + 10,
							"width": 40,
							"height": 40,
							"fill": "#FFF",
							"stroke": "#333",
							"stroke-width": 7
						})
						.data([{
							'x':scaleWidth+10,
							'y':scaleHeight+10,
							'pArea': pAreaData
						}])
						.call(scale);
				// }
			};

			/**
			 * @function		drawPrintAreaLabels
			 * @description		Adds labels to print areas to denote which one is which.
			 * @author			Jacob
			 * @params			printGuidesGroup {svgObject} An SVG.js <g> object we use to encapsulate all guide elements.
			 * @params			pAreaData {object} The data (x,y, height, width, etc.) for this particular print area.
			 * @returns			nothing
			 */
			$scope.drawPrintAreaLabels = function(printGuidesGroup, pAreaData){
				// if we've already drawn the borders, remove them
				// then create the group again to draw fresh ones
				if(d3.select('#' + pAreaData.id + '_areaLabels').length > 0){
					d3.select('#' + pAreaData.id + '_areaLabels').remove();
				}
				var labelGroup = printGuidesGroup.append('svg:g').attr('id', pAreaData.id + '_areaLabels');

				// create a label background (use -y so it's above the pArea border)
				// the width will be dynamic to the text inside. each character will
				// be given 35px of space, and an extra 30px for a bit of space on the end.
				var pAreaLabelBg = labelGroup.append('svg:rect')
					.attr({
						"id": pAreaData.id + '_labelBg',
						"x": 0,
						"y": -100,
						"width": 0,
						"height": 90,
						"fill": (pAreaData.supported ? "#EEE" : "#000")
					})
					.attr({ "width": (pAreaData.name.length * 35) + 30 });

				// for text, we use move() because text doesn't use x,y like others
				// we also scale to the editor scale, not the perspective scale, so that
				// the text remains legible as we scale the canvas and/or the perspective.
				var pAreaLabelText = labelGroup.append('text')
					.text(pAreaData.name)
					.attr({
						"id": pAreaData.id + '_labelText',
						"x": 10,
						"y": -30,
						"font-size": 69,
						"fill": pAreaData.supported ? '#000' : '#AAA',
						"opacity": 1
					});
			};

			/**
			 * @function		drawRulers
			 * @description		Draws ruler markings for the current print area.
			 * @author			Jacob
			 * @params			printGuidesGroup {svgObject} An SVG.js <g> object we use to encapsulate all guide elements.
			 * @params			pAreaData {object} The data (x,y, height, width, etc.) for this particular print area.
			 * @returns			nothing
			 */
			$scope.drawRulers = function(){
				var designGuidesGroup = $scope.drawnDesignGuides[templateService.currentPrintArea.id];
				var pAreaData = templateService.currentPrintArea;

				// by default start at 0
				var xLoc, yLoc = 0;

				// both rulers use the same size of 'ticks' or 'markings'
				var tickLength = -100;
				var tickWidth = 3;

				// remove rulers before drawing again, this will avoid drawing duplicate sets
				d3.select('#'+pAreaData.id+'_rulers').remove();

				// create a group to specificaly contain rulers
				var rulerGroup = designGuidesGroup.append('svg:g').attr('id', pAreaData.id + '_rulers');

				// draw rulers for the height
				for(var h = 0; h <= pAreaData.height; h+=0.1){
					// fix h so it doesn't have crazy decimals and our % works
					h = parseFloat(h.toFixed(1));
					xLoc = -20;
					yLoc = parseFloat((h * $scope.resScale).toFixed(1));

					var hLine = rulerGroup.append('line')
						.attr({
							"x1": xLoc,
							"y1": yLoc,
							"x2": xLoc,
							"y2": yLoc,
							"stroke": $scope.model.rulers.color,
							"stroke-width": tickWidth
						});

					if(h%1 === 0){ hLine.attr({ "x2": tickLength }); }
					else if(h%0.5 === 0){ hLine.attr({ "x2": tickLength / 1.25 }); }
					else if(h%1 !== 0 && h%0.5 !== 0){ hLine.attr({ "x2": tickLength / 1.75 });	}
				}

				// draw rulers for width
				for(var w = 0; w <= pAreaData.width; w+=0.1){
					// fix w so it doesn't have crazy decimals and our % works
					w = parseFloat(w.toFixed(1));
					xLoc = (w * $scope.resScale);
					yLoc = -20;

					var wLine = rulerGroup.append('line')
						.attr({
							"x1": xLoc,
							"y1": yLoc,
							"x2": xLoc,
							"y2": yLoc,
							"stroke": $scope.model.rulers.color,
							"stroke-width": tickWidth
						});

					if(w%1 === 0){ wLine.attr({ "y2": tickLength }); }
					else if(w%0.5 === 0){ wLine.attr({ "y2": tickLength / 1.25 }); }
					else if(w%1 !== 0 && w%0.5 !== 0){ wLine.attr({ "y2": tickLength / 1.75 }); }
				}
			};

			/**
			 * @function		drawGrid
			 * @description		Draws grid markings on the current print area.
			 * @author			Jacob
			 * @params			printGuidesGroup {svgObject} An SVG.js <g> object we use to encapsulate all guide elements.
			 * @params			pAreaData {object} The data (x,y, height, width, etc.) for this particular print area.
			 * @returns			nothing
			 */
			$scope.drawGrid = function(){
				var designGuidesGroup = $scope.drawnDesignGuides[templateService.currentPrintArea.id];
				var pAreaData = templateService.currentPrintArea;

				// by default, start at 0
				var xLoc, yLoc = 0;

				// set sizes of grid lines. thickest for full inch
				// med for half inch, thin for qtr inch.
				var lineWidth_full = 4;
				var lineWidth_half = 2;
				var lineWidth_qtr = 1;

				// create vars for scaled dimensions to make our lives easier
				var scaleWidth = pAreaData.width * $scope.resScale;
				var scaleHeight = pAreaData.height * $scope.resScale;

				// remove grid before drawing again, this will avoid drawing duplicate sets
				d3.select('#'+pAreaData.id+'_grid').remove();

				// create a group to specifically hold grid
				var gridGroup = designGuidesGroup.append('svg:g').attr('id', pAreaData.id + '_grid');

				// draw y axis grid
				for(var h = 0; h <= pAreaData.height; h+=0.5){
					// fix h so it doesn't have crazy decimals and our % works
					h = parseFloat(h.toFixed(1));
					xLoc = 0;
					yLoc = (h * $scope.resScale);

					var hLine = gridGroup.append('line')
						.attr({
							"x1": xLoc,
							"y1": yLoc,
							"x2": xLoc,
							"y2": yLoc,
							"stroke": $scope.model.grid.color
						})
						// .transition().duration(1000).delay(h*100)
						.attr({ "x2": scaleWidth });

					// using elseif so we don't overlap markings
					if(h%1 === 0){ hLine.attr('stroke-width', lineWidth_full); }
					else if(h%0.5 === 0){ hLine.attr('stroke-width', lineWidth_half); }
					// else if(h%1 !== 0 && h%0.5 !== 0){ hLine.attr('stroke-width', lineWidth_qtr); }
				}

				// draw x axis grid
				for(var w = 0; w <= pAreaData.width; w+=0.5){
					// fix w so it doesn't have crazy decimals and our % works
					w = parseFloat(w.toFixed(1));
					xLoc = (w * $scope.resScale);
					yLoc = 0;

					var wLine = gridGroup.append('line')
						.attr({
							"x1": xLoc,
							"y1": yLoc,
							"x2": xLoc,
							"y2": yLoc,
							"stroke": $scope.model.grid.color
						})
						// .transition().duration(1000).delay(w*100)
						.attr({ "y2": scaleHeight });

					// using elseif so we don't overlap markings
					if(w%1 === 0){ wLine.attr('stroke-width', lineWidth_full); }
					else if(w%0.5 === 0){ wLine.attr('stroke-width', lineWidth_half); }
					// else if(w%1 !== 0 && w%0.5 !== 0){ wLine.attr('stroke-width', lineWidth_qtr); }
				}
			};

			/**
			 * @function		drawPrintAreaDesign
			 * @description		Draws all the layers within a template design.
			 * @author			Jacob
			 * @params			pAreaData {object} The data for the print area which includes the design data.
			 * @returns			nothing
			 */
			$scope.drawPrintAreaDesign = function(pAreaData){
				// set some scaled values for easier equations
				var scaleX = pAreaData.x * $scope.resScale;
				var scaleY = pAreaData.y * $scope.resScale;
				var scaleWidth = pAreaData.width * $scope.resScale;
				var scaleHeight = pAreaData.height * $scope.resScale;

				// get the root svg of the print area we'll be drawing too
				// we can't pass it in because this method is also called by a watcher
				// that won't have the printArea on hand.
				var printArea = $scope.drawnAreas[pAreaData.id];

				// in order to make sure our design is completely standalone
				// we're going to put it in its own SVG element.
				var designSVG = printArea.append('svg')
					.attr({
						"id": pAreaData.id + "_design",
						"opacity": (templateService.currentPrintArea.id == pAreaData.id ? 1 : 0.8)
					});

				// remember that we've drawn this design
				$scope.drawnDesigns[pAreaData.id] = designSVG;

				// create a definitions object specific to this
				// design SVG. This will allow clip paths, etc.
				// to be carried around with this design.
				var designDefs = designSVG.append('svg:defs');

				// create a clip area to only show "live" area.
				// this clip area is part of the design SVG so that when
				// we single out the design for rendering, the clip area
				// stays around to keep the design in check for printing.
				var clipPath = designDefs.append('clipPath')
					.attr({ "id": pAreaData.id + "_clip" })
					// our clip path is just a rectangle
					.append('svg:rect')
					.attr({
						"width": scaleWidth,
						"height": scaleHeight
					});
	
				// A cutout mask is used to cut holes in the design so that the
				// user gets an idea of where things like buttons and/or camera lenses
				// are going to be exposed. If we have one, add it to the defs so that
				// we can later use it with our layer group.
				if(pAreaData.cutoutMask){
					designDefs.append('mask').attr({ "id": pAreaData.id + "_mask" })
						.append('image')
						.attr({
							"xlink:href": templateService.currentPrintArea.cutoutMask,
							"width": scaleWidth,
							"height": scaleHeight
						});
				}

				// layers are drawn in a seperate method so that
				// we we need to rearrange them, we don't need to
				// redraw the entire print area again.
				if($scope.model.context == 'design' && pAreaData.design && pAreaData.design.layers){
					$scope.drawDesignLayers(pAreaData, designSVG);
				}
			};

			/**
			 * @function		drawDesignLayers
			 * @description		Loops through all design layers and renders them in the print area.
			 * @author			Jacob
			 * @params			pAreaData {Object} The data for this specific print area
			 * @params			designSVG {SVG} The nested SVG element that specifically holds the design for render.
			 * @returns			nothing
			 */
			$scope.drawDesignLayers = function(pAreaData, designSVG){
				// it's easier to clip our layers if they're in a group.
				var layerGroup = designSVG.append('svg:g').attr({
					"id": pAreaData.id + '_layers',
					"clip-path": "url(#" + pAreaData.id + "_clip" + ")"
				});

				// apply mask to layer group if available.
				// its important to make sure that the ID matches
				// since the mask was created with the print area.
				if(pAreaData.cutoutMask){ layerGroup.attr({ "mask": "url(#" + pAreaData.id + "_mask)" }); }

				// var drag = d3.behavior.drag()
				// 	// set the origin point of the draggable with draggable.data
				// 	.origin(function(d){ return d; })
				// 	// dragstart is like a click, it happens whether element is dragged or not.
				// 	.on('dragstart', function(d){
				// 		// whatever the user is about to drag (or click on),
				// 		// that is the current design layer.
				// 		$scope.model.currentDesignLayer = d.layer;
				// 		d3.event.sourceEvent.stopPropagation();
				// 	})
				// 	.on('drag', function(d){
				// 		var x = parseFloat((d3.event.x / $scope.resScale).toFixed(1));
				// 		var y = parseFloat((d3.event.y / $scope.resScale).toFixed(1));

				// 		// update the data x,y with the event x,y
				// 		// and simultaneously update the x,y of
				// 		// the element we're dragging
				// 		d3.select(this).attr({
				// 			'x': d.x = d3.event.x,
				// 			'y': d.y = d3.event.y
				// 		});

				// 		// apply the new width and height to the print area
				// 		d.layer.x = x;
				// 		d.layer.y = y;
				// 	})
				// 	.on('dragend', function(d){
				// 		$scope.$apply();
				// 		$scope.drawCurrentPerspective();
				// 	});

				// sort the layers by zindex, putting the highest
				// zindex above/after the lower values.
				var orderedLayers = $filter('orderBy')(pAreaData.design.layers, 'zindex');

				// simple loop to create each layer.
				for(var i in orderedLayers){
					var layer = orderedLayers[i];

					// for this layer, add a rect for the BBox. after the layer
					// is created, we will use it's getBBox values to finish this rect.
					// var layerSVGBBox = layerGroup.append('svg:rect')
					// 	.attr({
					// 		'stroke': 'red',
					// 		'stroke-width': 7,
					// 		'fill': 'none'
					// 	});

					// var layerSVGBBoxHandle = layerGroup.append('svg:rect')
					// 	.attr({
					// 		'stroke': '#333',
					// 		'stroke-width': 7,
					// 		'fill': '#FFF'
					// 	});

					// pass off the actual svg generation to other methods.
					// Mostly for code organization and to keep this method manageable.
					var layerSVG;
					switch(layer.type){
						case "image":		layerSVG = $scope.drawImageLayer(layerGroup, layer);	break;
						case "text":		layerSVG = $scope.drawTextLayer(layerGroup, layer);		break;
					}
					
					// now position and stretch the bounding box rect
					// to encompas our layer
					// var BBox = layerSVG.node().getBBox();
					// var clientRect = layerSVG.node().getBoundingClientRect();

					// layerSVGBBox.attr(BBox);
					// layerSVGBBox.attr({
					// 	'x': clientRect.top,
					// 	'y': clientRect.left,
					// 	'width': clientRect.width,
					// 	'height': clientRect.height
					// });

					// layerSVGBBoxHandle.attr({
					// 	'x': BBox.x + BBox.width + 10,
					// 	'y': BBox.y + BBox.height + 10,
					// 	"width": 0.5 * $scope.resScale,
					// 	"height": 0.5 * $scope.resScale
					// })
					// .data([{
					// 	'x': BBox.x + BBox.width + 10,
					// 	'y': BBox.y + BBox.height + 10,
					// 	'layerSVG': layerSVG
					// }]);

					// layerSVG.data([{
					// 	"x": layer.x * $scope.resScale,
					// 	"y": layer.y * $scope.resScale,
					// 	"layer": layer
					// }]).call(drag);
				}
			};

			

			/**
			 * @function		drawImageLayer
			 * @description		Uses SVG.js to create a image and manage its attributes.
			 * @author			Jacob
			 * @params			layerGroup {DOM} The SVG element of the print area we're drawing inside of.
			 * @params			layer {object} The data object that represents the design layer.
			 * @returns			{DOM} An SVG element created by SVG.js
			 */
			$scope.drawImageLayer = function(layerGroup, layer){
				var scaleX = layer.x * $scope.resScale;
				var scaleY = layer.y * $scope.resScale;
				var scaleWidth = layer.width * $scope.resScale;
				var scaleHeight = layer.height * $scope.resScale;
				var layerCenterX = scaleX + (scaleWidth/2);
				var layerCenterY = scaleY + (scaleHeight/2);
				var areaCenterX = (templateService.currentPrintArea.width * $scope.resScale) / 2;
				var areaCenterY = (templateService.currentPrintArea.height * $scope.resScale) / 2;

				// if the image has a URL an a supported image extension then we can go ahead 
				// and load the image into a var to determine it's true height and width. 
				// We'll update the scope instead of just the layer dimensions and everything 
				// will fall into place. ** Only do this if width,height is zero. This means
				// that the layer is new; otherwise the design has already been layed out.
				// this is also asynchronous so it will continue to run after we return the image.
				if(layer.width === 0 || layer.height === 0){
					if(layer.imageURL !== undefined){
						var img = new Image();
						img.src = layer.imageURL;
						$(img).load(function(){
							layer.x = (areaCenterX - (this.width / 2)) / $scope.resScale;
							layer.y = (areaCenterY - (this.height / 2)) / $scope.resScale;
							layer.width = this.width / $scope.resScale;
							layer.height = this.height / $scope.resScale;
							$scope.$apply();
						});
					}
				}

				// set the width and height using the current/default
				// layer values. When we finish loading the resource
				// we'll update the width and height using true dimensions.
				return layerGroup.append('svg:image')
					.attr({
						"id": "image_" + Date.now(),
						"xlink:href": layer.imageURL,
						"x": scaleX,
						"y": scaleY,
						"width": scaleWidth,
						"height": scaleHeight,
						"preserveAspectRatio": "none",
						"transform": "rotate("+layer.angle+","+layerCenterX+","+layerCenterY+")"
					});
			};

			/**
			 * @function		drawTextLayer
			 * @description		Uses SVG.js to create a text and manage its attributes.
			 * @author			Jacob
			 * @params			layerGroup {DOM} The SVG element of the print area we're drawing inside of.
			 * @params			layer {object} The data object that represents the design layer.
			 * @returns			{DOM} An SVG element created by SVG.js
			 */
			$scope.drawTextLayer = function(layerGroup, layer){
				var scaleX = layer.x * $scope.resScale;
				var scaleY = layer.y * $scope.resScale;
				var scaleWidth = layer.width * $scope.resScale;
				var scaleHeight = layer.height * $scope.resScale;
				var layerCenterX = scaleX + (scaleWidth/2);
				var layerCenterY = scaleY + (scaleHeight/2);

				return layerGroup.append('svg:text')
					.text(layer.content)
					.attr({
						"id": "text_" + Date.now(),
						"x": scaleX,
						"y": scaleY,
						"text-anchor": "start",
						// reducing resScale makes font sizes something more expected.
						// otherwise they would be abnormally large for the size value.
						"font-size": layer.fontSize * ($scope.resScale*0.05),
						"font-family": layer.fontFamily,
						"stroke": layer.stroke,
						// multiplier makes strokes nearly equivalent to inches
						"stroke-width": layer.strokeWidth * $scope.resScale,
						"fill": layer.fill,
						"transform": "rotate("+layer.angle+","+layerCenterX+","+layerCenterY+")"
					});
			};
		}
	};
}]);