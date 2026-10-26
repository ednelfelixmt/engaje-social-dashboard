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
/** No network, persistence or new authorization; download only after the user's click. */
export function downloadCsv(contents: string, filename: string, port: DownloadPort = browserPort) {
 const url = port.createUrl(new Blob([contents], {type: 'text/csv;charset=utf-8'}));
 let anchor: ReturnType<DownloadPort['createAnchor']> | undefined;
 try {anchor = port.createAnchor(); anchor.href = url; anchor.download = filename; anchor.click();}
 finally {try {anchor?.remove();} finally {try {port.defer(() => port.revokeUrl(url));} catch {port.revokeUrl(url);}}}
}
