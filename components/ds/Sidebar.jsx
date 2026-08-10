'use client';
import React from 'react';
import { Icon } from './Icon';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Samply Sidebar — narrow navy rail with the equalizer mark, icon nav, and a
   round blue expand toggle. Collapsed (icon-only) by default like the real product;
   expands to show labels. Pure-presentational; pass items + active. */
function Sidebar({
  items = [],
  active,
  onSelect,
  expanded = false,
  onToggleExpand,
  logoSrc,
  footer,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      position: 'relative',
      width: expanded ? 'var(--sidebar-width)' : 'var(--sidebar-width-collapsed)',
      flex: 'none',
      height: '100%',
      background: 'var(--surface-sidebar)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width var(--dur-slow) var(--ease-out)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 'var(--topbar-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: expanded ? 'flex-start' : 'center',
      padding: expanded ? '0 18px' : 0,
      gap: 10
    }
  }, logoSrc ? /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "Samply",
    style: {
      height: 28,
      width: 'auto',
      display: 'block'
    }
  }) : /*#__PURE__*/React.createElement(Icon, {
    name: "bar-chart",
    size: 24,
    color: "var(--samply-blue-light)"
  })), onToggleExpand && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onToggleExpand,
    "aria-label": expanded ? 'Colapsar' : 'Expandir',
    style: {
      position: 'absolute',
      top: 'calc(var(--topbar-height) - 14px)',
      right: -12,
      width: 24,
      height: 24,
      borderRadius: '50%',
      border: '2px solid var(--color-bg)',
      background: 'var(--color-primary)',
      color: '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: expanded ? 'chevron-left' : 'chevron-right',
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: '8px',
      overflowY: 'auto',
      flex: 1
    }
  }, items.map(it => {
    const isActive = it.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      type: "button",
      onClick: () => onSelect && onSelect(it.id),
      title: it.label,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 42,
        padding: expanded ? '0 12px' : 0,
        justifyContent: expanded ? 'flex-start' : 'center',
        border: 'none',
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
        background: isActive ? 'var(--samply-navy-600)' : 'transparent',
        color: isActive ? '#fff' : 'rgba(255,255,255,0.66)',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        fontWeight: isActive ? 600 : 500,
        position: 'relative',
        transition: 'background var(--dur-fast)',
        whiteSpace: 'nowrap',
        overflow: 'hidden'
      },
      onMouseEnter: e => {
        if (!isActive) e.currentTarget.style.background = 'var(--samply-navy-700)';
      },
      onMouseLeave: e => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }
    }, isActive && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: 0,
        top: 8,
        bottom: 8,
        width: 3,
        borderRadius: 3,
        background: 'var(--samply-blue-light)'
      }
    }), /*#__PURE__*/React.createElement(Icon, {
      name: it.icon,
      size: 20,
      color: isActive ? 'var(--samply-blue-light)' : 'currentColor'
    }), expanded && /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        textAlign: 'left'
      }
    }, it.label), expanded && it.badge != null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        background: 'var(--samply-blue-light)',
        color: 'var(--samply-navy)',
        borderRadius: 'var(--radius-pill)',
        padding: '1px 7px'
      }
    }, it.badge));
  })), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      borderTop: '1px solid rgba(255,255,255,0.08)'
    }
  }, footer));
}

export { Sidebar };
