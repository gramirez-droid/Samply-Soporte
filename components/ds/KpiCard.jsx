'use client';
import React from 'react';
import { Icon } from './Icon';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Samply KpiCard — big blue number, small muted uppercase label, optional signed delta.
   The core metric tile for dashboards / Torre de Control. */
function KpiCard({
  value,
  label,
  delta,
  deltaDir,
  icon,
  accent = 'var(--samply-blue)',
  style,
  ...rest
}) {
  const up = deltaDir === 'up';
  const down = deltaDir === 'down';
  const deltaColor = up ? 'var(--samply-green)' : down ? 'var(--samply-red)' : 'var(--text-secondary)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--color-surface)',
      border: 'var(--border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-kpi)',
      fontWeight: 700,
      color: accent,
      lineHeight: 1,
      fontVariantNumeric: 'tabular-nums'
    }
  }, value), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--samply-blue-light)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 'var(--ls-label)',
      textTransform: 'uppercase',
      color: 'var(--text-secondary)',
      marginTop: 4
    }
  }, label), delta != null && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      fontWeight: 600,
      color: deltaColor,
      marginTop: 2
    }
  }, (up || down) && /*#__PURE__*/React.createElement(Icon, {
    name: up ? 'trending-up' : 'trending-down',
    size: 14
  }), delta));
}

export { KpiCard };
