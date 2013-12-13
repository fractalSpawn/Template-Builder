var ppdControllers = angular.module('ppdApp.controllers', []);
var ppdDirectives = angular.module('ppdApp.directives', []);
var ppdServices = angular.module('ppdApp.services', []);
var ppdFactories = angular.module('ppdApp.factories', []);
var ppdFilters = angular.module('ppdApp.filters', []);

var ppdApp = angular.module('ppdApp', [
	'ppdApp.controllers',
	'ppdApp.directives',
	'ppdApp.services',
	'ppdApp.factories',
	'ppdApp.filters',
	'angularFileUpload'
]);