import angular from 'angular';

angular.module('taskforge').component('appRoot', {
  controller: function ($state) {
    'ngInject';
    this.goBoards = () => $state.go('boards');
    this.goLogin = () => $state.go('login');
  },
  template: `
    <div class="app-shell">
      <md-toolbar>
        <div class="md-toolbar-tools">
          <span class="md-headline">TaskForge</span>
          <span class="spacer"></span>
          <md-button class="md-raised md-primary" ng-click="$ctrl.goBoards()">Boards</md-button>
          <md-button ng-click="$ctrl.goLogin()">Login</md-button>
        </div>
      </md-toolbar>

      <div class="app-content">
        <div ui-view class="container"></div>
      </div>
    </div>
  `,
});