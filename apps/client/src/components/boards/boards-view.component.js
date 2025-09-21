import angular from 'angular';

angular.module('taskforge').component('boardView', {
  controller: function BoardViewController(BoardService, $stateParams, $mdToast, $mdDialog) {
    'ngInject';
    const boardId = $stateParams.boardId;

    this.board = null;
    this.loading = true;

    this.lists = []; // [{ id, title, position, newCardTitle }]
    this.cardsByList = Object.create(null); // { [listId]: Card[] }
    this.newListTitle = '';
    this.searchQuery = '';
    this.results = null;

    const notify = (msg) =>
      $mdToast.show($mdToast.simple().textContent(msg).position('bottom right').hideDelay(2500));

    const sortByPos = (a, b) => (a.position || 0) - (b.position || 0);

    this.$onInit = async () => {
      try {
        const [board, lists, cards] = await Promise.all([
          BoardService.getBoard(boardId),
          BoardService.getLists(boardId),
          BoardService.getCards(boardId)
        ]);

        this.board = board;

        this.lists = (lists || [])
          .sort(sortByPos)
          .map((l) => ({ ...l, newCardTitle: '' }));

        this.cardsByList = Object.create(null);
        for (const c of cards || []) {
          const lid = c.listId;
          if (!this.cardsByList[lid]) this.cardsByList[lid] = [];
          this.cardsByList[lid].push(c);
        }
        Object.keys(this.cardsByList).forEach((lid) => {
          this.cardsByList[lid].sort(sortByPos);
        });
      } catch (err) {
        console.error(err);
        notify('Failed to load board');
      } finally {
        this.loading = false;
      }
    };

    this.createList = async () => {
      const title = (this.newListTitle || '').trim();
      if (!title) return;
      try {
        const list = await BoardService.createList(boardId, title);
        this.lists.push({ ...list, newCardTitle: '' });
        this.lists.sort(sortByPos);
        this.newListTitle = '';
        notify('List created');
      } catch (err) {
        notify('Failed to create list');
      }
    };

    this.addCard = async (list) => {
      const title = (list.newCardTitle || '').trim();
      if (!title) return;
      try {
        const card = await BoardService.createCard(list.id, { title });
        list.newCardTitle = '';
        if (!this.cardsByList[list.id]) this.cardsByList[list.id] = [];
        this.cardsByList[list.id].push(card);
        this.cardsByList[list.id].sort(sortByPos);
        notify('Card added');
      } catch (err) {
        notify('Failed to add card');
      }
    };

    // Remove item from a list at index (used by dnd-moved)
    this.removeAt = (listId, index) => {
      const arr = this.cardsByList[listId] || [];
      arr.splice(index, 1);
    };

    // Persist drop to backend (reorder within list or move across lists)
    this.onCardDrop = async (event, index, item, external, type, toListId) => {
      try {
        if (!this.cardsByList[toListId]) this.cardsByList[toListId] = [];
        const arr = this.cardsByList[toListId];
        const prev = arr[index - 1];
        const next = arr[index + 1];

        const payload = {};
        if (toListId !== item.listId) payload.toListId = toListId;
        if (prev) payload.prevCardId = prev.id;
        if (next) payload.nextCardId = next.id;

        const moved = await BoardService.moveCard(item.id, payload);
        item.listId = toListId;
        if (moved && moved.position != null) item.position = moved.position;
        notify('Card moved');
      } catch (err) {
        notify('Failed to move card — reloading');
        const cards = await BoardService.getCards(boardId);
        this.cardsByList = Object.create(null);
        for (const c of cards || []) {
          const lid = c.listId;
          if (!this.cardsByList[lid]) this.cardsByList[lid] = [];
          this.cardsByList[lid].push(c);
        }
        Object.keys(this.cardsByList).forEach((lid) => this.cardsByList[lid].sort(sortByPos));
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
              await BoardService.deleteCard(card.id);
              this.cardsByList[originalListId] =
                (this.cardsByList[originalListId] || []).filter((c) => c.id !== card.id);
              notify('Card deleted');
            } catch (err) {
              notify('Failed to delete card');
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
                const saved = await BoardService.updateCard(card.id, {
                  title: m.title,
                  description: m.description,
                  assigneeId: m.assigneeId || null
                });
                Object.assign(card, saved);
              } catch (err) {
                notify('Failed to update card');
              }
            }

            if (m.listId !== originalListId) {
              try {
                const moved = await BoardService.moveCard(card.id, { toListId: m.listId });
                this.cardsByList[originalListId] =
                  (this.cardsByList[originalListId] || []).filter((c) => c.id !== card.id);
                if (!this.cardsByList[m.listId]) this.cardsByList[m.listId] = [];
                this.cardsByList[m.listId].push({ ...card, listId: m.listId, position: moved.position });
                this.cardsByList[m.listId].sort(sortByPos);
              } catch (err) {
                notify('Failed to move card');
              }
            }

            notify('Card updated');
          }
        })
        .catch(() => {});
    };

    this.search = async () => {
      const q = (this.searchQuery || '').trim();
      if (!q) {
        this.results = null;
        return;
      }
      try {
        this.results = await BoardService.search(boardId, q);
      } catch (err) {
        notify('Search failed');
      }
    };
  },
  template: `
    <div class="board container" ng-if="!$ctrl.loading">
      <div layout="row" layout-align="start center" class="mb-16">
        <h2 class="md-title" style="margin:0;">{{$ctrl.board?.title || 'Board'}}</h2>
        <span class="spacer"></span>
        <div class="search-bar" layout="row" layout-align="start center">
          <md-input-container class="md-block" style="min-width:280px;">
            <label>Search cards</label>
            <input ng-model="$ctrl.searchQuery" ng-change="$ctrl.search()" aria-label="Search cards" />
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

          <!-- DnD container -->
          <div
            dnd-list="$ctrl.cardsByList[list.id]"
            dnd-drop="$ctrl.onCardDrop(event, index, item, external, type, list.id)"
            class="dnd-container">

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
          <div style="color:#64748b;font-size:12px;">List: {{$ctrl.lists.find(l => l.id === r.listId)?.title || 'Unknown'}}</div>
        </div>
      </div>
    </div>

    <div class="container" ng-if="$ctrl.loading">Loading board…</div>
  `
});