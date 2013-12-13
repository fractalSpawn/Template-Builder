ppdControllers.controller('ppdCtrl', ['$scope', '$upload', 'templateService', function($scope, $upload, templateService){

	// the template service is used to do template things (get/set/edit)
	// including the perspectives and print areas.
	$scope.templateService = templateService;

	// the dabble perspective requires some configuration values
	// that we can't/don't put in the directive attributes.
	$scope.ppdModel = {
		mode: 'create', // [create|edit|view]
		context: 'master', // [master|instance|design]
		canvasWidth: 2000, // the true width of the svg canvas
		canvasHeight: 2375, // the true height of the svg canvas
		borders: {
			"labeled": true,
			"enabled": true,
			"color": "#FF0000",
			"safeAreaColor": "#555555"
		},
		rulers: {
			"enabled": false,
			"color": "#FFFFFF"
		},
		grid: {
			"enabled": false,
			"color": "#FFFFFF"
		}
	};

	// when the fulfillment partner changes, make sure to update the attributes
	// to reflect which ones are fulfillable by the newly selected ff partner.
	$scope.$watch('templateService.currentTemplate.partner', function(newValue, oldValue){
		if(newValue === oldValue || newValue === undefined){ return; }
		$scope.templateService.updateAttributes();
	});

	/////////////////////////////////////////////////////////////////////////////
	//  .-. .-..-. .----..---.  .----. .----..-.  .-.
	//  | {_} || |{ {__ {_   _}/  {}  \| {}  }\ \/ / 
	//  | { } || |.-._} } | |  \      /| .-. \ }  {  
	//  `-' `-'`-'`----'  `-'   `----' `-' `-' `--'  
	/////////////////////////////////////////////////////////////////////////////
	// the history array will hold a template model for each step
	// that a user took when editing a template. Undo/redo will 
	// basically be replacing the current template with the object
	// at a specific index. 
	$scope.workHistory = [];
	// The marker is used as a reference point
	// when we start to undo or redo. It stays at the same history
	// index as we move further back (undo) and towards (redo) that
	// point in our history.
	$scope.workHistoryMarker = -1;
	// The marker offset is used to keep the 
	// marker in the same place relative to the length of history.
	$scope.workHistoryMarkerOffset = 0;
	// the prev marker offset is used to tell if the marker offset is moving.
	// if it's not, then that means we're moving forward, not undo/redoing.
	$scope.workHistoryPrevMarkerOffset = 0;
	// The history offset is decreased/increased as we undo/redo.
	// As we undo/redo, the history item we want is basically (marker + history offset)
	$scope.workHistoryOffset = 0;

	// any time the current template changes (in any way), store a copy as a history item.
	$scope.$watch('templateService.currentTemplate', function(newValue, oldValue){
		if(newValue === oldValue){ return; }
		// make sure to push a copy so that they're not all just referencing our current state.
		$scope.workHistory.push(angular.copy(newValue));

		// if the marker offset has gone stagnant, then that means we are not undo/redoing
		// anymore and we need to reset things to put the marker back at the end of the list.
		if($scope.workHistoryPrevMarkerOffset === $scope.workHistoryMarkerOffset){
			// once we start editing again from this point, everything in the stack 
			// above this index can be removed. just like the history in PhotoShop.
			if($scope.workHistoryMarkerOffset !== 0){
				$scope.workHistory = $scope.workHistory.slice(0, ($scope.workHistoryMarker+$scope.workHistoryOffset)+1);
			}
			// reset the counts to put everything back at the last history item.
			$scope.workHistoryMarker = $scope.workHistory.length-1;
			$scope.workHistoryMarkerOffset = 0;
			$scope.workHistoryOffset = 0;
		}

		// subtract the 1 so that the offset can be 0 when it is matched with the marker.
		$scope.workHistoryMarker = ($scope.workHistory.length-1) - $scope.workHistoryMarkerOffset;
		$scope.workHistoryPrevMarkerOffset = $scope.workHistoryMarkerOffset;
	}, true);

	/**
	 * @function		undo
	 * @description		Sets the current template to be a previous version from the history list.
	 * @author			Jacob
	 * @params			none
	 * @returns			nothing
	 */
	$scope.undo = function(){
		// only undo to the last history point
		if($scope.workHistoryMarker + $scope.workHistoryOffset > 0){
			$scope.workHistoryPrevMarkerOffset = $scope.workHistoryMarkerOffset;
			// always increase the marker offset so as we stack more history items on
			// it always stays at the index when we started undo/redo actions
			$scope.workHistoryMarkerOffset++;
			// decrease the index so that as we undo we move back from the marker
			$scope.workHistoryOffset--;
			$scope.templateService.setCurrentTemplate($scope.workHistory[$scope.workHistoryMarker + $scope.workHistoryOffset]);
		}
	};

	/**
	 * @function		redo
	 * @description		Sets the current template to be a more recent previous version from the history list.
	 * @author			Jacob
	 * @params			none
	 * @returns			nothing
	 */
	$scope.redo = function(){
		// only redo up to the marker
		if($scope.workHistoryOffset < 0){
			$scope.workHistoryPrevMarkerOffset = $scope.workHistoryMarkerOffset;
			// always increase the marker offset so as we stack more history items on
			// it always stays at the index when we started undo/redo actions
			$scope.workHistoryMarkerOffset++;
			// increase the index so that as we redo, we move closer to the marker
			$scope.workHistoryOffset++;
			$scope.templateService.setCurrentTemplate($scope.workHistory[$scope.workHistoryMarker + $scope.workHistoryOffset]);
		}
	};

	/**
	 * @function		onPerspectiveFileSelect
	 * @description		Handles uploads for perspective images (bg and asset) using angular-file-upload
	 * @author			Jacob
	 * @params			files {array} The list of files from our upload field(s)
	 * @returns			nothing
	 */
	$scope.onPerspectiveFileSelect = function(type, files){
		// what to do during upload.
		// requires angular-file-upload-shim to work
		var onUploadProgress = function(evt){
			var percent = ((evt.loaded / evt.total) * 100);
			if(!$scope.templateService.xhrProgress[$scope.templateService.currentPerspective.id]){
				$scope.templateService.xhrProgress[$scope.templateService.currentPerspective.id] = {};
			}
			if(!$scope.templateService.xhrProgress[$scope.templateService.currentPerspective.id][type]){
				$scope.templateService.xhrProgress[$scope.templateService.currentPerspective.id][type] = 0;
			}
			$scope.templateService.xhrProgress[$scope.templateService.currentPerspective.id][type] = percent;
			// when we're done with the loading, clear the value to clear the progress meter
			if(percent === 100){ delete $scope.templateService.xhrProgress[$scope.templateService.currentPerspective.id][type]; }
		};
		// what to do on success
		var onUploadSuccess = function(data, status, headers, config){
			// we're using a switch here so we don't have to mess with the
			// model to match whatever type (accent or bg) we want to set.
			switch(type){
				// add the name of our image as the background image in our perspective
				case 'background': $scope.templateService.currentPerspective.background = data.data; break;
				// add the name of our image as the accent image in our perspective
				case 'accent': $scope.templateService.currentPerspective.accentImage = data.data; break;
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
				url: "http://dabbleapp.com/image/upload?qqfile=" + file.name,
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
	};

}]);