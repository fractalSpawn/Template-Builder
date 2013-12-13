// by default, the template service should have no template
ppdServices.service('templateService', ['$http', '$filter', '$upload', function($http, $filter, $upload){
	
	var templateService = {
		currentTemplate: null,
		currentPerspective: null,
		currentPrintArea: null,
		templateList: [],
		perspectiveList: [],
		printAreaList: [],
		designList: [],
		availableAttributes: {},
		deprecatedAttributes: {},
		newAttributes: {},
		errorMsg: null,
		successMsg: null,
		xhrProgress: {},

		/////////////////////////////////////////////////////////////////////////////
		//   .---. .----..-.   .-..----. .-.     .--.  .---. .----. .----.
		//  {_   _}| {_  |  `.'  || {}  }| |    / {} \{_   _}| {_  { {__  
		//    | |  | {__ | |\ /| || .--' | `--./  /\  \ | |  | {__ .-._} }
		//    `-'  `----'`-' ` `-'`-'    `----'`-'  `-' `-'  `----'`----' 
		/////////////////////////////////////////////////////////////////////////////
		/**
		 * @function		getAllTemplates
		 * @description		Gets a list of all available templates but does not select one by default
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		getAllTemplates: function(){
			var onSuccess = function(response){
				templateService.templateList = response.data;
				templateService.groomPerspectives();
				return templateService.templateList;
			};
			var onError = function(response){
				angular.forEach(response.data.causes, function(cause, i){
					templateService.errorMsg = cause.message;
				});
			};
			// var url = 'http://localhost:3000/products/;
			var url = 'js/products';
			var promise = $http.get(url).then(onSuccess, onError);
			return promise;
		},

		/**
		 * @function		getTemplate
		 * @description		Gets a single template basd on id
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		getTemplate: function(id){
			var onSuccess = function(response){
				templateService.setCurrentTemplate(response.data);
				// check if template exists in template list, if not append it.
				var preExisting = false;
				angular.forEach(templateService.templateList, function(template, i){
					// if template is preexisting, make sure it's updated
					if(template.id === templateService.currentTemplate.id){
						preExisting = true;
						// by setting the current template to the template
						// in the list, we are ensuring only one instance of it.
						templateService.setCurrentTemplate(template);
					}
				});
				if(!preExisting){ templateService.templateList.push(templateService.currentTemplate); }

				templateService.groomPerspectives();
				return templateService.currentTemplate;
			};
			var onError = function(response){
				angular.forEach(response.data.causes, function(cause, i){
					templateService.errorMsg = cause.message;
				});
			};
			// var url = 'http://localhost:3000/products/'+id;
			var url = 'js/single_product';
			var promise = $http.get(url).then(onSuccess, onError);
			return promise;
		},
		
		/**
		 * @function		setCurrentTemplate
		 * @description		Sets a template from the template list to be the current template
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		setCurrentTemplate: function(template){
			// if template is undefined then we are either trying to set or clear/empty (template = null)
			if(!template && template !== null){
				templateService.errorMsg = "Cannot set template that does not exist.";
			}

			templateService.currentTemplate = template;
			templateService.currentPerspective = null;
			templateService.currentPrintArea = null;
			templateService.groomPerspectives();

			// life is much easier if the default color is an actual color option
			// it saves us from having to do a look up each time we want something
			// other than the name of the default color. Now that we've saved the template
			// that was passed in, we can just work on current template.
			if(templateService.currentTemplate.options && templateService.currentTemplate.options.colors){
				// make sure we have an array to save defaults to.
				if(!templateService.currentTemplate.options.defaults){ templateService.currentTemplate.options.defaults = {}; }
				// save the default color
				templateService.currentTemplate.options.defaults.colors = templateService.getTemplateDefaults('colors');
				templateService.currentTemplate.options.defaults.sizes = templateService.getTemplateDefaults('sizes');
				// we also want to run the method to get colors when the template is set
				// because this new template might be for a different fulfillment partner
				// and they might have a different set of colors then the ones we already know.
				templateService.getAvailableAttributes('colors');
				templateService.getAvailableAttributes('sizes');
			}
		},
		
		/**
		 * @function		addTemplate
		 * @description		adds a blank template to the template list, then sets it to the current template for editing
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		addTemplate: function(){
			// blank templates need certain arrays so they can be built upon
			var blankTemplate = {"name":"New Template " + (templateService.templateList.length+1)};
			templateService.templateList.push(blankTemplate);
			templateService.setCurrentTemplate(templateService.templateList[templateService.templateList.length-1]);
		},
		
		/**
		 * @function		cloneTemplate
		 * @description		Clones a template that was passed in, or the current template
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		cloneTemplate: function(template){
			template = template || templateService.currentTemplate;
			if(!template){
				templateService.errorMsg = "Cannot clone template that does not exist.";
				return;
			}
			var newTemplate = angular.copy(templateService.currentTemplate);
			newTemplate.name += " (CLONE)";
			delete newTemplate.id;
			templateService.templateList.push(newTemplate);
			templateService.groomPerspectives();
			templateService.setCurrentTemplate(newTemplate);
		},
		
		/**
		 * @function		saveTemplate
		 * @description		Saves a template (or the current template) to the database
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		saveTemplate: function(template){
			template = template || templateService.currentTemplate;
			if(!template){
				templateService.errorMsg = "Cannot save a template that does not exist.";
				return;
			}

			// make sure the template is ready to save
			templateService.prepareTemplateForSave(templateService.currentTemplate);

			var onSuccess = function(response){
				templateService.setCurrentTemplate(response.data);
				templateService.groomPerspectives();
				templateService.successMsg = "Template Successfully Saved!";
				return templateService.currentTemplate;
			};
			var onError = function(response){
				angular.forEach(response.data.causes, function(cause, i){
					templateService.errorMsg = cause.message;
				});
			};
			var url = 'http://localhost:3000/products';
			var promise;
			// if the template has an ID, we're updating it (PUT).
			// otherwise we're inserting a new one (POST).
			if(template.id){
				url += '/' + template.id;
				promise = $http.put(url, templateService.currentTemplate).then(onSuccess, onError);
			}
			else {
				promise = $http.post(url, template).then(onSuccess, onError);
			}
			return promise;
		},
		
		/**
		 * @function		prepareTemplateForSave
		 * @description		Cleans the template from anything we tweaked to make UI/UX coding easier.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		prepareTemplateForSave: function(template){
			if(template.options && template.options.defaults){
				// change the default color back to just the name
				if(template.options.defaults.colors){ template.options.defaults.colors = template.options.defaults.colors.name; }
				// change the default size back to just the name
				if(template.options.defaults.sizes){ template.options.defaults.sizes = template.options.defaults.sizes.name; }
			}
		},

		/**
		 * @function		removeTemplate
		 * @description		Removes a template (or current template) from the database.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		removeTemplate: function(template){
			template = template || templateService.currentTemplate;
			if(!template){
				templateService.errorMsg = "Cannot remove a template that does not exist.";
				return;
			}
			// response on success is a 204 no content
			var onSuccess = function(response){
				templateService.successMsg = "Template Successfully Removed!";
				templateService.setCurrentTemplate(null);
				// make sure to get a new list of templates
				templateService.getAllTemplates();
			};
			var onError = function(response){
				angular.forEach(response.data.causes, function(cause, i){
					templateService.errorMsg = cause.message;
				});
			};
			// if we have a template that has an ID, we need to remove from DB
			if(template.id){
				var url = 'http://trunk.apicore.mashon.internal/products/'+templateService.currentTemplate.id;
				var promise = $http.delete(url)
					.then(onSuccess, onError);
				return promise;
			}
			// if template doesn't have an ID, it hasn't been saved to db yet, just remove from list.
			else {
				angular.forEach(templateService.templateList, function(tpl, i){
					if(tpl === template){
						templateService.templateList.splice(i, 1);
						templateService.setCurrentTemplate(null);
						templateService.groomPerspectives();
					}
				});
			}
		},

		/**
		 * @function		getTemplateDefaults
		 * @description		Returns the full object of a default attribute.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		getTemplateDefaults: function(type, template){
			// use a template if we passed one in, otherwise use current template
			template = template || templateService.currentTemplate;

			if(!template || !template.options){
				// do not throw error, just return undefined.
				// defaults may just not be processed yet.
				return undefined;
			}
			// depending on the type, we will either return a type of option
			// or the entire defaults object. the backend uses plural label (colorS sizeS) so be careful!
			if(template.options.defaults){
				var options = template.options;
				var defaults = options.defaults;
				switch(type){
					case 'colors':
						if(defaults.colors){
							// if the template default is already an object return it
							// otherwise, find the corresponding object from the list and return that.
							if(defaults.colors.name){ return defaults.colors; }
							else { return $filter('filter')(options.colors, {'name':defaults.colors})[0]; }
						}
						else { return null; }
						break;
					case 'sizes':
						if(defaults.sizes){
							// if the template default is already an object return it
							// otherwise, find the corresponding object from the list and return that.
							if(defaults.sizes.name){ return defaults.sizes; }
							else { return $filter('filter')(options.sizes, {'name':defaults.sizes})[0]; }
						}
						else { return null; }
						break;
					default: return template.options.defaults;
				}
				// if all else fails, return undefined 
				// because that's exactly what the defaults are... undefined
				return undefined;
			}
		},
		
		/**
		 * @function		setTemplateDefaults
		 * @description		Updates the default attribute value in the current template.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		setTemplateDefaults: function(type, value){
			if(!templateService.currentTemplate.options){
				templateService.currentTemplate.options = {};
			}
			if(!templateService.currentTemplate.options.defaults){
				templateService.currentTemplate.options.defaults = {};
			}
			templateService.currentTemplate.options.defaults[type] = value;
		},


		//////////////////////////////////////////////////////////////////////////////////////
		//  .----. .----..----.  .----..----. .----..---.  .---. .-..-. .-..----. .----.
		//  | {}  }| {_  | {}  }{ {__  | {}  }| {_ /  ___}{_   _}| || | | || {_  { {__  
		//  | .--' | {__ | .-. \.-._} }| .--' | {__\     }  | |  | |\ \_/ /| {__ .-._} }
		//  `-'    `----'`-' `-'`----' `-'    `----'`---'   `-'  `-' `---' `----'`----' 
		//////////////////////////////////////////////////////////////////////////////////////
		/**
		 * @function		getCurrentTemplatePerspectives
		 * @description		Gets the list of perspectives from the current template.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		getCurrentTemplatePerspectives: function(){
			if(!templateService.currentTemplate){
				templateService.errorMsg = "Cannot get perspectives from a template that does not exist.";
				return;
			}
			templateService.perspectiveList = templateService.currentTemplate.perspectives;
			return templateService.perspectiveList;
		},
		
		/**
		 * @function		addPerspective
		 * @description		Adds a perspective to the current template.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		addPerspective: function(){
			if(!templateService.currentTemplate){
				templateService.errorMsg = "Cannot add perspective to a template that does not exist.";
				return;
			}
			// make sure there is an array to add perspecpostives to
			if(!templateService.currentTemplate.perspectives){	templateService.currentTemplate.perspectives = []; }
			var perspectives = templateService.currentTemplate.perspectives;
			var blankPerspective = {
				"name": 'Perspective '+perspectives.length,
				"resolution": 100,
				"scale": 100
			};
			perspectives.push(blankPerspective);
			templateService.groomPerspectives();
			templateService.currentPerspective = perspectives[perspectives.length-1];
		},
		
		/**
		 * @function		clonePerspective
		 * @description		Clones a perspective or the current perspective
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		clonePerspective: function(perspective){
			perspective = perspective || templateService.currentPerspective;
			if(!perspective){
				templateService.errorMsg = "Cannot clone perspective that does not exist.";
				return;
			}
			var perspectives = templateService.currentTemplate.perspectives;
			var clone = angular.copy(perspective);
			clone.id = 'perspective_' + perspectives.length;
			clone.name += " (Clone)";
			perspectives.push(clone);
			templateService.groomPerspectives();
			templateService.currentPerspective = perspectives[perspectives.length-1];
		},
		
		/**
		 * @function		removePerspective
		 * @description		Removes a perspective or the current perspective from the current template.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		removePerspective: function(perspective){
			perspective = perspective || templateService.currentPerspective;
			if(!perspective){
				templateService.errorMsg = "Cannot remove perspective that does not exist.";
				return;
			}
			angular.forEach(templateService.currentTemplate.perspectives, function(cPers, i){
				if(cPers === perspective){
					templateService.currentTemplate.perspectives.splice(i, 1);
					// if we just removed the current perspective, clear the service var
					// the groom method will rectify the current perspective for us.
					if(templateService.currentPerspective === perspective){
						templateService.currentPerspective = null;
						// our current print area is also gone, so null that out too.
						templateService.currentPrintArea = null;

					}
				}
			});
			templateService.groomPerspectives();
		},
		
		/**
		 * @function		setCurrentPerspective
		 * @description		Sets the current perspective to be the one passed in.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		setCurrentPerspective: function(perspective){
			if(!perspective){
				templateService.errorMsg = "Cannot select perspective that does not exist.";
				return;
			}
			templateService.currentPerspective = perspective;
			// also make sure to select the first print area in this perspective, if available.
			if(perspective.printAreas){
				templateService.currentPrintArea = perspective.printAreas[0];
			}
			// otherwise clear out the curent perspective because it's not part of this perspective.
			else { templateService.currentPrintArea = null; }
		},
		
		/**
		 * @function		groomPerspectives
		 * @description		Makes sure that our perspectives and print areas have unique IDs
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		groomPerspectives: function(){
			var resetPrintAreas = false;
			if(templateService.currentTemplate && templateService.currentTemplate.perspectives){
				angular.forEach(templateService.currentTemplate.perspectives, function(perspective, idx){
					perspective.id = 'perspective_' + idx;
					// if there is no current perspective use this one (the first one)
					if(!templateService.currentPerspective){
						// since we're reselecting a perspective, we want to also
						// reset the print areas to select the first available.
						resetPrintAreas = true;
						templateService.currentPerspective = perspective;
					}
					// if this perspective has no print areas (new perspective)
					// then clear the current print area because the current print
					// area must belong within the current perspective.
					if(!perspective.printAreas){ templateService.currentPrintArea = null; }
					// otherwise, groom the print areas too
					else { templateService.groomPrintAreas(perspective, idx, resetPrintAreas); }
				});
			}
		},

		
		

		/////////////////////////////////////////////////////////////////////////////
		//  .----. .----. .-..-. .-. .---.      .--.  .----. .----.  .--.   .----.
		//  | {}  }| {}  }| ||  `| |{_   _}    / {} \ | {}  }| {_   / {} \ { {__  
		//  | .--' | .-. \| || |\  |  | |     /  /\  \| .-. \| {__ /  /\  \.-._} }
		//  `-'    `-' `-'`-'`-' `-'  `-'     `-'  `-'`-' `-'`----'`-'  `-'`----' 
		/////////////////////////////////////////////////////////////////////////////
		/**
		 * @function		getPrintAreaList
		 * @description		Gets the list of all print areas for all perspectives in a template.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		getPrintAreaList: function(template){
			template = template || templateService.currentTemplate;
			if(!template){
				templateService.errorMsg = "Cannot get print areas from a template that does not exist.";
				return;
			}
			templateService.printAreaList = [];
			angular.forEach(templateService.currentTemplate.perspectives, function(perspective, i){
				angular.forEach(perspective.printAreas, function(pArea, idx){
					templateService.printAreaList.push(pArea);
				});
			});
			return templateService.printAreaList;
		},
		
		/**
		 * @function		addPrintArea
		 * @description		Adds a new print area to a perspective.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		addPrintArea: function(perspective){
			if(!templateService.currentTemplate){
				templateService.errorMsg = "Cannot add print area to template that does not exist.";
				return;
			}
			perspective = perspective || templateService.currentPerspective;
			if(!perspective){
				templateService.errorMsg = "Cannot add print area to perspective that does not exist.";
				return;
			}
			if(!perspective.printAreas){ perspective.printAreas = []; }
			var printAreas = templateService.currentPerspective.printAreas;
			// create a blank print area, but give some default size and position for better UX
			var blankPrintArea = {
				"name":'Print Area '+printAreas.length,
				"x": 1,
				"y": 1,
				"width":5,
				"height":5,
				"supported":true
			};
			printAreas.push(blankPrintArea);
			templateService.groomPerspectives();
			templateService.currentPrintArea = printAreas[printAreas.length-1];
		},
		
		/**
		 * @function		clonePrintArea
		 * @description		Clones a print area and adds it to the same perspective.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		clonePrintArea: function(printArea){
			printArea = printArea || templateService.currentPrintArea;
			if(!printArea){
				templateService.errorMsg = "Cannot clone print area that does not exist";
				return;
			}
			var printAreas = templateService.currentPerspective.printAreas;
			var clone = angular.copy(printArea);
			clone.name += ' (Clone)';
			// offset the clone just a little bit
			clone.x++;
			clone.y++;
			printAreas.push(clone);
			templateService.groomPerspectives();
			templateService.currentPrintArea = printAreas[printAreas.length-1];
			templateService.successMsg = "Print Area Successfully Cloned!";
		},
		
		/**
		 * @function		removePrintArea
		 * @description		Removes a print area from a perspective.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		removePrintArea: function(printArea){
			printArea = printArea || templateService.currentPrintArea;
			if(!printArea){
				templateService.errorMsg = "Cannot remove print area that does not exist.";
				return;
			}
			angular.forEach(templateService.currentPerspective.printAreas, function(pArea, i){
				if(pArea === printArea){
					templateService.currentPerspective.printAreas.splice(i, 1);
					// if we've removed the current perspective, we need to null the service var
					// grooming will take care of re-assigning it as necessary.
					if(templateService.currentPrintArea === printArea){
						templateService.currentPrintArea = null;
					}
				}
			});
			templateService.groomPerspectives();
		},
		
		/**
		 * @function		setCurrentPrintArea
		 * @description		Sets the current print area to be the one passed in.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		setCurrentPrintArea: function(printArea){
			if(!printArea){
				templateService.errorMsg = "Cannot select print area that does not exist.";
				return;
			}
			templateService.currentPrintArea = printArea;
			// because a print area cannot be current unless its perspective
			// is current, select its perspective too. that's why it has a perspective ID
			angular.forEach(templateService.currentTemplate.perspectives, function(perspective, i){
				if(perspective.id === printArea.perspectiveId){
					templateService.currentPerspective = perspective;
				}
			});
		},
		
		/**
		 * @function		groomPrintAreas
		 * @description		Makes sure that the print areas have unique IDs within their perspective.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		groomPrintAreas: function(perspective, idx, reset){
			angular.forEach(perspective.printAreas, function(pArea, pIdx){
				pArea.id = 'area_' + pIdx;
				// we give the print area a perspective id
				// so that it knows who it's parent is.
				pArea.perspectiveId = 'perspective_' + idx;
				// if this perspective is the current perspective, select
				// this print area (actually, the last print area) to be current.
				if(perspective === templateService.currentPerspective){
					// if we're resetting the print areas and this is the first print area
					// select it as current, otherwise, select the last print area in the loop.
					if(reset && pIdx === 0){ templateService.currentPrintArea = pArea; }
					else if(!reset){ templateService.currentPrintArea = pArea; }
				}
			});
		},

		/**
		 * @function		onPrintAreaFileSelect
		 * @description		Handles uploads for print area images (cutout) using angular-file-upload
		 * @author			Jacob
		 * @params			files {array} The list of files from our upload field(s)
		 * @returns			nothing
		 */
		onPrintAreaFileSelect: function(type, files){
			// what to do during upload.
			// requires angular-file-upload-shim to work
			var onUploadProgress = function(evt){
				var percent = ((evt.loaded / evt.total) * 100);
				if(!templateService.xhrProgress[templateService.currentPerspective.id]){
					templateService.xhrProgress[templateService.currentPerspective.id] = {};
					templateService.xhrProgress[templateService.currentPerspective.id][templateService.currentPrintArea.id] = {};
				}
				if(!templateService.xhrProgress[templateService.currentPerspective.id][templateService.currentPrintArea.id][type]){
					templateService.xhrProgress[templateService.currentPerspective.id][templateService.currentPrintArea.id][type] = 0;
				}
				templateService.xhrProgress[templateService.currentPerspective.id][templateService.currentPrintArea.id][type] = percent;
				// when we're done with the loading, clear the value to clear the progress meter
				if(percent === 100){
					delete templateService.xhrProgress[templateService.currentPerspective.id][templateService.currentPrintArea.id][type];
				}
			};
			// what to do on success
			var onUploadSuccess = function(data, status, headers, config){
				// we're using a switch here so we don't have to mess with the
				// model to match whatever type (accent or bg) we want to set.
				switch(type){
					// add the name of our image as the background image in our perspective
					case 'cutout': templateService.currentPrintArea.cutout = data.data; break;
				}
			};
			// what to do if upload fails
			var onUploadError = function(response, status, headers, config){
				if(status === 500){ console.error("Error 500: Internal Server Error:\n", response); }
				else{ console.log(status, response); }
			};
			
			// loop through all files and upload 'em.
			for(var i=0; i < files.length; i++){
				var file = files[i];
				$upload.upload({
					url: "http://stage.creator.dabbleapp.internal/image/upload?qqfile=" + file.name,
					method: "POST",
					// data.qqfile is required for uploading to current system
					data: { 'qqfile': file },
					// file is required for angular file upload to work a intended
					file: file
				})
				.progress(onUploadProgress)
				.success(onUploadSuccess)
				.error(onUploadError);
			}
		},
		

		/////////////////////////////////////////////////////////////////////////////
		//  .----.  .----. .---. .-. .-.   .-.     .--..-.  .-..----..----.  .----.
		//  | {}  \{ {__  /   __}|  `| |   | |    / {} \\ \/ / | {_  | {}  }{ {__  
		//  |     /.-._} }\  {_ }| |\  |   | `--./  /\  \}  {  | {__ | .-. \.-._} }
		//  `----' `----'  `---' `-' `-'   `----'`-'  `-'`--'  `----'`-' `-'`----' 
		/////////////////////////////////////////////////////////////////////////////
		/**
		 * @function		getDesignsList
		 * @description		Gets designs from all print areas and stores them for application to other templates.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		getDesignsList: function(template){
			template = template || templateService.currentTemplate;
			if(!template){
				templateService.errorMsg = "Cannot get designs from templates that do not exist.";
				return;
			}
			// it's easier to get designs from print areas directly, so if we
			// don't have a print area list ready, make it now.
			if(!templateService.printAreaList.length){
				templateService.getPrintAreaList();
			}
			angular.forEach(templateService.printAreaList, function(pArea, i){
				if(pArea.design && pArea.design.layers.length){
					angular.forEach(pArea.design.layers, function(){
						// we'll need to store designs in objects so we can 
						// keep designs for different print areas in the similar print areas
						// (chest == center, pocket == front-left, etc.) when we apply them
						// to other templates.
					});
				}
			});
		},
		
		/**
		 * @function		applyDesigns
		 * @description		Takes the stored designs and applies them to similar print areas on different templates.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		applyDesigns: function(template){
			template = template || templateService.currentTemplate;
			if(!template){
				templateService.errorMsg = "Cannot apply designs to templates that do not exist.";
				return;
			}
			if(!templateService.designList.length){
				templateService.errorMsg = "There are no designs to apply.";
				return;
			}
		},


		/////////////////////////////////////////////////////////////////////////////
		//    .--.  .---.  .---. .----. .-..----. .-. .-. .---. .----. .----.
		//   / {} \{_   _}{_   _}| {}  }| || {}  }| { } |{_   _}| {_  { {__  
		//  /  /\  \ | |    | |  | .-. \| || {}  }| {_} |  | |  | {__ .-._} }
		//  `-'  `-' `-'    `-'  `-' `-'`-'`----' `-----'  `-'  `----'`----' 
		/////////////////////////////////////////////////////////////////////////////
		/**
		 * @function		getAvailableAttributes
		 * @description		Gets all the attributes of a specific type that are available from the fulfillment partner.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		getAvailableAttributes: function(type){
			var onSuccess = function(response){
				if(!templateService.availableAttributes[type]){ templateService.availableAttributes[type] = []; }
				templateService.availableAttributes[type] = response.data;
				// now that we have available attributes, get the list of deprecated and new
				templateService.getDeprecatedAttributes(type);
				templateService.getNewAttributes(type);

				// return to anyone waiting
				return templateService.availableAttributes[type];
			};
			var onError = function(response){
				angular.forEach(response.data.causes, function(cause, i){
					templateService.errorMsg = cause.message;
				});
			};
			var url = 'js/'+type;
			var promise = $http.get(url).then(onSuccess, onError);
			return promise;
		},
		
		/**
		 * @function		getDeprecatedAttributes
		 * @description		Compares available attributes with ones in the template to find out which ones are no longer fulfillable.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		getDeprecatedAttributes: function(type){
			if(!templateService.currentTemplate){
				templateService.errorMsg = "Cannot determine deprecated "+type+" from a template that does not exist.";
				return;
			}
			// if the template has no options, then we have no deprecated attributes and can just bail.
			if(!templateService.currentTemplate.options || !templateService.currentTemplate.options[type]){
				return;
			}
			// if we don't have available attributes yet, get them.
			// getting them will call to get deprecated attributes.
			if(!templateService.availableAttributes[type] || !templateService.availableAttributes[type].length){
				templateService.getAvailableAttributes(type);
				return;
			}
			// make sure we have a list to push onto
			if(!templateService.deprecatedAttributes[type]){ templateService.deprecatedAttributes[type] = []; }
			// clear the list to avoid duplicates
			templateService.deprecatedAttributes[type] = [];
			// compare each attribute in the template with available attributes
			// we are looking for attributes that are in the template, but not in available
			angular.forEach(templateService.currentTemplate.options[type], function(tAttr){
				var found = false;
				var filteredAttrs = $filter('filterByFulfillment')(templateService.availableAttributes[type], templateService.currentTemplate.partner);
				angular.forEach(filteredAttrs, function(aAttr){
					if(tAttr.name === aAttr.name){ found = true; }
				});
				if(!found){
					// store in simple format.
					templateService.deprecatedAttributes[type].push({ "name": tAttr.name });
					// automatically unsupport any deprecated attributes
					tAttr.supported = false;
				}
			});
		},
		
		/**
		 * @function		getNewAttributes
		 * @description		Compares available attributes with ones in the template to find out which ones are not in the template.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		getNewAttributes: function(type){
			if(!templateService.currentTemplate){
				templateService.errorMsg = "Cannot determine new colors from a template that does not exist.";
				return;
			}
			// if we don't have available attributes, get them
			// getting them will call for a new attribute list.
			if(!templateService.availableAttributes[type] || !templateService.availableAttributes[type].length){
				templateService.getAvailableAttributes(type);
				return;
			}
			// make sure we have a list to push onto
			if(!templateService.newAttributes[type]){ templateService.newAttributes[type] = []; }
			// clear the list to avoid duplicates
			templateService.newAttributes[type] = [];
			// check all available attributes against those in the template
			// we're looking for attributes that are available, but not yet in template
			angular.forEach(templateService.availableAttributes[type], function(aAttr){
				var found = false;
				if(templateService.currentTemplate.options && templateService.currentTemplate.options[type]){
					angular.forEach(templateService.currentTemplate.options[type], function(tAttr){
						if(tAttr.name === aAttr.name){ found = true; }
					});
				}
				// if not found in template, add as new attribute
				if(!found){
					// create a simple format for the attribute. template doesn't
					// need to have mappings, and wants 'specifcs' to be obvious (un-nested).
					templateService.newAttributes[type].push({ "name": aAttr.name });

				}
			});
		},
		
		/**
		 * @function		updateAttributes
		 * @description		Updates the attributes lists to make sure everything is up-to-date (usually after a change).
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		updateAttributes: function(){
			var types = ['colors', 'sizes'];
			for(var i in types){
				templateService.getDeprecatedAttributes(types[i]);
				templateService.getNewAttributes(types[i]);
			}
		},
		
		/**
		 * @function		attributeIsSupported
		 * @description		Loops through current options and checks for 'supported' property to be true.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		attributeIsSupported: function(type, attribute){
			var isSupported = false;
			if(!templateService.currentTemplate.options || !templateService.currentTemplate.options[type]){
				return isSupported;
			}

			angular.forEach(templateService.currentTemplate.options[type], function(attr, i){
				if(attr.name === attribute.name && attr.supported === true){ isSupported = true; }
			});
			return isSupported;
		},
		
		/**
		 * @function		attributeIsAvailable
		 * @description		Loops through available attributes to find if a specific one exists.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		attributeIsAvailable: function(type, attribute){
			var isAvailable = false;
			angular.forEach(templateService.availableAttributes[type], function(attr, i){
				if(attr.name === attribute.name){ isAvailable = true; }
			});
			return isAvailable;
		},
		
		/**
		 * @function		attributeIsDeprecated
		 * @description		Loops through deprecated attributes to find if a specific one exists.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		attributeIsDeprecated: function(type, attribute){
			var isDeprecated = false;
			angular.forEach(templateService.deprecatedAttributes[type], function(attr, i){
				if(attr.name === attribute.name){ isDeprecated = true; }
			});
			return isDeprecated;
		},
		
		/**
		 * @function		attributeIsNew
		 * @description		Loops through new attributes to find if a specific one exists.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		attributeIsNew: function(type, attribute){
			var isNew = false;
			angular.forEach(templateService.newAttributes[type], function(attr, i){
				if(attr.name == attribute.name){ isNew = true; }
			});
			return isNew;
		},

		/**
		 * @function		attributeIsDefault
		 * @description		Checks if a specific attribute matches the template default.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		attributeIsDefault: function(type, attribute){
			if(!templateService.currentTemplate.options ||
				!templateService.currentTemplate.options.defaults ||
				!templateService.currentTemplate.options.defaults[type]
			){
				return false;
			}
			var isDefault = false;
			if(attribute.name == templateService.currentTemplate.options.defaults[type].name){ isDefault = true; }
			return isDefault;
		},

		/**
		 * @function		toggleAttributeSupport
		 * @description		Toggles the 'supported' property for a specific attribute.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		toggleAttributeSupport: function(type, attribute){
			var defaultAttr = templateService.currentTemplate.options.defaults[type];
			var attrOptions = templateService.currentTemplate.options[type];
			// first find the attribute in our template list
			angular.forEach(attrOptions, function(attr){
				// when we find the attribute, toggle support level
				if(attr.name === attribute.name){
					attr.supported = attr.supported ? false : true;
					// if we are unsupporting the default attribute, or there is no default attribute
					// set the default attribute to the first available.
					if(!attribute.supported && (!defaultAttr || defaultAttr.name === attribute.name)){
						templateService.currentTemplate.options.defaults[type] = $filter('filter')(attrOptions, {'supported':true})[0];
					}
				}
			});
		},

		/**
		 * @function		addTemplateAttribute
		 * @description		Adds an attribute to the template options.
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		addTemplateAttribute: function(type, attribute){
			// make sure we have a place to add the attribute into
			if(!templateService.currentTemplate.options || !templateService.currentTemplate.options[type]){
				if(!templateService.currentTemplate.options){ templateService.currentTemplate.options = {}; }
				templateService.currentTemplate.options[type] = [];
			}
			// because attributes can be different things (colors|sizes) and therefore
			// have different properties, we need to consider this when adding the attribute
			// to the template. All attributes have a name and are supported by default though.
			var newAttr = { "name": attribute.name, "supported": true };
			
			// color specific properties
			if(attribute.specifics !== undefined){
				if(attribute.specifics.hex){ newAttr.hex = attribute.specifics.hex; }
				if(attribute.specifics.accentHex){ newAttr.accentHex = attribute.specifics.accentHex; }
				if(attribute.specifics.laserEtchHex){ newAttr.laserEtchHex = attribute.specifics.laserEtchHex; }
				if(attribute.specifics.heather){ newAttr.heather = attribute.specifics.heather; }
			}
			
			//XXX may need to rethink how we add specifics and how that can be generalized
			templateService.currentTemplate.options[type].push(newAttr);

			// if this is the only attribute, make it the default one
			if(templateService.currentTemplate.options[type].length == 1){
				templateService.setTemplateDefaults(type, templateService.currentTemplate.options[type][0]);
			}


			templateService.updateAttributes();
		},

		/**
		 * @function		removeTemplateAttribute
		 * @description		Removes an attribute from the template options and anywhere else it exists (used when it's deprecated).
		 * @author			Jacob
		 * @params			none
		 * @returns			nothing
		 */
		removeTemplateAttribute: function(type, attribute){
			// remove from the template itself
			angular.forEach(templateService.currentTemplate.options[type], function(tAttr, i){
				if(tAttr.name === attribute.name){ templateService.currentTemplate.options[type].splice(i,1); }
			});
			// remove from deprecated attribute list
			angular.forEach(templateService.deprecatedAttributes[type], function(dAttr, i){
				if(dAttr.name === attribute.name){ templateService.deprecatedAttributes[type].splice(i,1); }
			});
			// if this was a default attribute, make the default attribute the next one available.
			if(templateService.currentTemplate.options.defaults[type].name === attribute.name){
				templateService.currentTemplate.options.defaults[type] = templateService.currentTemplate.options[type][0];
			}
		}
	};
	return templateService;
}]);