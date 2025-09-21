import angular from 'angular';

angular.module('taskforge').component('cardModal', {
  bindings: {
    card: '<',     // { id, listId, title, description, assigneeId }
    lists: '<',    // array of { id, title }
    onClose: '&',  // onClose({ result })
    onCancel: '&'  // onCancel()
  },
  controller: function () {
    'ngInject';
    this.$onInit = () => {
      // Local editable copy
      this.model = {
        id: this.card.id,
        listId: this.card.listId,
        title: this.card.title || '',
        description: this.card.description || '',
        assigneeId: this.card.assigneeId || null
      };
    };

    this.save = () => {
      if (!this.form || !this.form.$valid) {
        this.form && this.form.$setSubmitted();
        return;
      }
      this.onClose({ result: { action: 'save', model: this.model } });
    };

    this.remove = () => {
      this.onClose({ result: { action: 'delete' } });
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
              <md-option ng-repeat="l in $ctrl.lists track by l.id" ng-value="l.id">{{l.title}}</md-option>
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