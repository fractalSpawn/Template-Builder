ppdDirectives.directive('colorList', ['templateService', function(templateService){
	return {
		restrict: "E",
		scope: {
			"model": "=model"
		},
		templateUrl: "partials/colorList.html",
		replace: true,
		link: function($scope, $el, $attrs){

		},
		controller: function($scope, $filter){
			$scope.templateService = templateService;
		}
	};
}]);