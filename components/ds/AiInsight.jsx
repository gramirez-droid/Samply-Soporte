'use client';
import React from 'react';
import { Icon } from './Icon';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Samply AiInsight — the light-blue "chip/robot" callout that surfaces agent insights
   (Coach de Ventas, Analista, OOS). Discrete card, NOT a chat bubble. */
function AiInsight({
  agent = 'Coach de Ventas',
  title,
  children,
  tone = 'default',
  action,
  icon = 'sparkles',
  style,
  ...rest
}) {
  const accent = tone === 'alert' ? 'var(--color-danger)' : 'var(--color-ai)';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      gap: 12,
      padding: 14,
      background: 'var(--color-ai-bg)',
      border: '1px solid #C9E2FB',
      borderRadius: 'var(--radius-md)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 'none',
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-sm)',
      background: 'var(--samply-blue-light)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bot",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 14,
    color: accent
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 'var(--ls-label)',
      textTransform: 'uppercase',
      color: accent
    }
  }, "IA \xB7 ", agent)), title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-primary)',
      marginBottom: 3
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: 'var(--lh-normal)',
      color: 'var(--text-primary)'
    }
  }, children), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, action)));
}

export { AiInsight };
