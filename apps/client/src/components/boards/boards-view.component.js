import angular from 'angular';

angular.module('taskforge').component('boardView', {
controller: function BoardViewController($scope, BoardService, AuthService, $stateParams, $mdToast, $mdDialog, $state) {
'ngInject';
const boardId = $stateParams.boardId;
this.board = null;
this.loading = true;

this.lists = [];
this.cardsByList = Object.create(null);
this.listById = Object.create(null);
this.newListTitle = '';
this.searchQuery = '';
this.results = null;

const notify = (msg) =>
  $mdToast.show($mdToast.simple().textContent(msg).position('bottom right').hideDelay(2500));

const sortByPos = (a, b) => (a.position || 0) - (b.position || 0);

const safeLogout = () => {
  try {
    if (typeof AuthService.logout === 'function') return AuthService.logout();
    if (typeof AuthService.clearToken === 'function') return AuthService.clearToken();
  } catch (_) {}
};

this.listTitle = (id) => {
  const l = this.listById && this.listById[id];
  return (l && l.title) || 'Unknown';
};

const rebuildListIndex = () => {
  this.listById = Object.create(null);
  (this.lists || []).forEach((l) => { this.listById[l.id] = l; });
};

this.$onInit = async () => {
  if (!AuthService.isAuthenticated || !AuthService.isAuthenticated()) {
    $state.go('login');
    return;
  }

  try {
    const [board, lists, cards] = await Promise.all([
      BoardService.getBoard(boardId),
      BoardService.getLists(boardId),
      BoardService.getCards(boardId)
    ]);

    $scope.$applyAsync(() => {
      this.board = board;

      this.lists = (lists || [])
        .map((l) => ({ ...l, id: l.id || l._id, newCardTitle: '' }))
        .sort(sortByPos);

      rebuildListIndex();

      this.cardsByList = Object.create(null);
      for (const c of (cards || [])) {
        const card = { ...c, id: c.id || c._id };
        const lid = card.listId;
        if (!this.cardsByList[lid]) this.cardsByList[lid] = [];
        this.cardsByList[lid].push(card);
      }
      Object.keys(this.cardsByList).forEach((lid) => this.cardsByList[lid].sort(sortByPos));

      this.loading = false;
    });
  } catch (err) {
    console.error('Failed to load board:', err);
    notify('Failed to load board');
    if (err && err.status === 401) {
      safeLogout();
      $state.go('login');
    }
    $scope.$applyAsync(() => { this.loading = false; });
  }
};

this.createList = async () => {
  const title = (this.newListTitle || '').trim();
  if (!title) return;
  try {
    const list = await BoardService.createList(boardId, title);
    $scope.$applyAsync(() => {
      const normalized = { ...list, id: list.id || list._id, newCardTitle: '' };
      this.lists.push(normalized);
      this.lists.sort(sortByPos);
      rebuildListIndex();
      this.newListTitle = '';
    });
    notify('List created');
  } catch (err) {
    console.error('Create list failed:', err);
    notify('Failed to create list');
    if (err && err.status === 401) {
      safeLogout();
      $state.go('login');
    }
  }
};

this.addCard = async (list) => {
  const title = (list.newCardTitle || '').trim();
  if (!title) return;
  try {
    const card = await BoardService.createCard(list.id, { title });
    $scope.$applyAsync(() => {
      const normalized = { ...card, id: card.id || card._id, listId: list.id };
      list.newCardTitle = '';
      if (!this.cardsByList[list.id]) this.cardsByList[list.id] = [];
      this.cardsByList[list.id].push(normalized);
      this.cardsByList[list.id].sort(sortByPos);
    });
    notify('Card added');
  } catch (err) {
    console.error('Add card failed:', err);
    notify('Failed to add card');
    if (err && err.status === 401) {
      safeLogout();
      $state.go('login');
    }
  }
};

this.removeAt = (listId, index) => {
  const arr = this.cardsByList[listId] || [];
  arr.splice(index, 1);
};

this.onCardDrop = async (event, index, item, external, type, toListId) => {
  try {
    if (!this.cardsByList[toListId]) this.cardsByList[toListId] = [];
    const arr = this.cardsByList[toListId];
    const prev = arr[index - 1];
    const next = arr[index + 1];

    const payload = {};
    if (toListId !== item.listId) payload.toListId = toListId;
    if (prev) payload.prevCardId = prev.id || prev._id;
    if (next) payload.nextCardId = next.id || next._id;

    const moved = await BoardService.moveCard(item.id || item._id, payload);
    $scope.$applyAsync(() => {
      item.listId = toListId;
      if (moved && moved.position != null) item.position = moved.position;
    });
    notify('Card moved');
  } catch (err) {
    console.error('Card drop failed:', err);
    notify('Failed to move card — reloading');

    if (err && err.status === 401) {
      safeLogout();
      $state.go('login');
      return item;
    }

    const cards = await BoardService.getCards(boardId);
    $scope.$applyAsync(() => {
      this.cardsByList = Object.create(null);
      for (const c of (cards || [])) {
        const card = { ...c, id: c.id || c._id };
        const lid = card.listId;
        if (!this.cardsByList[lid]) this.cardsByList[lid] = [];
        this.cardsByList[lid].push(card);
      }
      Object.keys(this.cardsByList).forEach((lid) => this.cardsByList[lid].sort(sortByPos));
    });
  }
  return item;
};

this.openCard = (card) => {
  const originalListId = card.listId;
  $mdDialog
    .show({
      controllerAs: '$dlg',
      bindToController: true,
      clickOutsideToClose: true,
      locals: { card, lists: this.lists },
      controller: function ($mdDialog, card, lists) {
        'ngInject';
        this.card = angular.copy(card);
        this.lists = lists;
        this.onClose = (result) => $mdDialog.hide(result);
        this.onCancel = () => $mdDialog.cancel();
      },
      template: `
        <md-dialog aria-label="Edit card" style="max-width:640px;width:100%;">
          <card-modal
            card="$dlg.card"
            lists="$dlg.lists"
            on-close="$dlg.onClose(result)"
            on-cancel="$dlg.onCancel()"></card-modal>
        </md-dialog>
      `
    })
    .then(async (result) => {
      if (!result || !result.action) return;

      if (result.action === 'delete') {
        try {
          await BoardService.deleteCard(card.id || card._id);
          $scope.$applyAsync(() => {
            this.cardsByList[originalListId] =
              (this.cardsByList[originalListId] || [])
                .filter((c) => (c.id || c._id) !== (card.id || card._id));
          });
          notify('Card deleted');
        } catch (err) {
          console.error('Delete card failed:', err);
          notify('Failed to delete card');
          if (err && err.status === 401) {
            safeLogout();
            $state.go('login');
          }
        }
        return;
      }

      if (result.action === 'save') {
        const m = result.model;

        if (
          m.title !== card.title ||
          m.description !== card.description ||
          (m.assigneeId || null) !== (card.assigneeId || null)
        ) {
          try {
            const saved = await BoardService.updateCard(card.id || card._id, {
              title: m.title,
              description: m.description,
              assigneeId: m.assigneeId || null
            });
            $scope.$applyAsync(() => { Object.assign(card, saved); });
          } catch (err) {
            console.error('Update card failed:', err);
            notify('Failed to update card');
            if (err && err.status === 401) {
              safeLogout();
              $state.go('login');
            }
          }
        }

        if (m.listId !== originalListId) {
          try {
            const moved = await BoardService.moveCard(card.id || card._id, { toListId: m.listId });
            $scope.$applyAsync(() => {
              this.cardsByList[originalListId] =
                (this.cardsByList[originalListId] || [])
                  .filter((c) => (c.id || c._id) !== (card.id || card._id));
              if (!this.cardsByList[m.listId]) this.cardsByList[m.listId] = [];
              this.cardsByList[m.listId].push({ ...card, listId: m.listId, position: moved && moved.position });
              this.cardsByList[m.listId].sort(sortByPos);
            });
          } catch (err) {
            console.error('Move card failed:', err);
            notify('Failed to move card');
            if (err && err.status === 401) {
              safeLogout();
              $state.go('login');
            }
          }
        }

        notify('Card updated');
      }
    })
    .catch(() => {});
};

this.search = async () => {
  const q = (this.searchQuery || '').trim();
  if (!q) { this.results = null; return; }
  try {
    const results = await BoardService.search(boardId, q);
    $scope.$applyAsync(() => { this.results = results; });
  } catch (err) {
    console.error('Search failed:', err);
    notify('Search failed');
    if (err && err.status === 401) {
      safeLogout();
      $state.go('login');
    }
  }
};
},
template: `
<div class="board container" ng-if="!$ctrl.loading">
<div layout="row" layout-align="start center" class="mb-16">
<h2 class="md-title" style="margin:0;">{{$ctrl.board && ctrl.board.title || 'Board'}}</h2> <span class="spacer"></span> <div class="search-bar" layout="row" layout-align="start center"> <md-input-container class="md-block" style="min-width:280px;"> <label>Search cards</label> <input ng-model="ctrl.searchQuery" ng-change="$ctrl.search()" aria-label="Search cards" />
</md-input-container>
</div>
</div>
<form ng-submit="$ctrl.createList()" layout="row" layout-align="start center" class="mb-16" novalidate>
    <md-input-container class="md-block" style="max-width:420px;">
      <label>New list title</label>
      <input ng-model="$ctrl.newListTitle" required aria-label="New list title" />
    </md-input-container>
    <md-button type="submit" class="md-raised md-primary" ng-disabled="!$ctrl.newListTitle">Add list</md-button>
  </form>

  <div class="board-columns">
    <div class="list-column" ng-repeat="list in $ctrl.lists track by list.id">
      <div class="list-header">{{list.title}}</div>

      <form ng-submit="$ctrl.addCard(list)" novalidate layout="row" layout-align="start center" class="mb-16">
        <md-input-container class="md-block" style="flex:1;">
          <label>Add card</label>
          <input ng-model="list.newCardTitle" aria-label="Add card" />
        </md-input-container>
        <md-button type="submit" class="md-primary">Add</md-button>
      </form>

      <div
        class="dnd-container"
        dnd-list="$ctrl.cardsByList[list.id]"
        dnd-drop="$ctrl.onCardDrop(event, index, item, external, type, list.id)">

        <div
          class="card"
          ng-repeat="card in $ctrl.cardsByList[list.id] track by card.id"
          dnd-draggable="card"
          dnd-effect-allowed="move"
          dnd-moved="$ctrl.removeAt(list.id, $index)"
          ng-click="$ctrl.openCard(card)">
          <div>{{card.title}}</div>
        </div>
      </div>
    </div>
  </div>

  <div ng-if="$ctrl.results && $ctrl.results.length" class="container mt-16">
    <div style="font-size:12px;color:#64748b;margin-bottom:8px;">Search results</div>
    <div class="card" ng-repeat="r in $ctrl.results track by r.id">
      <div><strong>{{r.title}}</strong></div>
      <div style="color:#64748b;font-size:12px;">
        List: {{$ctrl.listTitle(r.listId)}}
      </div>
    </div>
  </div>
</div>

<div class="container" ng-if="$ctrl.loading">Loading board…</div>
`
});