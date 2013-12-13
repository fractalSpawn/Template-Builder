ppdDirectives.directive('tags', ['templateService', function(templateService){
	return {
		restrict: "E",
		templateUrl: "partials/tags.html",
		replace: true,
		link: function($scope, $el, $attrs){
			// no DOM manipulation here.
		},
		controller: function($scope){
			$scope.tagString = null;
			$scope.templateService = templateService;

			/**
			 * @function		addTag
			 * @description		Adds tags from a comma separated string.
			 * @author			Jacob
			 * @params			none
			 * @returns			nothing
			 */
			$scope.addTag = function(){
				// if no template, do noop
				if(!templateService.currentTemplate){ return false;	}
				// if no tags array, add one
				if(!templateService.currentTemplate.tags){
					templateService.currentTemplate.tags = [];
				}
				// if we have a tag string to process, do it
				if($scope.tagString){
					// remove any extra spaces from comma separation
					$scope.tagString = $scope.tagString.replace(/\s?,\s?/g, ',');
					// add each tag from the string to the list
					angular.forEach($scope.tagString.split(','), function(tag){
						templateService.currentTemplate.tags.push(tag);
					});
					// clear the input field
					$scope.tagString = null;
				}
			};

			/**
			 * @function		removeTag
			 * @description		Removes a specific tag from the tag list.
			 * @author			Jacob
			 * @params			index {integer} The array index of the tag to be removed.
			 * @returns			nothing
			 */
			$scope.removeTag = function(index){
				if(!templateService.currentTemplate){ return false; }
				templateService.currentTemplate.tags.splice(index, 1);
			};
		}
	};
}]);