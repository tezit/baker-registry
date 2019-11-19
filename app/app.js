'use strict';

(function() {

    var app = angular.module('bakersapp', ['ui.router', 'ngAnimate', 'ngclipboard', 'ui.bootstrap']);

    app.constant('serverConfig', {
        serverUrlBase: ''
    });

    app.run(function($rootScope, $window, $location, serverConfig) {
        $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
            $rootScope.toState = toState;
            $rootScope.toParams = toParams;
            $rootScope.loading = true;            
        });

        $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
            $rootScope.loading = false;
            $window.scrollTo(0, 0);
        });

        $rootScope.$on('$stateChangeError', function(event, error, toState, toParams, fromState, fromParams) {
            $rootScope.loading = false;
            console.log('Resolve Error: ', error);
        });
    });

    app.config(function($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/home');
        
        $stateProvider
            .state('home', {
                url: '/home',
                controller: 'HomeController',
                templateUrl: 'app/views/home.html'
            })
    });

    
}());