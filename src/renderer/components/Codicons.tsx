import React from 'react';

interface CodiconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * VS Code "new-file" Codicon:
 * Sheet with folded corner and plus (+) in bottom right
 */
export const NewFileCodicon: React.FC<CodiconProps> = ({ size = 16, style, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    className={className}
    aria-hidden="true"
  >
    <path d="M5 14C4.448 14 4 13.552 4 13V3C4 2.448 4.448 2 5 2H8V4.5C8 5.328 8.672 6 9.5 6H12V6.025C12.344 6.056 12.677 6.121 13 6.213V5.414C13 5.016 12.842 4.635 12.561 4.353L9.647 1.439C9.366 1.158 8.984 1 8.586 1H5C3.895 1 3 1.895 3 3V13C3 14.105 3.895 15 5 15H7.261C7.008 14.693 6.791 14.357 6.607 14H5ZM9 2.207L11.793 5H9.5C9.224 5 9 4.776 9 4.5V2.207ZM11.5 7C9.015 7 7 9.015 7 11.5C7 13.985 9.015 16 11.5 16C13.985 16 16 13.985 16 11.5C16 9.015 13.985 7 11.5 7ZM14 12H12V14C12 14.276 11.776 14.5 11.5 14.5C11.224 14.5 11 14.276 11 14V12H9C8.724 12 8.5 11.776 8.5 11.5C8.5 11.224 8.724 11 9 11H11V9C11 8.724 11.224 8.5 11.5 8.5C11.776 8.5 12 8.724 12 9V11H14C14.276 11 14.5 11.224 14.5 11.5C14.5 11.776 14.276 12 14 12Z" />
  </svg>
);

/**
 * VS Code "new-folder" Codicon:
 * Folder with tab and plus (+) in bottom right
 */
export const NewFolderCodicon: React.FC<CodiconProps> = ({ size = 16, style, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    className={className}
    aria-hidden="true"
  >
    <path d="M2 4.5V6H5.58579C5.71839 6 5.84557 5.94732 5.93934 5.85355L7.29289 4.5L5.93934 3.14645C5.84557 3.05268 5.71839 3 5.58579 3H3.5C2.67157 3 2 3.67157 2 4.5ZM1 4.5C1 3.11929 2.11929 2 3.5 2H5.58579C5.98361 2 6.36514 2.15804 6.64645 2.43934L8.20711 4H12.5C13.8807 4 15 5.11929 15 6.5V7.25716C14.6929 7.00353 14.3578 6.78261 14 6.59971V6.5C14 5.67157 13.3284 5 12.5 5H8.20711L6.64645 6.56066C6.36514 6.84197 5.98361 7 5.58579 7H2V11.5C2 12.3284 2.67157 13 3.5 13H6.20703C6.30564 13.3486 6.43777 13.6832 6.59971 14H3.5C2.11929 14 1 12.8807 1 11.5V4.5ZM16 11.5C16 13.9853 13.9853 16 11.5 16C9.01472 16 7 13.9853 7 11.5C7 9.01472 9.01472 7 11.5 7C13.9853 7 16 9.01472 16 11.5ZM12 9C12 8.72386 11.7761 8.5 11.5 8.5C11.2239 8.5 11 8.72386 11 9V11H9C8.72386 11 8.5 11.2239 8.5 11.5C8.5 11.7761 8.72386 12 9 12H11V14C11 14.2761 11.2239 14.5 11.5 14.5C11.7761 14.5 12 14.2761 12 14V12H14C14.2761 12 14.5 11.7761 14.5 11.5C14.5 11.2239 14.2761 11 14 11H12V9Z" />
  </svg>
);

/**
 * VS Code "refresh" Codicon:
 * Circular arrow clockwise
 */
export const RefreshCodicon: React.FC<CodiconProps> = ({ size = 16, style, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    className={className}
    aria-hidden="true"
  >
    <path d="M3 8C3 5.23858 5.23858 3 8 3C9.63527 3 11.0878 3.78495 12.0005 5H10C9.72386 5 9.5 5.22386 9.5 5.5C9.5 5.77614 9.72386 6 10 6H12.8904C12.8973 6.00014 12.9041 6.00014 12.911 6H13C13.2761 6 13.5 5.77614 13.5 5.5V2.5C13.5 2.22386 13.2761 2 13 2C12.7239 2 12.5 2.22386 12.5 2.5V4.03138C11.4009 2.78613 9.79253 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.1301 14 13.6999 11.6035 13.9756 8.54488C14.0003 8.26985 13.7975 8.0268 13.5225 8.00202C13.2474 7.97723 13.0044 8.1801 12.9796 8.45512C12.75 11.003 10.6079 13 8 13C5.23858 13 3 10.7614 3 8Z" />
  </svg>
);

/**
 * VS Code "collapse-all" Codicon:
 * Layered square boxes with inner fold
 */
export const CollapseAllCodicon: React.FC<CodiconProps> = ({ size = 16, style, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    className={className}
    aria-hidden="true"
  >
    <path d="M14 4.27051C14.5999 4.62053 15 5.26009 15 6V11C15 13.21 13.21 15 11 15H6C5.26009 15 4.62053 14.5999 4.27051 14H11C12.65 14 14 12.65 14 11V4.27051Z" />
    <path d="M9.5 7C9.776 7 10 7.224 10 7.5C10 7.776 9.776 8 9.5 8H5.5C5.224 8 5 7.776 5 7.5C5 7.224 5.224 7 5.5 7H9.5Z" />
    <path fillRule="evenodd" clipRule="evenodd" d="M11 2C12.103 2 13 2.897 13 4V11C13 12.103 12.103 13 11 13H4C2.897 13 2 12.103 2 11V4C2 2.897 2.897 2 4 2H11ZM4 3C3.449 3 3 3.449 3 4V11C3 11.552 3.449 12 4 12H11C11.551 12 12 11.552 12 11V4C12 3.449 11.551 3 11 3H4Z" />
  </svg>
);

/**
 * VS Code "ellipsis" / "more" Codicon:
 * Three horizontal dots (...)
 */
export const EllipsisCodicon: React.FC<CodiconProps> = ({ size = 16, style, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    className={className}
    aria-hidden="true"
  >
    <path d="M5 8C5 8.55229 4.55228 9 4 9C3.44772 9 3 8.55229 3 8C3 7.44772 3.44772 7 4 7C4.55228 7 5 7.44772 5 8ZM9 8C9 8.55229 8.55229 9 8 9C7.44772 9 7 8.55229 7 8C7 7.44772 7.44772 7 8 7C8.55229 7 9 7.44772 9 8ZM12 9C12.5523 9 13 8.55229 13 8C13 7.44772 12.5523 7 12 7C11.4477 7 11 7.44772 11 8C11 8.55229 11.4477 9 12 9Z" />
  </svg>
);

/**
 * Editor / Customize Layout Codicon:
 * Left column divided into two small stacked boxes, right column is a tall box
 */
export const LayoutCustomizeIcon: React.FC<CodiconProps> = ({ size = 16, style, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="2" width="4.5" height="4.8" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
    <rect x="2" y="9.2" width="4.5" height="4.8" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
    <rect x="8.5" y="2" width="5.5" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
  </svg>
);

/**
 * Primary Sidebar Layout Codicon:
 * Outer rounded rectangle with left side filled solid
 */
export const LayoutLeftPanelIcon: React.FC<CodiconProps> = ({ size = 16, style, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
    <rect x="2.5" y="2.5" width="4" height="11" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * Bottom Panel (Terminal) Layout Codicon:
 * Outer rounded rectangle with bottom side filled solid
 */
export const LayoutBottomPanelIcon: React.FC<CodiconProps> = ({ size = 16, style, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
    <rect x="2.5" y="9.5" width="11" height="4" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * Secondary / Right Panel Layout Codicon:
 * Outer rounded rectangle with right side filled solid
 */
export const LayoutRightPanelIcon: React.FC<CodiconProps> = ({ size = 16, style, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
    <rect x="9.5" y="2.5" width="4" height="11" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * Google Chrome Outline Codicon
 */
export const ChromeCodicon: React.FC<CodiconProps> = ({ size = 16, style, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
    <line x1="21.17" y1="8" x2="12" y2="8" />
    <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
    <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
  </svg>
);

/**
 * VS Code / Antigravity "debug-alt" (Run and Debug) Codicon:
 * Play triangle with bug attached at bottom-left
 */
export const DebugAltIcon: React.FC<CodiconProps> = ({ size = 16, style, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    className={className}
    aria-hidden="true"
  >
    <path d="M19.854 13.9605L13.2105 17.697C12.954 17.22 12.5505 16.8345 12.039 16.641L12.054 16.626L19.1175 12.6525C19.6275 12.366 19.6275 11.6325 19.1175 11.3445L7.11751 4.59599C6.61801 4.31399 6.00001 4.67549 6.00001 5.24999V10.5C5.46901 10.5 4.97401 10.6215 4.50001 10.791V5.24999C4.50001 3.52949 6.35251 2.44499 7.85251 3.28949L19.8525 10.0395C21.381 10.899 21.381 13.101 19.8525 13.962L19.854 13.9605ZM10.5 16.0605V18H11.25C11.664 18 12 18.336 12 18.75C12 19.164 11.664 19.5 11.25 19.5H10.5C10.5 20.076 10.3905 20.625 10.1925 21.132L11.781 22.7205C12.0735 23.013 12.0735 23.4885 11.781 23.781C11.634 23.928 11.442 24 11.25 24C11.058 24 10.866 23.9265 10.719 23.781L9.39151 22.4535C8.56651 23.4 7.35151 24.0015 6.00001 24.0015C4.64851 24.0015 3.43351 23.4015 2.60851 22.4535L1.28101 23.781C1.13401 23.928 0.942009 24 0.750009 24C0.558009 24 0.366009 23.9265 0.219009 23.781C-0.0734912 23.4885 -0.0734912 23.013 0.219009 22.7205L1.80751 21.132C1.60951 20.625 1.50001 20.076 1.50001 19.5H0.750009C0.336009 19.5 8.78423e-06 19.164 8.78423e-06 18.75C8.78423e-06 18.336 0.336009 18 0.750009 18H1.50001V16.0605L0.219009 14.7795C-0.0734912 14.487 -0.0734912 14.0115 0.219009 13.719C0.511509 13.4265 0.987009 13.4265 1.27951 13.719L2.56051 15H3.00001C3.00001 13.3455 4.34551 12 6.00001 12C7.65451 12 9.00001 13.3455 9.00001 15H9.43951L10.7205 13.719C11.013 13.4265 11.4885 13.4265 11.781 13.719C12.0735 14.0115 12.0735 14.487 11.781 14.7795L10.5 16.0605ZM4.50001 15H7.50001C7.50001 14.172 6.82801 13.5 6.00001 13.5C5.17201 13.5 4.50001 14.172 4.50001 15ZM9.00001 16.5H3.00001V19.5C3.00001 21.1545 4.34551 22.5 6.00001 22.5C7.65451 22.5 9.00001 21.1545 9.00001 19.5V16.5Z" />
  </svg>
);


