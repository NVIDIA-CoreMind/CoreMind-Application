import { CoreMindAPI } from '../../preload/preload';

declare global {
  interface Window {
    coreMindAPI: CoreMindAPI;
  }
}
