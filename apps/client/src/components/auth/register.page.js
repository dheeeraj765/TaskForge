import angular from 'angular';

angular.module('taskforge').component('registerPage', {
  controller: function AuthRegisterController(AuthService, $state, $mdToast) {
    'ngInject';
    this.model = { username: '', email: '', password: '' };
    this.loading = false;
    this.error = null;

    this.submit = async () => {
      if (!this.form.$valid) {
        this.form.$setSubmitted();
        return;
      }
      this.loading = true;
      this.error = null;
      try {
        await AuthService.register(this.model.username, this.model.email, this.model.password);
        $state.go('boards');
      } catch (err) {
        const msg =
          err?.data?.error?.message ||
          err?.message ||
          'Registration failed. Please try again.';
        this.error = msg;
        $mdToast.show(
          $mdToast.simple().textContent(msg).position('bottom right').hideDelay(3000)
        );
      } finally {
        this.loading = false;
      }
    };
  },
  template: `
    <div class="auth-form">
      <h2 class="md-title" style="margin-bottom:16px;">Create your account</h2>
      <form name="$ctrl.form" novalidate ng-submit="$ctrl.submit()">
        <md-input-container class="md-block">
          <label>Username</label>
          <input
            type="text"
            name="username"
            ng-model="$ctrl.model.username"
            required
            minlength="2"
            maxlength="50"
            autocomplete="username"
            aria-label="Username"
          />
          <div ng-messages="$ctrl.form.username.$error" ng-if="$ctrl.form.$submitted || $ctrl.form.username.$touched">
            <div ng-message="required">Username is required.</div>
            <div ng-message="minlength">Minimum 2 characters.</div>
          </div>
        </md-input-container>

        <md-input-container class="md-block">
          <label>Email</label>
          <input
            type="email"
            name="email"
            ng-model="$ctrl.model.email"
            required
            autocomplete="email"
            aria-label="Email"
          />
          <div ng-messages="$ctrl.form.email.$error" ng-if="$ctrl.form.$submitted || $ctrl.form.email.$touched">
            <div ng-message="required">Email is required.</div>
            <div ng-message="email">Enter a valid email.</div>
          </div>
        </md-input-container>

        <md-input-container class="md-block">
          <label>Password</label>
          <input
            type="password"
            name="password"
            ng-model="$ctrl.model.password"
            required
            minlength="8"
            autocomplete="new-password"
            aria-label="Password"
          />
          <div ng-messages="$ctrl.form.password.$error" ng-if="$ctrl.form.$submitted || $ctrl.form.password.$touched">
            <div ng-message="required">Password is required.</div>
            <div ng-message="minlength">Minimum 8 characters.</div>
          </div>
        </md-input-container>

        <div class="mt-16" layout="row" layout-align="start center">
          <md-button
            type="submit"
            class="md-raised md-primary"
            ng-disabled="$ctrl.loading"
            aria-label="Create account"
          >
            {{$ctrl.loading ? 'Creating…' : 'Create account'}}
          </md-button>
          <span class="spacer"></span>
          <a ui-sref="login">Back to login</a>
        </div>

        <div class="mt-16" ng-if="$ctrl.error" style="color:#b91c1c;">
          {{$ctrl.error}}
        </div>
      </form>
    </div>
  `
});