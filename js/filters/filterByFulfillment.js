ppdFilters.filter('filterByFulfillment', function(){
	return function(array, partner){
		var ffArray = [];
		if(array && array.length){
			for(var i=0; i<array.length; i++){
				var found = false;
				for(var j=0; j<array[i].mapping.length; j++){
					if(array[i].mapping[j].partner === partner){ found = true; }
				}
				if(found){ ffArray.push(array[i]); }
			}
		}
		return ffArray;
	};
});