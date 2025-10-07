// apps/client/src/main.js
import angular from 'angular';
window.angular = angular;

require('@uirouter/angularjs');
require('angular-animate');
require('angular-aria');
require('angular-messages');
require('angular-material');
require('angular-drag-and-drop-lists');

import 'angular-material/angular-material.css';
import './styles/main.scss';

// 1) Create module
const mod = angular.module('taskforge', [
  'ui.router',
  'ngMaterial',
  'ngAnimate',
  'ngAria',
  'ngMessages',
  'dndLists'
]);

// 2) Import ENV and register as constant
import { ENV } from './config';
mod.constant('ENV', ENV);

// 3) Load services/interceptors/components
require('./services/token.store');
require('./services/api.service');
require('./services/auth.service');
require('./services/board.service');
require('./services/socket.service');
require('./interceptors/auth.interceptor');

require('./components/app-root/app-root.component');
require('./components/auth/login.page');
require('./components/auth/register.page');
require('./components/boards/boards-dashboard.component');
require('./components/boards/boards-view.component');
require('./components/card/card-modal.component');

// 4) HTTP defaults
mod.config(($httpProvider) => {
  'ngInject';
  $httpProvider.interceptors.push('authInterceptor');

  // IMPORTANT: do NOT force cookies; we’re using the dev proxy + Bearer tokens
  // $httpProvider.defaults.withCredentials = true; // removed

  delete $httpProvider.defaults.headers.common['X-Requested-With'];
});

// 5) Theme + routes
mod.config(($stateProvider, $urlRouterProvider, $locationProvider, $mdThemingProvider) => {
  'ngInject';

  $mdThemingProvider.theme('default')
    .primaryPalette('indigo', { 'hue-1': '50', 'hue-2': '800', 'default': '500' })
    .accentPalette('blue', { 'default': '500' })
    .backgroundPalette('grey', { 'default': '50' });

  $locationProvider.html5Mode(true);

  $stateProvider
    .state('login',    { url: '/login',           component: 'loginPage' })
    .state('register', { url: '/register',        component: 'registerPage' })
    .state('boards',   { url: '/boards',          component: 'boardsDashboard' })
    .state('board',    { url: '/boards/:boardId', component: 'boardView' });

  $urlRouterProvider.otherwise('/login');
});

// 6) Run block
mod.run(($state, $transitions, AuthService, SocketService, $rootScope) => {
  'ngInject';

  $transitions.onStart({ to: '*' }, (transition) => {
    const toState = transition.$to();
    const isProtected = toState.name === 'boards' || toState.name === 'board';

    if (isProtected && !AuthService.isAuthenticated()) {
      return transition.router.stateService.target('login');
    }

    if ((toState.name === 'login' || toState.name === 'register') && AuthService.isAuthenticated()) {
      return transition.router.stateService.target('boards');
    }
  });

  $rootScope.$on('$stateChangeSuccess', (event, toState) => {
    if ((toState.name === 'boards' || toState.name === 'board') && AuthService.isAuthenticated()) {
      // Guard the call to avoid runtime errors if SocketService isn’t wired yet
      if (SocketService && typeof SocketService.connect === 'function') {
        SocketService.connect();
      }
    }
  });

  $rootScope.$on('$httpError', (event, response) => {
    if (response.status === 401 && typeof AuthService.logout === 'function') {
      AuthService.logout();
    }
  });
});

export default mod.name;