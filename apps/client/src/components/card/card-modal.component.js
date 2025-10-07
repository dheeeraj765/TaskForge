import angular from 'angular';

angular.module('taskforge').component('cardModal', {
  bindings: {
    card: '<',     // { id, listId, title, description, assigneeId }
    lists: '<',    // array of { id, title }
    onClose: '&',  // onClose({ result })
    onCancel: '&'  // onCancel()
  },
  controller: function (AuthService, $state) {
    'ngInject';
    this.$onInit = () => {
      // ✅ Added: Null guard—if invalid data, bail with toast/redirect
      if (!this.card || !this.lists || !this.lists.length) {
        console.warn('Invalid modal data:', { card: this.card, listsCount: this.lists?.length });
        // Optional: Close modal or notify
        this.onCancel();
        if (!AuthService.isAuthenticated()) {
          $state.go('login');  // Redirect if unauthed (upstream 401)
        }
        return;
      }

      // Local editable copy
      this.model = {
        id: this.card.id || this.card._id,  // ✅ Fallback to _id
        listId: this.card.listId || this.card._id,  // Ensure listId present
        title: this.card.title || '',
        description: this.card.description || '',
        assigneeId: this.card.assigneeId || null
      };

      console.log('📝 Modal init with card:', this.model.id);  // Debug: Confirm population
    };

    this.save = () => {
      if (!this.form || !this.form.$valid) {
        this.form && this.form.$setSubmitted();
        return;
      }
      // ✅ Added: Validate required fields post-guard
      if (!this.model.title.trim()) {
        console.warn('Save blocked: Empty title');
        return;
      }
      this.onClose({ result: { action: 'save', model: this.model } });
    };

    this.remove = () => {
      // ✅ Added: Confirm before delete (UX polish)
      if (confirm('Delete this card? This cannot be undone.')) {
        this.onClose({ result: { action: 'delete' } });
      }
    };

    // ✅ Added: Reset form on changes (optional, for UX)
    this.$onChanges = (changes) => {
      if (changes.card && this.card) {
        this.model = {
          id: this.card.id || this.card._id,
          listId: this.card.listId,
          title: this.card.title || '',
          description: this.card.description || '',
          assigneeId: this.card.assigneeId || null
        };
        if (this.form) {
          this.form.$setPristine();
          this.form.$setUntouched();
        }
      }
    };
  },
  template: `
    <form name="$ctrl.form" novalidate>
      <md-toolbar>
        <div class="md-toolbar-tools">
          <h2 class="md-title" style="margin:0;">Edit card</h2>
          <span class="spacer"></span>
          <md-button class="md-warn" ng-click="$ctrl.remove()">Delete</md-button>
        </div>
      </md-toolbar>

      <md-dialog-content style="max-width:700px;">
        <div class="container">
          <md-input-container class="md-block">
            <label>Title</label>
            <input name="title" ng-model="$ctrl.model.title" required aria-label="Card title"/>
            <div ng-messages="$ctrl.form.title.$error" ng-if="$ctrl.form.$submitted || $ctrl.form.title.$touched">
              <div ng-message="required">Title is required.</div>
            </div>
          </md-input-container>

          <md-input-container class="md-block">
            <label>Description</label>
            <textarea
              name="description"
              ng-model="$ctrl.model.description"
              rows="5"
              aria-label="Card description"></textarea>
          </md-input-container>

          <md-input-container class="md-block">
            <label>Assignee ID (optional)</label>
            <input
              name="assigneeId"
              ng-model="$ctrl.model.assigneeId"
              aria-label="Assignee ID (optional)"/>
          </md-input-container>

          <md-input-container class="md-block">
            <label>List</label>
            <md-select ng-model="$ctrl.model.listId" aria-label="List select">
              <md-option ng-repeat="l in $ctrl.lists track by l._id || l.id" ng-value="l.id || l._id">  <!-- ✅ Fallback to _id -->
                {{l.title}}
              </md-option>
            </md-select>
          </md-input-container>
        </div>
      </md-dialog-content>

      <md-dialog-actions layout="row">
        <span class="spacer"></span>
        <md-button ng-click="$ctrl.onCancel()">Cancel</md-button>
        <md-button class="md-primary" ng-click="$ctrl.save()">Save</md-button>
      </md-dialog-actions>
    </form>
  `
});