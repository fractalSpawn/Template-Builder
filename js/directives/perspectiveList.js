ppdDirectives.directive('perspectiveList', ['templateService', function(templateService){
	return {
		restrict: "EA",
		scope: {
			"iconWidth": "=iconWidth",
			"iconHeight": "=iconHeight"
		},
		templateUrl: "partials/perspectiveList.html",
		replace: true,
		link: function($scope, $el, $attrs){

			// if the current template changes, update the perspective/print area list
			$scope.$watch(function(){ return templateService.currentTemplate; }, function(newValue, oldValue){
				if(newValue === oldValue){ return; }
				$scope.setAllPrintAreas();
			}, true);
			
		},
		controller: function($scope){

			// $scope.printAreas = templateService.getPrintAreas;
			$scope.printAreas = [];
			$scope.printAreaImages = [];
			$scope.printAreaScales = [];

			$scope.templateService = templateService;
			
			// stores the print areas for all perspectives (multi perspective view)
			// the list of print areas is reused
			$scope.setAllPrintAreas = function(){
				$scope.printAreas = [];
				$scope.printAreaImages = [];
				$scope.printAreaScales = [];

				// it's easier to create a print area list with a flat array
				// of print areas. While we're looping, we'll also store the
				// perspective image for each print area to make life easy.
				angular.forEach(templateService.currentTemplate.perspectives, function(perspective){
					// calculate the resolution scale for each icon
					// this is to make sure our print area rect is
					// correctly sized and positioned in the icon.
					var resScale = perspective.resolution * (perspective.scale / 100);
					// hardcoding '2000' here but should be the canvasWidth
					var iconScale = ($scope.iconWidth / 2000) * resScale;

					if(perspective.printAreas && perspective.printAreas.length){
						// for each print area, add data to the appropriate arrays
						angular.forEach(perspective.printAreas, function(pArea){
							$scope.printAreas.push(pArea);
							$scope.printAreaImages.push(perspective.background);
							$scope.printAreaScales.push(iconScale);
						});
					}
					// if this perspective does not have any print areas, we'll need
					// to stil provide something so that an icon (blank icon) is displayed.
					// by pushing a blank in the array, we give our new perspective a spot.
					else {
						$scope.printAreas.push({x:0,y:0,width:0,height:0});
						$scope.printAreaImages.push('');
						$scope.printAreaScales.push(iconScale);
					}
				});
			};

			$scope.setCurrentPrintArea = templateService.setCurrentPrintArea;
		}
	};
}]);