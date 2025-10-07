// apps/client/src/components/boards/boards-dashboard.component.js
import angular from 'angular';

angular.module('taskforge').component('boardsDashboard', {
  controller: function BoardsDashboardController(BoardService, AuthService, $state, $mdToast) {
    'ngInject';

    this.boards = [];
    this.loading = true;
    this.creating = false;
    this.newTitle = '';

    const notify = (msg) =>
      $mdToast.show(
        $mdToast.simple().textContent(msg).position('bottom right').hideDelay(2500)
      );

    const safeLogout = () => {
      try {
        if (typeof AuthService.logout === 'function') return AuthService.logout();
        if (typeof AuthService.clearToken === 'function') return AuthService.clearToken();
      } catch (_) {}
    };

    const load = async () => {
      this.loading = true;
      try {
        const boards = await BoardService.getMyBoards();
        this.boards = Array.isArray(boards) ? boards : [];
        console.log('📋 Loaded boards:', this.boards.length);
      } catch (err) {
        console.error('Failed to load boards:', err);
        notify('Failed to load boards');
        if (err && err.status === 401) {
          safeLogout();
          $state.go('login');
        }
      } finally {
        this.loading = false;
      }
    };

    this.$onInit = async () => {
      if (!AuthService.isAuthenticated || !AuthService.isAuthenticated()) {
        console.log('🚫 Not authenticated—redirecting to login');
        $state.go('login');
        return;
      }
      load();
    };

    this.openBoard = (b) => {
      if (!b || !b.id) {
        console.warn('Invalid board for open:', b);
        notify('Invalid board');
        return;
      }
      $state.go('board', { boardId: b.id });
    };

    this.createBoard = async () => {
      const title = (this.newTitle || '').trim();
      if (!title || this.creating) return;

      this.creating = true;
      try {
        const board = await BoardService.createBoard(title);
        this.newTitle = '';
        if (board && board.id) this.boards.unshift(board);
        notify('Board created');
      } catch (err) {
        console.error('Create board failed:', err);
        notify(err?.data?.message || 'Failed to create board');
        if (err && err.status === 401) {
          safeLogout();
          $state.go('login');
        }
      } finally {
        this.creating = false;
      }
    };

    this.deleteBoard = async (b, $event) => {
      if ($event) $event.stopPropagation();
      if (!b || !b.id || !b.title) {
        console.warn('Invalid board for delete:', b);
        notify('Invalid board');
        return;
      }
      if (!confirm(`Delete board "${b.title}"? This cannot be undone.`)) return;

      try {
        await BoardService.deleteBoard(b.id);
        this.boards = this.boards.filter((x) => x.id !== b.id);
        notify('Board deleted');
      } catch (err) {
        console.error('Delete board failed:', err);
        notify('Failed to delete board');
        if (err && err.status === 401) {
          safeLogout();
          $state.go('login');
        }
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
      <div ng-if="!$ctrl.loading && !$ctrl.boards.length" style="color:#64748b;">
        No boards yet. Create one above.
      </div>

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