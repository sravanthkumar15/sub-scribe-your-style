
// Type definitions for Chrome extension API
declare namespace chrome {
  export namespace storage {
    export interface StorageArea {
      get(keys: string | string[] | object | null, callback: (items: object) => void): void;
      set(items: object, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
      clear(callback?: () => void): void;
    }
    
    export var sync: StorageArea;
    export var local: StorageArea;
  }
  
  export namespace tabs {
    export interface Tab {
      id?: number;
      url?: string;
      title?: string;
      active: boolean;
      windowId: number;
    }
    
    export function query(queryInfo: { active: boolean; currentWindow: boolean }, 
                        callback: (result: Tab[]) => void): void;
    export function sendMessage(tabId: number, message: any, 
                        callback?: (response: any) => void): void;
  }
  
  export namespace runtime {
    export function sendMessage(message: any, callback?: (response: any) => void): void;
    export function onMessage: {
      addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void;
      removeListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void;
    };
  }
}
