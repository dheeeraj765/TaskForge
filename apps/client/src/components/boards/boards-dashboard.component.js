import angular from 'angular';

angular.module('taskforge').component('boardsDashboard', {
  controller: function BoardsDashboardController(BoardService, $state, $mdToast) {
    'ngInject';
    this.boards = [];
    this.loading = true;
    this.creating = false;
    this.newTitle = '';

    const notify = (msg) =>
      $mdToast.show($mdToast.simple().textContent(msg).position('bottom right').hideDelay(2500));

    const load = async () => {
      this.loading = true;
      try {
        this.boards = await BoardService.getMyBoards();
      } catch (err) {
        notify('Failed to load boards');
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        this.loading = false;
      }
    };

    this.$onInit = load;

    this.openBoard = (b) => {
      $state.go('board', { boardId: b.id });
    };

    this.createBoard = async () => {
      if (!this.newTitle || this.creating) return;
      this.creating = true;
      try {
        const board = await BoardService.createBoard(this.newTitle.trim());
        this.newTitle = '';
        this.boards.unshift(board);
        notify('Board created');
      } catch (err) {
        notify('Failed to create board');
      } finally {
        this.creating = false;
      }
    };

    this.deleteBoard = async (b, $event) => {
      if ($event) $event.stopPropagation();
      if (!confirm(`Delete board "${b.title}"? This cannot be undone.`)) return;
      try {
        await BoardService.deleteBoard(b.id);
        this.boards = this.boards.filter((x) => x.id !== b.id);
        notify('Board deleted');
      } catch (err) {
        notify('Failed to delete board');
      }
    };
  },
  template: `
    <div class="container">
      <div layout="row" layout-align="start center" class="mb-16">
        <h2 class="md-title" style="margin:0;">Your boards</h2>
      </div>

      <form ng-submit="$ctrl.createBoard()" layout="row" layout-align="start center" class="mb-16" novalidate>
        <md-input-container class="md-block" style="max-width:420px;">
          <label>New board title</label>
          <input ng-model="$ctrl.newTitle" required minlength="1" aria-label="New board title"/>
        </md-input-container>
        <md-button type="submit" class="md-raised md-primary" ng-disabled="$ctrl.creating || !$ctrl.newTitle">
          {{$ctrl.creating ? 'Creating…' : 'Create board'}}
        </md-button>
      </form>

      <div ng-if="$ctrl.loading">Loading boards…</div>
      <div ng-if="!$ctrl.loading && !$ctrl.boards.length" style="color:#64748b;">No boards yet. Create one above.</div>

      <div class="boards-grid" ng-if="!$ctrl.loading && $ctrl.boards.length">
        <div class="board-card" ng-repeat="b in $ctrl.boards track by b.id" ng-click="$ctrl.openBoard(b)">
          <div class="list-header">{{b.title}}</div>
          <div style="font-size:12px;color:#64748b;">Updated: {{b.updatedAt | date:'medium'}}</div>
          <div style="margin-top:12px;">
            <md-button class="md-warn" ng-click="$ctrl.deleteBoard(b, $event)">Delete</md-button>
          </div>
        </div>
      </div>
    </div>
  `
});