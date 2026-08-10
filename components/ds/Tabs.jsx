'use client';
import React from 'react';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Samply Tabs — underline tabs, blue active indicator. Controlled or uncontrolled. */
function Tabs({
  tabs = [],
  value,
  defaultValue,
  onChange,
  style,
  ...rest
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? tabs[0]?.id);
  const active = value ?? internal;
  function select(id) {
    if (value == null) setInternal(id);
    onChange && onChange(id);
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      gap: 4,
      borderBottom: '1px solid var(--color-border)',
      ...style
    }
  }, rest), tabs.map(t => {
    const on = t.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      type: "button",
      onClick: () => select(t.id),
      style: {
        position: 'relative',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: '10px 14px',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        fontWeight: on ? 600 : 500,
        color: on ? 'var(--color-primary)' : 'var(--text-secondary)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        transition: 'color var(--dur-fast)'
      }
    }, t.label, t.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        background: on ? 'var(--samply-blue-50)' : '#EEF3F8',
        color: on ? 'var(--color-primary)' : 'var(--text-secondary)',
        borderRadius: 'var(--radius-pill)',
        padding: '1px 7px'
      }
    }, t.count), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: 8,
        right: 8,
        bottom: -1,
        height: 2.5,
        borderRadius: 3,
        background: on ? 'var(--color-primary)' : 'transparent',
        transition: 'background var(--dur-fast)'
      }
    }));
  }));
}

export { Tabs };
