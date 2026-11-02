export type DownloadPort = {
 createUrl: (blob: Blob) => string;
 revokeUrl: (url: string) => void;
 createAnchor: () => {href: string; download: string; click: () => void; remove: () => void};
 defer: (cleanup: () => void) => void;
};
const browserPort: DownloadPort = {
 createUrl: blob => URL.createObjectURL(blob), revokeUrl: url => URL.revokeObjectURL(url),
 createAnchor: () => {const anchor = document.createElement('a'); document.body.append(anchor); return anchor;},
 defer: cleanup => {setTimeout(cleanup, 1000);},
};
/** Reject ambiguous or path-like local filenames before allocating a Blob URL. */
function assertCsvFilename(filename: string): void {
 const stem = filename.slice(0, -4);
 if (!/\.csv$/i.test(filename) || !stem || stem === '.' || stem === '..' ||
     filename.length > 255 || filename !== filename.trim() ||
     /[\\/:*?"<>|\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b\u200c\u200e\u200f\u2028-\u202e\u2060-\u206f\ufeff]/.test(filename) ||
     [...filename].some(char => {const code = char.codePointAt(0)!; return code >= 0xd800 && code <= 0xdfff;})) {
  throw new Error('Invalid CSV filename');
 }
}
/** No network, persistence or new authorization; download only after the user's click. */
export function downloadCsv(contents: string, filename: string, port: DownloadPort = browserPort) {
 assertCsvFilename(filename);
 const url = port.createUrl(new Blob([contents], {type: 'text/csv;charset=utf-8'}));
 let anchor: ReturnType<DownloadPort['createAnchor']> | undefined;
 try {anchor = port.createAnchor(); anchor.href = url; anchor.download = filename; anchor.click();}
 finally {try {anchor?.remove();} finally {try {port.defer(() => port.revokeUrl(url));} catch {port.revokeUrl(url);}}}
}
