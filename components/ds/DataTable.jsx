'use client';
import React from 'react';
import { Icon } from './Icon';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Samply DataTable — dense table with LIGHT column-header (per real product),
   hairline rows, hover tint, optional row selection. Columns describe cells;
   `render` lets you inject Badges / IconButtons. */
function DataTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  selectable = false,
  onRowClick,
  dense = false,
  style,
  ...rest
}) {
  const cellPad = dense ? '8px 12px' : '12px 14px';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width: '100%',
      overflowX: 'auto',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: 'var(--font-sans)',
      fontSize: dense ? 13 : 14
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'var(--surface-table-head)'
    }
  }, selectable && /*#__PURE__*/React.createElement("th", {
    style: {
      width: 40,
      padding: cellPad
    }
  }), columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      textAlign: c.align || 'left',
      padding: cellPad,
      color: 'var(--text-primary)',
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
      borderBottom: '1px solid var(--color-border)',
      width: c.width
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, c.header, c.sortable && /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 13,
    color: "var(--text-secondary)"
  })))))), /*#__PURE__*/React.createElement("tbody", null, rows.map((row, i) => /*#__PURE__*/React.createElement("tr", {
    key: row[rowKey] ?? i,
    onClick: onRowClick ? () => onRowClick(row) : undefined,
    style: {
      cursor: onRowClick ? 'pointer' : 'default',
      background: 'var(--color-surface)',
      transition: 'background var(--dur-fast)'
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = 'var(--surface-row-hover)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'var(--color-surface)';
    }
  }, selectable && /*#__PURE__*/React.createElement("td", {
    style: {
      padding: cellPad,
      borderBottom: '1px solid var(--color-border)'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    style: {
      accentColor: 'var(--color-primary)',
      width: 16,
      height: 16
    },
    onClick: e => e.stopPropagation()
  })), columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    style: {
      textAlign: c.align || 'left',
      padding: cellPad,
      color: c.muted ? 'var(--text-secondary)' : 'var(--text-primary)',
      fontWeight: c.strong ? 600 : 400,
      borderBottom: '1px solid var(--color-border)',
      whiteSpace: c.wrap ? 'normal' : 'nowrap',
      fontVariantNumeric: c.numeric ? 'tabular-nums' : undefined
    }
  }, c.render ? c.render(row[c.key], row) : row[c.key])))))));
}

export { DataTable };
