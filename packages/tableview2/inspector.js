'use strict';

Vue.component('tableview2-inspector', {
  template: `
    <ui-prop v-prop="target.cell"></ui-prop>
    <ui-prop v-prop="target.content"></ui-prop>

    <ui-prop v-prop="target.ScrollModel"></ui-prop>
    <ui-prop v-prop="target.horizontalScrollBar" v-show="!target.ScrollModel.value"></ui-prop>
    <ui-prop v-prop="target.verticalScrollBar" v-show="target.ScrollModel.value"></ui-prop>
    <ui-prop v-prop="target.ViewType"></ui-prop>
    <ui-prop v-prop="target.Direction"></ui-prop>
    
    <ui-prop v-prop="target.inertia" v-show="target.ViewType.value != 2"></ui-prop>
    <ui-prop v-prop="target.brake" v-show="target.inertia.value"></ui-prop>
    
    <ui-prop v-prop="target.elastic"></ui-prop>
    <ui-prop v-prop="target.bounceDuration" v-show="target.elastic.value"></ui-prop>
    
    <ui-prop v-prop="target.isFill"></ui-prop>

    <!--
      <cc-array-prop :target.sync="target.scrollEvents" class='blue' v-show="target.ViewType.value != 2"></cc-array-prop>
      <cc-array-prop :target.sync="target.pageChangeEvents" class='blue' v-show="target.ViewType.value == 2"></cc-array-prop>
    --!>
    
  `,

  compiled() {
    console.log(this.target.viewType)
  },
  props: {
    target: {
      twoWay: true,
      type: Object,
    },
  },
});