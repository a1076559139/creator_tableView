'use strict';

Vue.component('tableview-inspector', {
  template: `
    <ui-prop v-prop="target.ScrollModel"></ui-prop>
    <ui-prop v-prop="target.inertia"></ui-prop>
    <ui-prop v-prop="target.brake"></ui-prop>
    <ui-prop v-prop="target.elastic"></ui-prop>
    <ui-prop v-prop="target.bounceDuration"></ui-prop>
    <ui-prop v-prop="target.cancelInnerEvents"></ui-prop>


    <ui-prop v-prop="target.cell"></ui-prop>
    <ui-prop v-prop="target.touchLayer"></ui-prop>
    <ui-prop v-prop="target.Type"></ui-prop>
    <ui-prop class='green'  v-prop="target.Direction" v-show="target.Type.value"></ui-prop>
    <ui-prop v-prop="target.isFill"></ui-prop>
    <ui-prop v-prop="target.ViewType"></ui-prop>

    <cc-array-prop :target.sync="target.pageChangeEvents" class='blue' v-show="target.viewType.value"></cc-array-prop>
  `,

  compiled() {

  },
  props: {
    target: {
      twoWay: true,
      type: Object,
    },
  },
});