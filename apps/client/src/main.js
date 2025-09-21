// Ensure Angular is global before side‑effect modules
import angular from 'angular';
window.angular = angular;

// Side‑effect libs (must load before we create our module)
require('@uirouter/angularjs');   // 'ui.router'
require('angular-animate');       // 'ngAnimate'
require('angular-aria');          // 'ngAria'
require('angular-messages');      // 'ngMessages'
require('angular-material');      // 'ngMaterial'
require('angular-drag-and-drop-lists'); // 'dndLists'

// Styles
import 'angular-material/angular-material.css';
import './styles/main.scss';

// 1) Create the AngularJS module FIRST
const mod = angular.module('taskforge', [
  'ui.router',
  'ngMaterial',
  'ngAnimate',
  'ngAria',
  'ngMessages',
  'dndLists' // Drag & drop
]);

// Env constant (used by services)
mod.constant('ENV', {
  API_URL: process.env.API_URL || 'http://localhost:4000'
});

// 2) Now load services/interceptors/components AFTER module exists
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


// 3) Config and routes
mod.config(($stateProvider, $urlRouterProvider, $locationProvider, $mdThemingProvider) => {
  'ngInject';
  $mdThemingProvider.theme('default').primaryPalette('indigo').accentPalette('amber');
  $locationProvider.html5Mode(true);

  $stateProvider
    .state('login',    { url: '/login',           component: 'loginPage' })
    .state('register', { url: '/register',        component: 'registerPage' })
    .state('boards',   { url: '/boards',          component: 'boardsDashboard' })
    .state('board',    { url: '/boards/:boardId', component: 'boardView' });

  $urlRouterProvider.otherwise('/login');
});

// Register interceptor
mod.config(($httpProvider) => {
  'ngInject';
  $httpProvider.interceptors.push('authInterceptor');
});

// Route guards
mod.run(($transitions, AuthService) => {
  'ngInject';
  const isProtected = (s) => ['boards', 'board'].includes(s.name);
  const isAuthPage = (s) => ['login', 'register'].includes(s.name);

  $transitions.onStart({ to: (s) => isProtected(s) }, (trans) => {
    if (AuthService.isAuthenticated()) return true;
    return AuthService.tryRefresh()
      .then(() => true)
      .catch(() => trans.router.stateService.target('login'));
  });

  $transitions.onStart({ to: (s) => isAuthPage(s) }, (trans) => {
    if (AuthService.isAuthenticated()) {
      return trans.router.stateService.target('boards');
    }
    return AuthService.tryRefresh()
      .then(() => trans.router.stateService.target('boards'))
      .catch(() => true);
  });
});

// Helpful boot log
mod.run(() => {
  // eslint-disable-next-line no-console
  console.log('TaskForge booted with AngularJS', angular.version && angular.version.full);
});

export default mod.name;