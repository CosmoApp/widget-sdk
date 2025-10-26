export function setWidgetData(data: any): void {
  if (typeof data === 'object') {
    data = JSON.stringify(data);
  }
  (window as any).webkit.messageHandlers.saveWidgetData.postMessage(data);
}