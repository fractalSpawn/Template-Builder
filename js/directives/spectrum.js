daDirectives.directive('spectrum', function(){
	return {
		restrict: "A",
		scope: {
			"color": "=spectrum"
		},
		link: function($scope, $el, $attrs){
			// spectrum is likely used in combination with an input element
			// but it doesn't have to be.
			var $input = $el.prev('input');

			// watch the model for updates and update input and swatch accordingly.
			$scope.$watch('color', function(value){
				$el.css('background', value);
				// only update input, if input is available.
				if($input.length) $input.val(value);
			});

			// apply the spectrum plugin to our element so when we
			// change colors, the scope is updated and everything changes.
			$el.spectrum({
				color: $scope.color,
				showButtons: false,
				// using move() changes scope in real-time
				move: function(c){
					$scope.color = c.toHexString();
					$scope.$apply();
				}
			});
		}
	};
});