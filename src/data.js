export const setWidgetData = (data) => {
  if (typeof data === 'object') {
    data = JSON.stringify(data);
  }
  window?.webkit?.messageHandlers?.saveWidgetData?.postMessage(data);
};
