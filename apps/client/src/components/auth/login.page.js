import angular from 'angular';

angular.module('taskforge').component('loginPage', {
  controller: function AuthLoginController(AuthService, $state, $mdToast) {
    'ngInject';
    this.model = { email: '', password: '' };
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
        await AuthService.login(this.model.email, this.model.password);
        $state.go('boards');
      } catch (err) {
        const msg =
          err?.data?.error?.message ||
          err?.message ||
          'Login failed. Please check your credentials.';
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
      <h2 class="md-title" style="margin-bottom:16px;">Welcome back</h2>
      <form name="$ctrl.form" novalidate ng-submit="$ctrl.submit()">
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
            autocomplete="current-password"
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
            aria-label="Sign in"
          >
            {{$ctrl.loading ? 'Signing in…' : 'Sign in'}}
          </md-button>
          <span class="spacer"></span>
          <a ui-sref="register">Create account</a>
        </div>

        <div class="mt-16" ng-if="$ctrl.error" style="color:#b91c1c;">
          {{$ctrl.error}}
        </div>
      </form>
    </div>
  `
});