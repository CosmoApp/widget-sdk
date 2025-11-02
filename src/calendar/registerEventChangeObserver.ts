import { registerObserver } from '../core/observers';

export function registerEventChangeObserver(callback: (data: any) => void): () => void {
  return registerObserver('registerEventChangeObserver', callback);
}