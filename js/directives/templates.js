ppdDirectives.directive('templates', ['templateService', function(templateService){
	return {
		restrict: "E",
		scope: {
			"model": "=model"
		},
		templateUrl: "partials/templates.html",
		replace: true,
		link: function($scope, $el, $attrs){

			// $scope.$watch(function(){ return templateService.templateList; }, function(newValue, oldValue){

			// }, true);

		},
		controller: function($scope){

			$scope.templateService = templateService;
			

			// // stores all the designs from the current template
			// // to be applied to other templates
			// $scope.getCurrentDesigns = function(){
			// 	// look in the current template for all designs
			// 	var designs = {};
			// 	for(var p in $scope.model.currentTemplate.perspectives){
			// 		var perspective = $scope.model.currentTemplate.perspectives[p];
			// 		for(var a in perspective.printAreas){
			// 			var pArea = perspective.printAreas[a];

			// 			// store the design 
			// 			designs[perspective.id + "_" + pArea.id] = pArea.design;
			// 		}
			// 	}
			// 	return designs;
			// };

			// // applies all the designs from a specific area to
			// // similar and availiable areas in another template.
			// $scope.applyDesigns = function(template, designs){
			// 	for(var p in template.perspectives){
			// 		var perspective = template.perspectives[p];
			// 		for(var a in perspective.printAreas){
			// 			var pArea = perspective.printAreas[a];
			// 			pArea.design = designs[perspective.id + "_" + pArea.id];
			// 		}
			// 	}
			// 	return template;
			// };

		}
	};
}]);